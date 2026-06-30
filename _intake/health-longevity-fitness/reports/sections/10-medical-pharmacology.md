# 10 — Medical & Pharmacology

> **Manual section, v1.0 — 2026-06-28.** Companion graded claims in `02-domains/S-pharma-claims.json`.
> This is the section about **real drugs and medical interventions** — the things a physician can actually
> prescribe, with regulatory approval and hard-outcome trials behind most of them. It is deliberately separate
> from the supplement section (`03-nutrition-supplements.md`) because the evidence base is a different universe:
> supplements mostly trade in mechanism and surrogate markers; the drugs below mostly have **randomized,
> placebo-controlled, hard-endpoint** trials in tens of thousands of people. That does not make them safe *for
> you*, and it does not make them longevity drugs — but it does mean the honesty rules cut differently here.

> ## ⚠️ This is not medical advice — and it can't be
>
> Everything below is an **index of the evidence**, not a recommendation. Every drug here has real risks,
> real contraindications, and real interactions that depend on **your** kidneys, liver, heart, other
> medications, and history. A statin that is clearly net-beneficial for a 62-year-old who already had a heart
> attack may be the wrong call for a healthy 45-year-old, and aspirin — covered below — is a clean example of a
> drug that *helps* one group and *harms* another that looks superficially similar. **Prescription decisions
> belong to you and a licensed clinician who knows your chart.** Several items in this section (rapamycin,
> off-label metformin, gray-market peptides, "anti-aging" TRT) are being sold online and through cash clinics
> on evidence that ranges from thin to absent — those are flagged explicitly so you can ask the right
> skeptical questions, not so you can self-prescribe.

## How the three honesty rules cut for drugs

The rules (defined in "Start Here") bite in a specific way here. **Predictor ≠ lever:** moving a number — LDL,
HbA1c, testosterone, NAD⁺ — is not moving an outcome; for several drugs below that lever question has a
hard-endpoint RCT answer, and for rapamycin, off-label metformin-for-aging, and peptides it explicitly does
**not**, no matter how good the number looks. **Cohort ≠ RCT:** "metformin users seem to outlive non-diabetics"
(Bannister 2014, confounded — Domain B) is far weaker than a randomized event reduction; the drugs that have
*graduated* from cohort to RCT — GLP-1s, statins, SGLT2 inhibitors, the SPRINT BP target — are the strongest
material in this manual. **Net benefit is the only unit:** every drug carries a harm column, so
**number-needed-to-treat (NNT)** and **-to-harm (NNH)** run throughout, and aspirin gets its own section as the
cautionary tale.

**Cross-references (read alongside):** geroprotector mechanisms (metformin/rapamycin/senolytics) are graded in
`02-domains/B-aging-mechanisms.md`; the **apoB/LDL causal story** that justifies lipid-lowering is in
`02-domains/L-biomarkers.md`; **menopausal HRT** is owned by `02-domains/N-womens-longevity.md`; the
**blood-pressure target (SPRINT)** is shared with the clinical-prevention material; the **shingles→dementia**
signal cross-links to the brain/cognition material.

---

## 1. GLP-1 receptor agonists — the biggest medical story of the decade

If you read only one part of this section, read this one. The GLP-1 (and GLP-1/GIP) receptor agonists —
**semaglutide** (Ozempic/Wegovy) and **tirzepatide** (Mounjaro/Zepbound) — are the first drugs in history to
produce **surgical-magnitude weight loss from an injection** *and* then go on to prove **hard cardiovascular,
kidney, and other end-organ benefits in randomized trials.** They are reorganizing preventive medicine in real
time. They are also overhyped, over-prescribed off-label, and carry a genuine caveat (muscle loss) that the
marketing buries.

### 1.1 What they are and what they do

GLP-1 is an incretin hormone the gut releases after eating; it amplifies glucose-dependent insulin secretion,
suppresses glucagon, **slows gastric emptying**, and acts in the hypothalamus to **reduce appetite**. The drugs
are long-acting agonists that pin this signaling on for a week per injection. Tirzepatide adds **GIP** agonism (a
second incretin), which appears to make it more potent. The headline effect — large, sustained weight loss —
is mostly an **appetite/satiety** effect: people simply eat less and feel full faster.

### 1.2 The trials, by what they actually proved

| Drug / trial | Population | What it proved | Magnitude | Tier |
|---|---|---|---|---|
| **Semaglutide 2.4 mg — STEP 1** (Wilding 2021, `10.1056/NEJMoa2032183`) | 1,961 adults, obesity, **no diabetes** | Weight loss | **−14.9%** body weight vs −2.4% placebo @ 68 wk | `rct` (surrogate: weight) |
| **Semaglutide 2.4 mg — SELECT** (Lincoff 2023, `10.1056/NEJMoa2307563`) | 17,604 adults, overweight/obese, **established CVD, no diabetes** | **Cardiovascular events** | **−20% MACE** (HR 0.80) — CV death/MI/stroke | `rct` (hard outcome) |
| **Semaglutide 1.0 mg — FLOW** (Perkovic 2024, `10.1056/NEJMoa2403347`) | 3,533, type 2 diabetes + **chronic kidney disease** | **Kidney + CV + mortality** | **−24%** major kidney events (HR 0.76); stopped early for benefit | `rct` (hard outcome) |
| **Tirzepatide — SURMOUNT-1** (Jastreboff 2022, `10.1056/NEJMoa2206038`) | 2,539 adults, obesity, **no diabetes** | Weight loss | **−20.9%** at 15 mg vs −3.1% placebo @ 72 wk | `rct` (surrogate: weight) |
| **Tirzepatide — SURMOUNT-OSA** (2024, `10.1056/NEJMoa2404881`) | obesity + obstructive sleep apnea | Reduced apnea-hypopnea index | large AHI reduction | `rct` (surrogate/condition) |

**This is the key move:** STEP and SURMOUNT proved the *surrogate* (weight), and that alone would have been a
mechanism-tier story. But **SELECT crossed into hard-outcome territory** — a 20% reduction in heart attacks,
strokes, and CV death **in people without diabetes**, driven by a drug given for obesity. That is the result
that turned GLP-1s from "weight-loss drugs" into "cardiometabolic-organ-protection drugs." FLOW did the same for
the kidney. The benefits appear to be **partly independent of the weight loss itself** (the event curves
separate earlier than weight fully explains), implicating direct anti-inflammatory/vascular effects — though
that mechanism is still `mechanistic`, not settled.

@@FIG:35-glp1-outcomes,Y02-glp1-outcomes@@

### 1.3 The longevity / healthspan implication (graded honestly)

Obesity and its metabolic sequelae are among the largest modifiable drivers of cardiovascular disease, type 2
diabetes, several cancers, sleep apnea, osteoarthritis, and fatty liver. A drug that durably reverses ~15–21% of
body weight **and** independently cuts cardiovascular events is, functionally, one of the most powerful
*healthspan* interventions ever brought to market — far stronger evidence than any supplement in this manual.
**But the honest framing:** there is **no lifespan trial.** "Reduces cardiovascular events in high-risk people"
(proven) is not "extends lifespan in the general population" (untested). And these are drugs for a **disease
state** (obesity/diabetes/CVD), not validated tools for an already-lean person chasing a longevity number. The
trials enrolled sick people and showed they got less sick. That is the claim — a large one — and not more.

### 1.4 Side effects and the muscle-loss caveat the ads skip

- **GI effects (common, dose-limiting):** nausea, vomiting, diarrhea, constipation — worst during dose
  escalation, usually improving. The main reason people stop.
- **Serious but rare:** pancreatitis, gallbladder disease (cholelithiasis — partly a rapid-weight-loss effect),
  and **gastroparesis/severe delayed gastric emptying** (relevant for anesthesia — tell your surgeon). Rodent
  C-cell tumors → **contraindicated in personal/family history of medullary thyroid carcinoma or MEN2.**
- **The muscle-loss caveat (the real longevity catch):** roughly **25–40% of the weight lost on GLP-1s is lean
  mass**, not fat — typical of any large rapid weight loss, but it matters enormously for longevity because
  **muscle mass and strength are themselves protective against mortality and frailty** (see Domain E and the
  grip-strength/VO₂max data). Losing 20% of your body weight while losing a chunk of muscle can be a *net*
  metabolic win and still erode the reserve that protects you at 80. **Mitigation that should be standard, not
  optional: resistance training + adequate protein (≥1.2–1.6 g/kg) throughout treatment**, and attention to
  refeeding/regain after stopping (weight returns when the drug stops unless behavior changes). This is where the
  drug section and the training/nutrition sections must be read together.
- **Who they're for (honest):** people with obesity (BMI ≥30, or ≥27 with a weight-related condition), type 2
  diabetes, established cardiovascular disease + excess weight, or CKD + diabetes — i.e. the trial populations.
  Cosmetic/vanity use in lean people is off-label, under-studied for that group, and inverts the risk/benefit.

---

## 2. Lipid-lowering — the most rigorously proven prevention there is

The drugs that lower **apoB-containing lipoproteins** (LDL and friends) sit on the single strongest causal chain
in preventive cardiology: genetics + epidemiology + RCTs all triangulate that **LDL/apoB is causal for
atherosclerosis, and the effect is cumulative over a lifetime** (Ference 2017; see `L-biomarkers.md` →
`ldl-apob-causal-ascvd`, `apob-superior-to-ldlc`). Lower, earlier, and longer is better — *for people whose risk
justifies it.* The honest tension is entirely about **who**, not whether.

### 2.1 The drugs

| Drug class | Mechanism | LDL lowering | Hard-outcome evidence | Tier |
|---|---|---|---|---|
| **Statins** | HMG-CoA reductase inhibition → ↑LDL-receptor clearance | ~30–50% | **CTT meta:** ~**22% RRR** in major vascular events **per 1 mmol/L (~39 mg/dL)** LDL drop, per year of treatment | `meta` (hard outcome) |
| **Ezetimibe** | Blocks intestinal cholesterol absorption (NPC1L1) | ~15–20% (additive) | **IMPROVE-IT** (Cannon 2015, `10.1056/NEJMoa1410489`): added to statin post-ACS, small further event reduction — proved **non-statin LDL-lowering also works** | `rct` (hard outcome) |
| **PCSK9 inhibitors** (evolocumab, alirocumab) | mAb ↑ LDL-receptor recycling | ~50–60% (on top of statin) | **FOURIER** (Sabatine 2017, `10.1056/NEJMoa1615664`): LDL ~30 mg/dL, **15% RRR MACE** | `rct` (hard outcome) |

The clean message across all three: **the benefit tracks the absolute LDL/apoB reduction, by whatever
mechanism.** That is about as close to a proven causal lever as preventive medicine offers.

### 2.2 The NNT honesty — and why primary ≠ secondary prevention

This is where the section earns its keep. Statins work, but **how much they help depends entirely on your
baseline risk** — and the same pill produces wildly different number-needed-to-treat.

- **Secondary prevention** (you already have CVD — prior MI, stroke, stent): high baseline risk → large absolute
  benefit. NNT to prevent one major event over ~5 years is roughly in the **single-to-low-double digits**.
  Here the case is strong and largely uncontroversial.
- **Primary prevention** (no established disease, treating risk factors): much smaller absolute benefit because
  the baseline risk is lower. Over ~5 years, NNT to prevent one major cardiovascular event runs from **~tens to
  ~hundreds**, depending on starting risk; NNT to prevent one **death** is larger still and, in the lowest-risk
  groups, may not be demonstrable. Statins remain reasonable for many primary-prevention patients (the
  relative-risk reduction is real), but the **honest framing is shared decision-making against a modest absolute
  benefit**, not "everyone over 50 should be on one."

@@FIG:36-statin-nnt,G04-statin-prevention@@

### 2.3 Real side effects vs the nocebo effect

Statins have a reputation for muscle side effects that the **blinded** evidence does not support at anything like
the claimed rate:

- **The nocebo finding (`rct`):** the **SAMSON** n-of-1 trial (Wood 2020, *NEJM*, `10.1056/NEJMc2031173`) had
  patients who'd quit statins for side effects cycle through statin, placebo, and empty months. **~90% of the
  symptom burden occurred on placebo months too** — i.e. most "statin intolerance" is nocebo, not the drug.
  Large blinded RCTs find muscle-symptom rates barely above placebo.
- **Real but rare:** genuine statin myopathy exists; serious **rhabdomyolysis is very rare** (~1–3 per 100,000
  patient-years). Statins cause a **small increase in new-onset type 2 diabetes** (real, modest, outweighed by CV
  benefit in those who need the drug) and rare transaminase elevations.
- **The practical upshot:** symptoms are worth taking seriously and re-challenging/switching for — but the
  population-level fear of statins is largely nocebo, and the apoB causal chain underneath them is one of the
  best-established in medicine.

---

## 3. Antihypertensives — brief, because the target is the story

Blood-pressure lowering is one of the most outcome-proven interventions in medicine; the open question for years
was **how low.** **SPRINT** (2015, `10.1056/NEJMoa1511939`) randomized higher-risk non-diabetic adults to an
intensive target (**SBP <120**) vs standard (**<140**) and found the intensive arm cut major cardiovascular
events by ~25% and **all-cause mortality by ~27%** — at the cost of more hypotension, syncope, electrolyte
disturbance, and acute kidney injury. (Target nuance, measurement technique, and the frailty caveats are owned
by the clinical-prevention material — cross-reference there.)

The major drug classes, all with outcome evidence, generally chosen by patient profile rather than by a single
"best" agent:

| Class | Examples | Notes |
|---|---|---|
| **ACE inhibitors / ARBs** | lisinopril, ramipril / losartan, valsartan | First-line; renal/cardiac protection; ARBs avoid ACE cough |
| **Calcium-channel blockers** | amlodipine | First-line; effective, often combined |
| **Thiazide(-like) diuretics** | chlorthalidone, indapamide | First-line; strong outcome data (ALLHAT) |
| **Beta-blockers** | metoprolol, bisoprolol | Not first-line for uncomplicated HTN; used for specific cardiac indications |

The honest one-liner: **treating high blood pressure to a sensible target is among the highest-value medical acts
there is** — and the SPRINT-era answer is "lower than we used to, in the right patients, with monitoring."

---

## 4. Aspirin — the clean "stop doing this" finding

For decades a daily baby aspirin was reflexive primary prevention. The **ASPREE** trial dismantled that for
healthy older adults — and it is one of the most useful *negative* results in this whole manual, because
**subtracting** a low-value intervention is as much a longevity move as adding a good one.

@@FIG:Q01-aspree@@

- **ASPREE** (McNeil et al., 2018, three *NEJM* papers): **19,114 community-dwelling adults ≥70** (≥65 for US
  minorities) with **no** established cardiovascular disease, randomized to **100 mg aspirin/day vs placebo**.
  - **Disability-free survival:** no benefit (`10.1056/NEJMoa1800722`).
  - **Cardiovascular events:** no significant reduction; **major hemorrhage significantly increased**
    (`10.1056/NEJMoa1805819`).
  - **All-cause mortality:** **slightly higher** on aspirin (`10.1056/NEJMoa1803955`), an unexpected signal
    driven largely by cancer deaths.
- **The verdict:** in healthy older adults without established cardiovascular disease, **routine aspirin does
  more harm (bleeding) than good** — guidelines (USPSTF, ACC/AHA) were revised accordingly. **This does NOT
  apply to secondary prevention:** people who have *already* had a heart attack or stroke generally *should*
  remain on aspirin — there the bleeding risk is outweighed. The lesson is the predictor-vs-lever and
  net-benefit rules in action: an intervention that "makes sense mechanistically" (less clotting) can be net
  harmful once you measure the whole ledger in the right population. **If you're a healthy older adult taking
  daily aspirin "to be safe," that is exactly the conversation to have with your clinician.**

---

## 5. Vaccines as longevity medicine — the underrated intervention

Vaccination is rarely filed under "longevity," but for older adults it is one of the highest-leverage,
best-evidence, lowest-cost interventions available — and a few vaccines now carry **signals beyond their target
infection** that make them genuinely interesting for healthspan. The honest line: the **infection-prevention**
benefits are `rct`/strong; some of the **downstream** benefits (dementia, cardiovascular) are
`cohort`/quasi-experimental and still firming up.

| Vaccine | Target | Beyond-target signal | Tier on the bonus signal |
|---|---|---|---|
| **Shingrix (recombinant zoster)** | Shingles + post-herpetic neuralgia | **Lower dementia incidence** | `cohort` + quasi-experimental (strengthening) |
| **Influenza (annual)** | Flu + its complications | **Reduced cardiovascular events** post-MI | `rct` (IAMI) |
| **Pneumococcal (PCV20 / PPSV23)** | Pneumonia, invasive pneumococcal disease | Prevents a leading cause of older-adult death/hospitalization | `rct`/strong (target) |
| **RSV (Arexvy, Abrysvo, mRESVIA)** | RSV lower-respiratory disease | New for ≥60/≥75; prevents serious respiratory illness | `rct` (target) |

@@FIG:47-vaccines-longevity@@

- **Shingles → dementia (the exciting one).** Reactivated varicella-zoster causes neuro-inflammation, and a
  string of studies now links **zoster vaccination to lower dementia risk.** **Taquet 2024** (*Nat Med*,
  `10.1038/s41591-024-03201-5`) found the **recombinant** Shingrix associated with lower dementia incidence than
  the old live vaccine. The strongest design is the **Welsh natural experiment** (Eyting/Geldsetzer et al.,
  *Nature* 2025, `10.1038/s41586-025-08800-x`): a sharp **eligibility-date cutoff** for the older Zostavax
  created two near-identical populations differing only by vaccine access, and the vaccinated group had a
  **~20% relative reduction in new dementia diagnoses** over 7 years — a quasi-experimental design much closer to
  causal than ordinary cohort data. Still not a randomized trial, and confounding can't be fully excluded, but
  this is one of the more credible "vaccine as brain-longevity medicine" signals. (Cross-ref the brain/cognition
  material.)
- **Influenza → cardiovascular events.** Flu is a known trigger of heart attacks. **IAMI** (Fröbert 2021,
  *Circulation*, `10.1161/CIRCULATIONAHA.121.057042`) randomized post-MI patients to flu vaccine vs placebo and
  found **fewer cardiovascular deaths and events** — a genuine RCT showing the annual flu shot is partly a
  cardiovascular drug in at-risk people.
- **Pneumococcal & RSV:** less glamorous, no "bonus" mystique, but they prevent two of the infections most
  likely to kill or hospitalize an older adult. Preventing the pneumonia that ends an 82-year-old's independence
  *is* longevity medicine. RSV vaccines (approved ≥60, now emphasized ≥75) are the newest addition.

**The honest framing:** the target-disease prevention is rock-solid `rct`-grade and should be the baseline. The
dementia/CV "bonus" effects are real-but-not-yet-randomized signals that **add** to an already-good case rather
than carrying it. Either way, age-appropriate vaccination is closer to a free lunch than almost anything in this
manual.

---

## 6. The geroprotector drugs — honest status

These are the drugs the longevity community actually argues about: repurposed/off-label agents with strong
*aging-biology* rationale and, in most cases, **no completed human trial proving they slow human aging.** Grade
them as experimental for that purpose. (Mechanisms and the mouse data are detailed in
`B-aging-mechanisms.md`; this is the prescribing-reality view.)

| Drug | Approved use | Geroprotector status | Honest tier for *aging* |
|---|---|---|---|
| **Metformin** | Type 2 diabetes | TAME trial **designed but not run/funded**; cohort signal is **confounded** | `cohort` (confounded) + `protocol` (TAME) — **no RCT outcome** |
| **Rapamycin / rapalogs** | Immunosuppression, some cancers | Best mouse-lifespan drug there is; human anti-aging **dose & schedule unknown** | `animal` (lifespan) + `rct` (surrogate: vaccine response) — **off-label, experimental** |
| **SGLT2 inhibitors** (empagliflozin, dapagliflozin) | Diabetes, **heart failure, CKD** | Strong **hard-outcome** CV/renal benefit; emerging geroprotector candidate | `rct` (hard outcome, in disease) — **aging claim still `mechanistic`** |
| **Acarbose** | Type 2 diabetes (post-meal glucose) | Extends mouse lifespan (ITP), **especially males** | `animal` (lifespan) — **no human aging trial** |

@@FIG:64-geroprotector-matrix@@

- **Metformin.** The famous Bannister 2014 cohort (diabetics on metformin appearing to outlive non-diabetics) is
  **observational and confounded** (immortal-time/prevalent-user bias — see Domain B). **TAME** (Barzilai) is a
  *trial design* meant to make "aging" an FDA-approvable endpoint — **a protocol, not a result; it has not been
  run.** Real caveat for the fit: metformin may **blunt the gains from exercise** (Konopka 2019 and related work
  show attenuated mitochondrial/aerobic adaptation). For a healthy, athletic person, that trade-off is the wrong
  way round. **Off-label "metformin for longevity" rests on no human outcome trial.**
- **Rapamycin.** The strongest single *mouse* lifespan drug (mTOR inhibition, Harrison 2009). In humans, the
  best data are **surrogate**: a rapalog improved elderly flu-vaccine response (Mannick 2014, `rct`). The
  community uses **intermittent low-dose** off-label, but the **optimal dose, schedule, and long-term safety for
  healthspan are genuinely unknown**, and immunosuppression/metabolic side effects are real. Notably, the most
  documented N-of-1 longevity experimenter (Bryan Johnson) **discontinued** rapamycin in ~2024 reporting no net
  benefit and side effects (see `J-claims.json` → `bj-rapamycin-discontinued`). Mark it **experimental.**
- **SGLT2 inhibitors** are the most interesting "real" entry here: unlike metformin-for-aging, they have
  **genuine hard-outcome RCTs** — but for **heart failure and kidney disease** (EMPA-REG, DAPA-HF, DAPA-CKD,
  EMPA-KIDNEY), not for aging per se. They reduce CV death and renal decline even in many non-diabetics. The
  *geroprotector* hypothesis (ketone/metabolic-stress signaling, mild caloric-loss mimicry) is plausible and
  `mechanistic`; the disease benefits are proven. Watch the space.
- **Acarbose** blunts post-meal glucose and extends mouse lifespan in the rigorous ITP (sex-skewed toward
  males). No human aging trial; GI side effects (flatulence) limit enthusiasm.

**Bottom line:** of the "geroprotectors," only SGLT2 inhibitors have hard human outcomes — and those are for
**disease**, not aging. Metformin-for-aging and rapamycin-for-aging are **experimental/off-label hypotheses**,
honestly labeled as such, no matter how often they're sold otherwise.

---

## 7. Hormones — and the unregulated peptides

Hormone therapy is where evidence-based medicine and the "anti-aging" cash-clinic world collide hardest. The
rule that organizes it: **replacing a hormone to treat a diagnosed deficiency is medicine; pushing hormones
above normal in a healthy person to chase youth is experimentation** — often sold as the former.

### 7.1 Testosterone replacement (TRT)

- **The honest indication:** **symptomatic hypogonadism** — low testosterone *confirmed on testing* **plus**
  symptoms (low libido, fatigue, loss of muscle/bone, erectile dysfunction). For these men, replacement to a
  normal range improves symptoms, sexual function, body composition, and bone density. That is a legitimate,
  evidence-based treatment.
- **The CV safety question — answered (mostly).** Years of worry about TRT and heart attacks were settled by
  **TRAVERSE** (Lincoff 2023, *NEJM*, `10.1056/NEJMoa2215025`): ~5,200 middle-aged/older hypogonadal men **with
  high CV risk**, randomized to testosterone gel vs placebo. TRT was **non-inferior** for major adverse
  cardiovascular events — i.e. **it did not raise CV risk** at replacement doses. (It did show small increases in
  atrial fibrillation, pulmonary embolism, and acute kidney injury — not nothing, but it cleared the central
  safety bar.)
- **The honest caveat:** TRT treats hypogonadism; it is **not a validated longevity drug for men with
  normal-range testosterone**, and much "low-T" marketing medicalizes the **normal age-related decline** that is
  often better addressed by **sleep, weight loss, resistance training, and treating underlying disease** (all of
  which raise testosterone and have their own benefits). **Supraphysiologic** dosing (the gym/aesthetic use) is a
  different drug with a different, worse risk profile (polycythemia, fertility suppression, cardiac strain).
  Lifestyle first; replacement for genuine, confirmed, symptomatic deficiency; skepticism toward "optimize your
  T to elite levels."

### 7.2 Menopausal hormone therapy (HRT) — see Domain N

Owned by `N-womens-longevity.md` (`conflict-hrt-timing`). The one-paragraph honest summary: the WHI scare
(Rossouw 2002) was **over-generalized** from a population a decade past menopause; the **timing/"window"
hypothesis** (ELITE, Hodis 2016; KEEPS) supports that HRT **started at menopause for symptoms** is reasonable and
probably net-beneficial for many women, while HRT **started late purely as a longevity/CVD prevention play** is
not supported. Read the N section before acting.

### 7.3 Thyroid

- **Overt hypothyroidism** (high TSH, low free T4, symptoms): levothyroxine replacement is clear, beneficial,
  standard. **Subclinical hypothyroidism** (mildly high TSH, normal T4) is the contested zone — and the **TRUST**
  trial (Stott 2017, *NEJM*, `10.1056/NEJMoa1603825`) found **no symptom or quality-of-life benefit** from
  levothyroxine in older adults with subclinical hypothyroidism. The honest practice: treat overt disease; resist
  reflexively medicating a borderline TSH or chasing "optimal thyroid" in someone who feels well. Thyroid hormone
  is **not** a weight-loss or energy drug for the euthyroid.

### 7.4 The unregulated peptides — say it plainly

**BPC-157, TB-500 (thymosin β4 fragment), and ipamorelin** (and the broader gray-market peptide world) are sold
heavily online and by wellness clinics for "healing," "recovery," "anti-aging," and growth-hormone-axis
stimulation. The honest status:

- **BPC-157 / TB-500:** essentially **no controlled human efficacy or safety data.** The enthusiasm rests on
  **rodent** tendon/gut-healing studies. Not FDA-approved; not pharmaceutical-grade; the **FDA placed BPC-157
  into a category effectively barring compounding** over safety/characterization concerns. Source purity is
  unknown; injecting unregulated research chemicals carries real risk.
- **Ipamorelin / GHRPs / sermorelin:** growth-hormone secretagogues. Even if they raise GH/IGF-1 (a *surrogate*),
  **raising the GH/IGF-1 axis is a longevity red flag, not a green one** — the most robust human and animal
  longevity genetics point the **opposite** way (low IGF-1 signaling, Laron syndrome, *daf-2*; see Domains B/C).
  "Boost your growth hormone to stay young" runs directly against the best aging biology we have.
- **The rule:** these are **mechanism-and-anecdote** at best, **`animal`/`anecdotal`** tier, with **no human
  outcome data and no regulatory safety assurance.** Indexed here so the claim can be graded — **not endorsed.**
  If a clinic is selling injectable peptides as anti-aging, that is the signal to be maximally skeptical.

---

## 8. The honest synthesis

Rank the medical interventions in this section by **strength of human hard-outcome evidence**, and the order is
almost the inverse of how loudly each is marketed in longevity circles:

1. **Proven hard-outcome, large benefit (in the right patients):** lipid-lowering (statins → apoB), blood-pressure
   control to a sensible target, GLP-1 receptor agonists for obesity/CVD/CKD, SGLT2 inhibitors for HF/CKD,
   age-appropriate vaccination, secondary-prevention aspirin.
2. **Proven *negative* — a "stop":** routine primary-prevention aspirin in healthy older adults (ASPREE).
3. **Legitimate for a defined deficiency, not a longevity drug:** TRT for symptomatic hypogonadism, HRT at
   menopause for symptoms (timing matters), levothyroxine for overt hypothyroidism.
4. **Experimental / off-label for aging — honest "we don't know":** rapamycin, metformin-for-longevity,
   acarbose.
5. **No human evidence — be skeptical:** BPC-157, TB-500, ipamorelin and the gray-market peptide world; and the
   GH/IGF-1-raising approach that contradicts the best longevity genetics.

The meta-lesson is the one that runs through the whole manual: the interventions with the **best evidence are
prescription drugs for disease states**, evaluated by net benefit in real trials — not the things with the best
*stories*. And every one of them is a **conversation with a clinician**, weighed against your specific chart,
not a purchase decision.

---

### Go deeper

- **Lincoff AM, et al. (SELECT). "Semaglutide and Cardiovascular Outcomes in Obesity without Diabetes."** *N Engl
  J Med* 2023. `10.1056/NEJMoa2307563` — the trial that made GLP-1s organ-protection drugs, not just weight-loss
  drugs.
- **McNeil JJ, et al. (ASPREE).** *N Engl J Med* 2018 — three papers: disability-free survival
  (`10.1056/NEJMoa1800722`), CV events & bleeding (`10.1056/NEJMoa1805819`), all-cause mortality
  (`10.1056/NEJMoa1803955`). The clean "stop primary-prevention aspirin in healthy elders" result.
- **Cholesterol Treatment Trialists' (CTT) Collaboration** meta-analyses (e.g. *Lancet* 2010,
  `10.1016/S0140-6736(10)61350-5`) — the ~22%-per-mmol/L LDL→event dose-response that underwrites all
  lipid-lowering; pair with **Ference 2017** EAS consensus (in `L-biomarkers.md`) for the causal apoB story.
- **Wood FA, et al. (SAMSON).** *N Engl J Med* 2020. `10.1056/NEJMc2031173` — the n-of-1 trial showing ~90% of
  "statin side effects" occur on placebo too (the nocebo finding).
- **Lincoff AM, et al. (TRAVERSE).** *N Engl J Med* 2023. `10.1056/NEJMoa2215025` — testosterone replacement
  cleared the cardiovascular-safety bar in high-risk hypogonadal men.
- **Eyting M, Geldsetzer P, et al.** "A natural experiment on the effect of herpes zoster vaccination on
  dementia." *Nature* 2025. `10.1038/s41586-025-08800-x` — the quasi-experimental shingles→dementia result;
  pair with **Taquet 2024** (*Nat Med*, `10.1038/s41591-024-03201-5`).
- **The SPRINT Research Group.** *N Engl J Med* 2015. `10.1056/NEJMoa1511939` — the intensive-blood-pressure-target
  trial (cross-ref clinical-prevention material).
