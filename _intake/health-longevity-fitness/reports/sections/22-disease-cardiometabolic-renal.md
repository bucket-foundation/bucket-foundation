# 22 — Disease Atlas I: Cardiometabolic, Endocrine & Renal Disease

> **Not medical advice.** This is a literate *map* of the major cardiometabolic, endocrine, and
> renal diseases — what they are, the mechanism (tied back to the fundamentals this corpus already
> builds), how they present, and the honestly-graded evidence behind their management. It is **not a
> treatment manual**, not a substitute for a clinician, and nothing here is a prescription. Diagnosis
> and therapy of any of these conditions belong to a physician who knows your numbers, your history,
> and your goals. Read this to understand the terrain — then act with someone qualified.

> **The gap this section fills.** The rest of this corpus is built around *prevention* and *biomarkers*
> — how to not get the disease, and what to measure. But the diseases themselves are the destination
> the whole prevention apparatus is trying to avoid, and most people will eventually meet one. This
> section maps the conditions as clinical entities: the pathophysiology (so the prevention levers make
> mechanistic sense), the presentation (so the words in a clinic visit aren't opaque), and the
> evidence-graded management (so you can tell a guideline-backed standard from a marketing claim). It
> deliberately covers the **cardiometabolic–endocrine–renal cluster**, because these diseases are not
> separate — they are one interlinked failure of the same vascular and metabolic machinery. Cancer,
> neurodegeneration, respiratory, and musculoskeletal disease are other sections.

> **Cross-references (do not duplicate).** Blood-pressure targets and lipid/apoB-guided prevention are
> graded in [`07-clinical-prevention.md`](07-clinical-prevention.md) and `L-biomarkers.md` — this
> section *uses* them and points back. The hormone axes (HPA, HPG, HPT, insulin/glucagon, GH/IGF-1)
> are built in [`13-endocrine-hormones.md`](13-endocrine-hormones.md) — this section maps the *diseases*
> of those axes without re-deriving the physiology. Renal and cardiovascular *aging* (the slow
> background slope) is in [`17-organ-systems-atlas.md`](17-organ-systems-atlas.md) §2; here we cover
> renal and cardiac *disease* as named entities. Atrial-fibrillation **stroke prevention** (the
> anticoagulation decision) is owned by `07` §2.2 — here we add the rhythm/rate question. Insulin
> resistance as a *mechanism* is in `D-metabolic-nutrition.md`; here it becomes type 2 diabetes as a
> *disease*.

> **The honesty rules (carried from [`06-evidence/SCHEMA.md`](../../06-evidence/SCHEMA.md)).**
> 1. **Mechanism ≠ outcome.** "SGLT2 inhibitors offload sodium and reduce preload" is a mechanism;
>    "dapagliflozin cut heart-failure hospitalization and CV death (HR 0.74)" is an outcome. We never
>    let the first masquerade as the second.
> 2. **Cohort ≠ RCT.** Most of what is *strongest* in this section — the heart-failure pillars, the
>    SGLT2/GLP-1 cardiorenal trials, DCCT, DiRECT — is **randomized**, the top of the ladder. Where a
>    claim is only observational or mechanistic, it is flagged.
> 3. **A drug class is not a miracle.** GLP-1s and SGLT2s are genuinely transformative *and* they are
>    being oversold. We grade the trial endpoints, name the absolute (not just relative) effects, and
>    flag the harms.

---

## The map — major conditions at a glance

| Condition | Mechanism (→ fundamentals) | Key management | Evidence anchor |
|---|---|---|---|
| **Coronary artery disease / MI** | apoB-lipoprotein retention in the arterial wall → inflammation → plaque → rupture/thrombosis (§13 endocrine, `L` apoB) | Lower apoB (statin/ezetimibe/PCSK9), BP control, don't smoke; revascularize ACS (PCI/CABG) | RCT (statins, FOURIER); secondary-prevention canon |
| **Heart failure — HFrEF** | pump fails (post-MI, etc.) → neurohormonal (RAAS/SNS) overdrive that is itself toxic | **Four pillars** GDMT: ARNI/ACEi + beta-blocker + MRA + SGLT2i; devices (ICD/CRT) | RCT (PARADIGM-HF, DAPA-HF) |
| **Heart failure — HFpEF** | stiff ventricle can't fill; driven by HTN, obesity, diabetes, age | SGLT2i (first drug to clearly help); treat the drivers; diuretics for congestion | RCT (EMPEROR-Preserved, DELIVER) |
| **Atrial fibrillation** | atrial electrical chaos → stasis → clot/stroke; rate irregular | **Anticoagulate** (DOAC, see §07); rate vs early rhythm control (±ablation) | RCT (EAST-AFNET 4; CABANA) |
| **Aortic stenosis** | calcific valve narrowing → pressure overload; the dominant valve disease of aging | Replace the valve (**TAVR** now first-line for most) when symptomatic/severe | RCT (PARTNER series) |
| **Type 2 diabetes** | insulin resistance + beta-cell failure → hyperglycemia (`D` metabolic) | Lifestyle → metformin → **GLP-1 / SGLT2** (organ protection) → insulin; remission possible | RCT (UKPDS, EMPA-REG, DiRECT) |
| **Metabolic syndrome** | central adiposity → insulin resistance cluster (BP, glucose, triglycerides, HDL) | Weight loss, fitness, glycemic control — same levers, upstream | cohort + RCT (lifestyle) |
| **Type 1 diabetes** | autoimmune beta-cell destruction → absolute insulin deficiency | Insulin (basal-bolus/pump) + CGM; tight control prevents complications | RCT (DCCT) |
| **Hypothyroidism / Hashimoto's** | autoimmune thyroid destruction → low thyroid hormone | Levothyroxine to normalize TSH; treat overt, individualize subclinical | RCT (levothyroxine; TRUST) |
| **Hyperthyroidism / Graves'** | TSH-receptor autoantibody → thyroid overactivity | Antithyroid drugs / radioiodine / surgery | guideline + cohort |
| **Thyroid nodules / cancer** | common nodules; mostly indolent papillary cancer (overdiagnosis epidemic) | Risk-stratified ultrasound/FNA; active surveillance for micropapillary | cohort (overdiagnosis) |
| **PCOS** | hyperandrogenism + ovulatory dysfunction + insulin resistance | Lifestyle, combined OCP, metformin/GLP-1; letrozole for fertility | RCT (letrozole); guideline |
| **Chronic kidney disease** | nephron loss (mostly from diabetes + hypertension) → falling GFR + albuminuria | BP/glucose control, RAAS blockade, **SGLT2i**, (±finerenone); RRT at end-stage | RCT (CREDENCE, DAPA-CKD, FLOW) |
| **Kidney stones** | supersaturated urine → crystal → stone (calcium oxalate dominant) | **Fluid to ~2.5 L urine/day**, dietary calcium-normal/low-sodium, citrate | RCT (high-fluid) |
| **BPH** | age + androgen-driven prostate growth → bladder-outlet obstruction | Alpha-blocker (fast), 5-ARI (shrinks); surgery (TURP/laser) if refractory | RCT (MTOPS) |

---

## 1. Cardiovascular disease — the failure of the pipes and the pump

Cardiovascular disease is the leading cause of death on Earth, and it is really several distinct
diseases that share a substrate: the same vasculature, injured by the same handful of forces (apoB
lipoproteins, blood pressure, glucose, tobacco, time). It is worth holding them apart, because the
*mechanisms* and *managements* differ sharply.

### 1.1 Coronary artery disease and heart attack — atherosclerosis as the root

**What it is.** Coronary artery disease (CAD) is atherosclerosis of the arteries that feed the heart
muscle. A **myocardial infarction (MI, "heart attack")** is what happens when an atherosclerotic
plaque ruptures, a clot forms on it, and a coronary artery suddenly occludes — starving a territory of
heart muscle of oxygen until it dies.

**Mechanism (→ the apoB fundamental).** The causal core is not "cholesterol clogging a pipe like grease
in a drain" — it is an active biological process. **Apolipoprotein-B-containing lipoproteins (LDL,
VLDL remnants, Lp(a)) cross the arterial endothelium and are retained in the wall.** Each of those
particles carries exactly one apoB, which is why **apoB particle count predicts events better than LDL
cholesterol concentration** (graded in `L-biomarkers.md`, claim `apob-superior-to-ldlc`). Retained
particles are oxidized, trigger an immune response, macrophages engorge into foam cells, and a lipid-
rich plaque with a fibrous cap grows over decades — silently. The danger is not the slow narrowing
(which can be compensated) but the **sudden rupture of a non-obstructive plaque**, which causes most
MIs. This is why a "70% blockage" is not the only thing to fear, and why lowering apoB — which
stabilizes and can regress plaque — is the central lever.

**How it presents.** Classic angina is exertional chest pressure/tightness radiating to arm or jaw,
relieved by rest. But presentation is treacherous: women, diabetics, and the elderly often have
**atypical or silent presentations** (fatigue, breathlessness, nausea, "indigestion"). An acute MI is
crushing chest pain with sweating, nausea, and dyspnea — but a meaningful minority are silent. The
honest takeaway: do not rely on textbook symptoms to rule it out.

**Management, honestly graded.**
- **Prevention is the highest-leverage move** and is owned by `07` and `L`: lower apoB aggressively
  (statin first-line; add ezetimibe; add a PCSK9 inhibitor for very high risk), control BP, never
  smoke, measure **Lp(a) once**. Statins for secondary prevention (established disease) are among the
  best-evidenced drugs in medicine; the FOURIER trial showed adding evolocumab to a statin further cut
  events, confirming "**lower apoB is better**" down to very low levels.
- **Acute MI (STEMI):** the dominant intervention is **immediate reperfusion** — primary percutaneous
  coronary intervention (PCI, "stent") to reopen the artery, time-critical ("time is muscle"). This is
  a genuine, large, RCT-backed life-saver in acute occlusion.
- **Stable CAD — the honest nuance:** for *stable* angina (no acute event), the **ISCHEMIA trial (2020,
  Maron/Hochman, NEJM)** found that an invasive strategy (routine stenting) did **not** reduce death or
  MI versus optimal medical therapy in stable patients — it improved *symptoms* but not survival. This
  is one of the most important honesty corrections in cardiology: **stents save lives in acute
  occlusion, but in stable disease they mostly treat symptoms, not mortality.** Optimal medical therapy
  (apoB lowering + BP + antiplatelet) is the survival lever.
- **CABG (bypass surgery)** retains a mortality advantage in specific high-risk anatomy (left main,
  multivessel disease with reduced ejection fraction, diabetics — FREEDOM trial).

### 1.2 Heart failure — when the pump fails, and the two flavors that matter

**What it is.** Heart failure (HF) is a clinical syndrome — the heart can't pump enough blood to meet
the body's needs (or can only do so at high filling pressures). It is the common downstream destination
of CAD, hypertension, valve disease, and diabetes. It splits into two phenotypes that, for decades,
behaved like different diseases:

- **HFrEF (reduced ejection fraction, EF ≤40%):** the muscle is weak — it can't *squeeze*. Usually
  post-MI or from cardiomyopathy.
- **HFpEF (preserved ejection fraction, EF ≥50%):** the muscle squeezes fine but is **stiff** — it
  can't *relax and fill*. Driven by hypertension, obesity, diabetes, aging, and atrial fibrillation.
  HFpEF is now roughly half of all heart failure and rising with the obesity/aging epidemic.

**Mechanism (→ neurohormonal toxicity).** The deep insight of modern HF therapy is that **the body's
compensatory response is itself the disease.** When the pump fails, the renin-angiotensin-aldosterone
system (RAAS) and sympathetic nervous system (SNS) activate to maintain pressure — but chronic RAAS/SNS
overdrive causes fibrosis, adverse remodeling, fluid retention, and arrhythmia. Every effective HFrEF
drug works by **blocking this maladaptive neurohormonal loop**, not by whipping the heart to beat
harder (inotropes, which whip the heart, *increase* mortality long-term — a clean lesson).

**How it presents.** Breathlessness (especially lying flat — orthopnea, and waking gasping —
paroxysmal nocturnal dyspnea), fatigue, exercise intolerance, leg/ankle edema, and weight gain from
fluid. Acute decompensation is a medical emergency.

**Management — the "four pillars" of HFrEF (this is the high-confidence part).** Guideline-directed
medical therapy (GDMT) for HFrEF rests on four drug classes, each RCT-proven to reduce mortality, now
started together and titrated up:

| Pillar | Mechanism | Landmark trial | Effect |
|---|---|---|---|
| **ARNI** (sacubitril/valsartan) or ACEi/ARB | blocks RAAS + augments natriuretic peptides | **PARADIGM-HF** (McMurray 2014, NEJM) | ARNI beat enalapril: **20% lower CV death/HF hospitalization**, all-cause mortality HR 0.84 |
| **Beta-blocker** (carvedilol, bisoprolol, metoprolol succinate) | blocks SNS | CIBIS-II, MERIT-HF, COPERNICUS | ~**34% mortality reduction** vs placebo |
| **MRA** (spironolactone, eplerenone) | blocks aldosterone | RALES, EMPHASIS-HF | ~**30% mortality reduction** |
| **SGLT2 inhibitor** (dapagliflozin, empagliflozin) | natriuresis + metabolic/cardiac effects | **DAPA-HF** (McMurray 2019, NEJM) | **26% lower** CV death/worsening HF (HR 0.74), *regardless of diabetes status* |

The SGLT2 story is remarkable: a drug developed to lower blood sugar turned out to be a **heart-failure
drug that works in people without diabetes**. That is the single biggest cardiology development of the
last decade. Add **devices** for selected patients: an **ICD** (implantable defibrillator) to prevent
sudden arrhythmic death when EF stays low, and **CRT** (cardiac resynchronization, a biventricular
pacemaker) when there's electrical dyssynchrony (wide QRS).

**HFpEF — the honest part: long a graveyard of trials, now cracking.** For years, *nothing* clearly
reduced outcomes in HFpEF (ACEi, ARB, beta-blockers all largely failed). The breakthrough was
**SGLT2 inhibitors: EMPEROR-Preserved (Anker 2021, NEJM)** and **DELIVER (2022)** showed empagliflozin/
dapagliflozin reduce HF hospitalization in HFpEF — the **first drug class with clear benefit**. Beyond
that, HFpEF management is **treating the drivers**: blood pressure, weight (the **STEP-HFpEF** trial
showed semaglutide markedly improved symptoms in obesity-related HFpEF), atrial fibrillation, and
diuretics for congestion. The mortality signal in HFpEF remains weaker than in HFrEF — honest.

### 1.3 Arrhythmias — atrial fibrillation as the dominant one

**What it is.** Atrial fibrillation (AF) is the most common sustained arrhythmia — chaotic electrical
activity in the atria replaces the organized beat, so the atria quiver instead of contracting. Two
consequences matter: **stroke** (blood stagnates in the non-contracting left atrial appendage, clots,
and embolizes — AF-strokes are large and disabling) and **symptoms/heart-failure** from the irregular,
often fast rate.

**Mechanism (→ electrical + structural).** AF arises from ectopic triggers (often from the pulmonary
veins) firing into an atrium made vulnerable by stretch, fibrosis, inflammation, and the same drivers
as HFpEF (hypertension, obesity, sleep apnea, alcohol, aging). It is increasingly understood as a
**marker of atrial myopathy**, not just an electrical glitch.

**How it presents.** Palpitations, breathlessness, fatigue, or nothing at all — AF is frequently
**asymptomatic and intermittent**, which is why it's caught late, sometimes only after a stroke.
Wearable single-lead ECGs now find a lot of it.

**Management — two separate decisions.**
1. **Stroke prevention (the survival lever — owned by `07` §2.2).** Risk-stratify with CHA₂DS₂-VASc;
   anticoagulate with a **DOAC** (apixaban, rivaroxaban, etc.), which beat warfarin on intracranial
   bleeding (ARISTOTLE; Ruff meta-analysis). **Aspirin is obsolete for AF stroke prevention.** This is
   the decision that actually prevents disability.
2. **Rate vs. rhythm control (the symptom lever, with an evolving survival twist).** Historically,
   **AFFIRM (2002)** found no survival difference between controlling the rate (letting AF run but
   slowing it) and restoring sinus rhythm with drugs — so rate control was fine. But the picture
   shifted: **EAST-AFNET 4 (2020, NEJM)** showed that **early rhythm control** (within a year of
   diagnosis) *did* reduce cardiovascular outcomes. And **catheter ablation** (pulmonary-vein
   isolation) is now clearly superior to drugs for *maintaining sinus rhythm and reducing symptoms*
   (**CABANA**, 2019, was neutral on its primary mortality endpoint but positive on AF recurrence and
   quality of life; ablation reduces HF-hospitalization and mortality specifically in **AF + HFrEF**,
   per CASTLE-AF). The honest synthesis: anticoagulation saves lives; rhythm control increasingly
   improves outcomes if done early, especially with ablation, but is primarily about how you *feel* and
   how the atrium *remodels*.

(Other arrhythmias — ventricular tachycardia/fibrillation behind sudden cardiac death, bradyarrhythmias
needing pacemakers, SVT — are beyond this map's scope; the ICD in §1.2 is the key sudden-death device.)

### 1.4 Valvular disease — aortic stenosis and the TAVR revolution

**What it is.** Heart valves can narrow (stenosis) or leak (regurgitation). The dominant valve disease
of aging is **calcific aortic stenosis (AS)** — the aortic valve progressively calcifies and narrows,
obstructing outflow from the left ventricle. (Mitral regurgitation is the other common one.)

**Mechanism.** Long framed as passive "wear and tear," AS is now understood as an **active,
atherosclerosis-like process** — lipid infiltration, inflammation, and osteoblast-like calcification of
the valve leaflets. (Notably, statins do *not* slow established AS — the calcification has its own
momentum — a humbling negative result.)

**How it presents.** The classic triad of severe AS is **angina, syncope, and heart failure** — and
once symptomatic, untreated severe AS has a grim prognosis (median survival measured in a few years).
A crescendo-decrescendo systolic murmur is the exam clue; echocardiography is the diagnostic.

**Management — the honest, fast-moving part.** There is **no good medical therapy** for severe AS — you
have to **replace the valve**. The revolution is **TAVR (transcatheter aortic valve replacement)** — a
valve delivered by catheter, no open-chest surgery. The **PARTNER trial series** (Leon, Mack, et al.,
NEJM) walked TAVR down the risk ladder: first proven superior to medical therapy in inoperable patients,
then non-inferior/superior to surgery in high-, intermediate-, and finally **low-risk** patients
(PARTNER 3, 2019). TAVR is now the default for most older patients with symptomatic severe AS; surgical
replacement (SAVR) remains preferred in younger patients, bicuspid valves, and certain anatomies. This
is one of the clearest "the device genuinely changed the disease" stories in modern medicine.

---

## 2. Type 2 diabetes & metabolic syndrome — the central cardiometabolic disease

### 2.1 What it is and the mechanism (→ insulin resistance)

**Metabolic syndrome** is a *cluster*, not a disease: central (visceral) adiposity, high blood pressure,
high fasting glucose, high triglycerides, and low HDL. Having ≥3 of the 5 marks a state of **insulin
resistance** that roughly doubles cardiovascular risk and dramatically raises diabetes risk. It is the
clinical face of the metabolic dysfunction built in `D-metabolic-nutrition.md`.

**Type 2 diabetes (T2D)** is the disease that cluster progresses to. The mechanism is two-hit:
1. **Insulin resistance** — muscle, liver, and fat stop responding to insulin (driven by ectopic fat,
   especially in liver and pancreas; cross-ref `D`). The pancreas compensates by pumping out *more*
   insulin (hyperinsulinemia), keeping glucose normal for years — the **prediabetes** window.
2. **Beta-cell failure** — eventually the overworked pancreatic beta cells can't keep up, insulin
   output falls, and glucose rises into the diabetic range. This is the crucial point: **T2D is not
   just resistance; it requires beta-cell decompensation.** That is also why it's progressive — and why
   relieving the metabolic load *early* can preserve beta-cell function.

**How it presents.** Often **silent** — found on a routine HbA1c or fasting glucose. Classic symptoms
(thirst, frequent urination, fatigue, blurred vision, slow healing) appear with higher glucose.
Diagnosis: HbA1c ≥6.5%, fasting glucose ≥126 mg/dL, or OGTT ≥200. Prediabetes: HbA1c 5.7–6.4%.

### 2.2 The management hierarchy — honestly graded

The modern approach has been transformed by two drug classes that protect organs *beyond* glucose
control. The hierarchy:

**Tier 0 — lifestyle (foundational, never skipped).** Weight loss is the master lever. The **Diabetes
Prevention Program (DPP, 2002)** showed intensive lifestyle (7% weight loss + activity) cut progression
from prediabetes to diabetes by **58%** — beating metformin (31%) — the cleanest proof that T2D is
substantially preventable. (The **Look AHEAD** trial later found intensive lifestyle did *not* reduce
cardiovascular *events* in established T2D despite weight loss and better fitness — an honest negative —
though it improved many secondary outcomes and drove remission.)

**Tier 1 — metformin.** Still first-line oral agent: cheap, safe, weight-neutral, lowers hepatic
glucose output. The **UKPDS** showed metformin reduced diabetes complications and (in overweight
patients) cardiovascular mortality; decades of safety. The honest footnote: metformin's *cardiovascular*
evidence is older and weaker than the newer agents', and it depletes B12 over time.

**Tier 2 — the organ-protective revolution (GLP-1 and SGLT2).** These are now used *early*, often
regardless of how high the glucose is, because they reduce **death, heart failure, and kidney failure**
— not just sugar:
- **GLP-1 receptor agonists** (semaglutide, liraglutide, tirzepatide [a dual GIP/GLP-1]): augment
  glucose-dependent insulin, suppress appetite, drive major weight loss. **LEADER (liraglutide, 2016)**
  and **SUSTAIN-6 (semaglutide, 2016)** showed reductions in cardiovascular events. As weight-loss
  agents they're extraordinary (STEP trials: ~15% body weight with semaglutide; tirzepatide more), and
  **SELECT (2023)** showed semaglutide cut cardiovascular events in obesity *without* diabetes.
- **SGLT2 inhibitors** (empagliflozin, dapagliflozin, canagliflozin): make the kidney dump glucose in
  urine; turned out to be **heart-failure and kidney-protective** drugs. **EMPA-REG OUTCOME (Zinman
  2015, NEJM)** was the landmark — empagliflozin cut cardiovascular death by 38% — and the benefit
  generalized to HF (§1.2) and CKD (§6). They protect organs largely *independent* of glucose lowering.

**Tier 3 — insulin (and others).** When beta-cell function has declined enough, exogenous insulin is
added (basal first, then mealtime). Older agents (sulfonylureas — cheap but cause hypoglycemia and
weight gain; TZDs; DPP-4 inhibitors — glucose-only, no organ benefit) fill specific niches but have
been displaced from the front line by GLP-1/SGLT2 where affordable.

**The honest meta-point:** glucose control alone (the old "lower the A1c" paradigm) was always
necessary but proved *insufficient* — intensive glucose-lowering in ACCORD even *increased* mortality.
The shift is to drugs chosen for **cardiorenal outcomes**, with glucose as one of several targets. The
constraint is **cost and access** — GLP-1/SGLT2 are expensive, and the equity gap is real.

### 2.3 Remission — the DiRECT evidence

T2D was long taught as "chronic and progressive." That is now only **half-true**: in earlier disease,
substantial weight loss can drive **remission** (normal glucose off all diabetes medication).
- **DiRECT (Lean et al., Lancet 2018)** randomized primary-care patients to a structured
  total-diet-replacement weight-management program. At **1 year, 46% achieved remission** (vs 4%
  control), and remission was **dose-dependent on weight loss** — **86% of those who lost ≥15 kg** were
  in remission. At **2 years**, 36% remained in remission (Lancet Diabetes Endocrinol 2019). The
  mechanism fits the pathophysiology: losing visceral and **pancreatic** fat un-stresses the beta cells
  (the "twin cycle" hypothesis).
- **Honest caveats:** remission is most achievable **early** (short diabetes duration, before beta-cell
  exhaustion), it requires **sustained** weight loss (relapse with regain), and it's "remission," not
  "cure" — the underlying susceptibility remains. But it reframes T2D as, for many, a **potentially
  reversible** state — a genuinely important and underused message. GLP-1 agonists now offer a
  pharmacological route to the same weight loss, blurring the line between treatment and remission.

### 2.4 Complications — why glucose control matters

Chronic hyperglycemia damages vessels, split into:
- **Microvascular:** **retinopathy** (leading cause of working-age blindness), **nephropathy** (leading
  cause of kidney failure — §6), **neuropathy** (numbness/pain, and the diabetic foot → ulcers,
  amputations). **DCCT/UKPDS proved tight glucose control reduces microvascular complications** — this
  is solid.
- **Macrovascular:** accelerated atherosclerosis → MI, stroke, peripheral artery disease. Here BP,
  lipids, and the GLP-1/SGLT2 agents matter as much as glucose.

---

## 3. Type 1 diabetes — the autoimmune one (brief)

**What it is.** A fundamentally different disease that shares a name. Type 1 diabetes (T1D) is
**autoimmune destruction of the insulin-producing pancreatic beta cells** — T-cell-mediated, marked by
autoantibodies (GAD, IA-2, ZnT8). The result is **absolute insulin deficiency**: the body makes
essentially none. It usually presents in childhood/adolescence but can appear at any age (LADA in
adults). Without insulin, the body burns fat uncontrollably → **diabetic ketoacidosis (DKA)**, a
life-threatening emergency that is often the presenting event (thirst, weight loss, vomiting, rapid
breathing).

**Mechanism (→ immune fundamentals).** A genetic susceptibility (HLA) plus an environmental trigger
launches an autoimmune attack on the beta cells. Unlike T2D, **it is not caused by lifestyle, weight,
or sugar intake** — a persistent and harmful public misconception.

**Management.** Lifelong **insulin replacement** is mandatory and non-negotiable — basal-bolus regimens
(long-acting + mealtime) or insulin pumps. The transformation of the last decade is **technology**:
- **CGM (continuous glucose monitors)** — a subcutaneous sensor streaming glucose every few minutes,
  replacing fingersticks; reduces hypoglycemia and improves control (and is now widely used in T2D too).
- **Insulin pumps + "hybrid closed-loop" / artificial-pancreas systems** — a pump and CGM talking to an
  algorithm that auto-adjusts insulin, the closest thing yet to an automated system; RCTs show improved
  time-in-range and less hypoglycemia.
- **DCCT (1993, NEJM)** is the foundational trial: intensive insulin therapy (tight control) cut
  microvascular complications by 50–76% versus conventional therapy, and the **EDIC** follow-up showed a
  durable "**metabolic memory**" cardiovascular benefit decades later. Tight control works — at the cost
  of hypoglycemia risk, which the new tech is steadily reducing.
- **Frontier:** **teplizumab** (anti-CD3) can *delay the onset* of clinical T1D in high-risk
  autoantibody-positive relatives (the first disease-modifying immunotherapy) — and beta-cell
  replacement (islet/stem-cell-derived) is in trials. Not yet a cure.

---

## 4. Thyroid disease — the most common endocrine disorders

The thyroid (HPT axis physiology is in `13` §5) sets metabolic rate. Its diseases are common,
eminently treatable, and surrounded by more myth than almost any other organ.

### 4.1 Hypothyroidism and Hashimoto's

**What it is.** An **underactive thyroid** — too little thyroid hormone, so metabolism slows. In
iodine-sufficient countries the dominant cause is **Hashimoto's thyroiditis**, an autoimmune disease in
which antibodies (anti-TPO) gradually destroy the gland. It's far more common in women and rises with
age.

**How it presents.** Fatigue, cold intolerance, weight gain, constipation, dry skin, hair thinning,
slowed thinking, depression — nonspecific symptoms that overlap with ordinary life, which is why it's
both **under**-diagnosed and **over**-blamed. Diagnosis is biochemical: **high TSH** (the pituitary
shouting at a failing gland) with **low free T4** = overt hypothyroidism.

**Management — clear for overt, contested for subclinical.**
- **Overt hypothyroidism:** **levothyroxine** (synthetic T4), titrated to normalize TSH. Cheap,
  effective, lifelong, well-evidenced. One of the cleaner replacement therapies in medicine.
- **Subclinical hypothyroidism** (high TSH, *normal* free T4 — common in the elderly): genuinely
  contested. The **TRUST trial (Stott 2017, NEJM)** found that levothyroxine in older adults with mild
  subclinical hypothyroidism produced **no symptomatic benefit** — a strong argument against reflexively
  treating a mildly high TSH, especially in the elderly where the normal range drifts up. Treat based on
  TSH level, age, antibodies, and symptoms — not autopilot.
- **The honest myth-correction:** the "T4 is inferior, everyone needs T3/natural desiccated thyroid"
  movement is **not supported by good evidence** for most patients; the symptom-relief claims for combo
  therapy mostly fail in blinded trials. And "hypothyroidism is why I can't lose weight / am tired" is
  vastly over-claimed — most fatigue with a normal TSH is not thyroid.

### 4.2 Hyperthyroidism and Graves'

**What it is.** An **overactive thyroid** — too much hormone, metabolism in overdrive. The leading
cause is **Graves' disease**, an autoimmune condition where a **TSH-receptor-stimulating antibody**
turns the gland on constantly. (Toxic nodules and thyroiditis are other causes.)

**How it presents.** Weight loss despite eating, heat intolerance, palpitations/tachycardia (and AF —
§1.3), tremor, anxiety, insomnia, frequent stools. Graves' adds specific signs: **eye disease**
(proptosis, the bulging eyes) and goiter. Biochemistry: **low TSH, high free T4/T3**. Untreated severe
hyperthyroidism can precipitate **thyroid storm**, an emergency.

**Management.** Three established options, choice individualized: **antithyroid drugs** (methimazole;
propylthiouracil in first-trimester pregnancy) which block hormone synthesis; **radioactive iodine**
which ablates the gland (then lifelong levothyroxine); and **surgery** (thyroidectomy). Beta-blockers
control symptoms acutely. All three are effective; the trade-offs (relapse risk vs. permanent
hypothyroidism) drive the choice.

### 4.3 Nodules and thyroid cancer — the overdiagnosis story

Thyroid **nodules are extremely common** (palpable in ~5%, found on imaging in up to half of older
adults) and the **vast majority are benign**. Evaluation is risk-stratified: ultrasound features (a
TI-RADS score) decide who needs a fine-needle aspiration biopsy.

The honest, important point is **overdiagnosis**. The most common thyroid cancer — **papillary thyroid
cancer** — is usually indolent, and the explosion of neck imaging has driven an **epidemic of
diagnosis without a matching rise in mortality** (the textbook case, especially stark in South Korea).
This has produced a genuine shift toward **active surveillance** (watchful waiting) for small, low-risk
papillary microcarcinomas rather than reflexive thyroidectomy — recognizing that finding and treating a
cancer that would never have harmed you is a harm, not a save. Mortality from thyroid cancer is low;
the disease is mostly a screening-and-overtreatment cautionary tale rather than a major killer.

---

## 5. Other endocrine disease — PCOS, adrenal, pituitary

### 5.1 PCOS — the common metabolic-reproductive disorder

**What it is.** Polycystic ovary syndrome (PCOS) is the **most common endocrine disorder in women of
reproductive age** (~6–13%), and is badly named — the "cysts" are actually unovulated follicles, and
many women with PCOS don't have them. Diagnosis (the **Rotterdam criteria**) requires ≥2 of: (1)
**hyperandrogenism** (clinical — hirsutism, acne — or biochemical), (2) **ovulatory dysfunction**
(irregular/absent periods), (3) **polycystic ovarian morphology** on ultrasound.

**Mechanism (→ insulin resistance, again).** PCOS sits at the crossroads of reproductive and metabolic
medicine. **Insulin resistance is central** (independent of weight, though worsened by it): high insulin
drives the ovaries and adrenals to make excess androgens and disrupts ovulation. This is why PCOS is
not "just" a fertility/cosmetic issue — it carries elevated risk of **type 2 diabetes, metabolic
syndrome, and likely cardiovascular disease**, plus endometrial cancer (from unopposed estrogen) and a
high burden of anxiety/depression.

**How it presents.** Irregular periods, difficulty conceiving, hirsutism, acne, weight gain, and the
metabolic features. It's frequently diagnosed late or dismissed.

**Management.** Targeted to the goal:
- **Lifestyle/weight loss** improves ovulation, androgens, and metabolic risk (foundational).
- **Combined oral contraceptive** regulates cycles, lowers androgens, protects the endometrium.
- **Metformin** for the metabolic component / insulin resistance; **GLP-1 agonists** increasingly used
  for the weight and metabolic burden.
- **For fertility: letrozole** (an aromatase inhibitor) is now **first-line for ovulation induction** —
  the **Legro et al. RCT (NEJM 2014)** showed letrozole produced higher live-birth rates than the older
  standard clomiphene. A clean, practice-changing result.
- Anti-androgens (spironolactone) for hirsutism. There is no cure; management is lifelong and
  goal-directed.

### 5.2 Adrenal disease (brief)

The adrenal glands sit atop the kidneys and make cortisol, aldosterone, and adrenal androgens (HPA-axis
physiology in `13` §3 — and note that the "**adrenal fatigue**" of the wellness industry is **not a
real diagnosis**, debunked there). The genuine adrenal diseases are rarer but serious:
- **Cushing's syndrome** — chronic **cortisol excess** (most often iatrogenic, from prescribed steroids;
  endogenously from a pituitary ACTH-secreting tumor [Cushing's *disease*] or adrenal tumor). Presents
  with central obesity, moon face, purple striae, muscle wasting, hypertension, glucose intolerance,
  osteoporosis, and mood change. Treatment is removing the source (surgery) or blocking cortisol.
- **Addison's disease (primary adrenal insufficiency)** — the opposite: too **little** cortisol (and
  aldosterone), usually autoimmune destruction of the adrenal cortex. Presents insidiously with fatigue,
  weight loss, low blood pressure, salt craving, and **hyperpigmentation**; can crash into a
  life-threatening **adrenal crisis** (shock) under stress. Treatment is lifelong **hormone
  replacement** (hydrocortisone + fludrocortisone) — and patients must "stress-dose" during illness.
  Missing this diagnosis is dangerous.
- **Primary aldosteronism** (Conn's) — aldosterone excess — is a **common, underdiagnosed, and
  *curable*** cause of hypertension (cross-ref `07`); worth screening in resistant hypertension.

### 5.3 Pituitary (brief)

The pituitary is the "master gland" conducting the other axes (`13` §1). Its diseases are mostly
**adenomas** (benign tumors): **prolactinomas** (excess prolactin → infertility, galactorrhea; treated
medically with dopamine agonists), **acromegaly** (excess growth hormone in adults → enlarged
hands/face/organs; cross-ref the GH/IGF-1 axis in `13` §7), Cushing's *disease* (above), and
**hypopituitarism** (failure of one or more axes, requiring targeted replacement). These are uncommon
but important because they masquerade as vague systemic complaints and are diagnosable with the right
hormone panel and imaging.

---

## 6. Kidney disease — the silent organ failing quietly

The kidney's *aging* slope is mapped in `17` §2; here it is the *disease*. The kidneys filter ~180 L of
plasma daily, regulate blood pressure, electrolytes, acid-base, red-cell production (erythropoietin),
and vitamin D activation. They are **silent** — you can lose most of your kidney function with no
symptoms — which is why kidney disease is caught late and underdiagnosed.

### 6.1 Chronic kidney disease — staging, causes, and the real levers

**What it is.** Chronic kidney disease (CKD) is the progressive, usually irreversible loss of kidney
function over months to years. It's defined and staged by **two axes** (the KDIGO system):
- **GFR (glomerular filtration rate)** — the filtering capacity, estimated from creatinine (and
  cystatin C). Stages **G1 (≥90)** through **G5 (<15, kidney failure)**.
- **Albuminuria** — protein leaking into urine (A1/A2/A3), an early marker of glomerular damage and an
  independent predictor of progression *and* cardiovascular death.

A persistently reduced GFR (<60) **or** albuminuria for >3 months defines CKD. The combined grid (the
KDIGO "heat map") stratifies risk far better than GFR alone.

**Mechanism and the leading causes (→ the vascular fundamentals).** CKD is overwhelmingly a **disease of
the vasculature feeding the nephrons.** The two dominant causes worldwide:
1. **Diabetes (diabetic nephropathy)** — the single leading cause; hyperglycemia damages the glomerular
   filtration apparatus.
2. **Hypertension** — high pressure shears the delicate glomerular capillaries.

Together these are the majority of dialysis cases. The logic is the through-line of this whole section:
**what protects the blood vessels protects the kidney.** Other causes: glomerulonephritis, polycystic
kidney disease (genetic), and chronic obstruction/infection.

**How it presents.** Almost always **asymptomatic** until advanced. Late symptoms (fatigue, edema,
nausea, itching, poor appetite — uremia) mean a lot of function is already gone. It's found on routine
labs (creatinine/eGFR + urine albumin). The honest lesson: **screen the high-risk (diabetics,
hypertensives) — don't wait for symptoms.**

**Management — the levers, honestly graded.**
- **Blood pressure control** + **RAAS blockade** (ACE inhibitor or ARB) — the long-standing foundation;
  ACEi/ARB reduce albuminuria and slow progression, especially in diabetic/proteinuric CKD. Solid RCT
  evidence (RENAAL, IDNT).
- **Glucose control** in diabetic CKD.
- **SGLT2 inhibitors — the modern game-changer.** Developed for diabetes, they turned out to be
  **kidney-protective drugs**, slowing GFR decline and reducing kidney failure: **CREDENCE
  (canagliflozin, 2019)**, **DAPA-CKD (dapagliflozin, 2020)** — which showed benefit *even in
  non-diabetic CKD* — and **EMPA-KIDNEY (2023)**. This is one of the most important nephrology advances
  in decades.
- **GLP-1 agonists** now join them: **FLOW (semaglutide, Perkovic NEJM 2024)** showed semaglutide
  reduced major kidney-disease events by 24% in diabetic CKD — fresh, strong evidence.
- **Finerenone** (a non-steroidal MRA, FIDELIO/FIGARO trials) adds cardiorenal protection in diabetic
  CKD.
- **The honest diet levers** (cross-ref `17` §2.5): the "high protein destroys kidneys" claim is a
  **myth in people with *healthy* kidneys** — but in *established* CKD, moderate protein restriction is
  a genuine (if modest) lever, alongside sodium restriction and managing potassium/phosphate as function
  declines. Avoid nephrotoxins (NSAIDs — the "triple whammy" with ACEi+diuretic; contrast dye caution).

### 6.2 End-stage kidney disease — the dialysis/transplant reality

When GFR falls to **kidney failure (G5, roughly <10–15)**, renal replacement therapy is needed to live.
The honest reality:
- **Dialysis** (hemodialysis ~3×/week at a center, ~4 hrs each, or home peritoneal dialysis) keeps
  people alive but is **a hard life** — major time burden, dietary/fluid restrictions, and a **mortality
  rate worse than many cancers** (5-year survival on dialysis is poor, comparable to some advanced
  malignancies). It treats the symptoms, not the disease.
- **Kidney transplant** is the **superior treatment** when feasible — better survival and quality of
  life than dialysis — but is limited by **organ scarcity** (long waitlists), surgical risk, and
  lifelong immunosuppression (with its infection/cancer trade-offs). A living-donor transplant is best.
- The framing that matters: **the dominant goal of CKD care is to slow progression so dialysis is
  delayed or avoided** — which is exactly why the SGLT2/RAAS/BP levers above are so consequential.
  Prevention here buys *years off dialysis*.

### 6.3 Kidney stones — common, painful, preventable

**What it is.** Crystallized minerals forming stones in the urinary tract — most commonly **calcium
oxalate**. Lifetime prevalence ~10%, recurrence is high (~50% within 5–10 years), and incidence is
rising.

**Mechanism.** **Supersaturated urine** — when urine is too concentrated and/or chemistry is off,
minerals crystallize. The dominant risk factor is **low urine volume** (under-hydration), plus dietary
factors (high sodium, high animal protein, low citrate).

**How it presents.** **Renal colic** — sudden, severe, waxing flank pain radiating to the groin, often
with nausea and blood in the urine. Memorably described as among the worst pains in medicine.

**Management — the honest, high-yield prevention.**
- **Fluid — the single best-evidenced lever.** An RCT (Borghi) showed **high fluid intake (targeting
  ~2–2.5 L of urine per day) roughly halved recurrence.** This is the rare lifestyle measure with clean
  RCT backing. "Drink more water" is genuinely the headline.
- **Diet:** reduce **sodium** and **animal protein**; **don't restrict dietary calcium** (counter-
  intuitively, *low* calcium intake *raises* oxalate-stone risk — the Curhan/Borghi data — so normal
  dietary calcium is protective); **citrate** (lemon, potassium citrate) inhibits stones.
- Acute stones pass on their own if small (hydration, pain control, ± medical expulsive therapy);
  larger ones need urological intervention (shockwave lithotripsy, ureteroscopy).

---

## 7. Urology — BPH, UTIs, incontinence

### 7.1 BPH — the aging prostate

**What it is.** Benign prostatic hyperplasia (BPH) is **non-cancerous enlargement of the prostate** —
near-universal with age (cross-ref `17` §6.2; distinct from prostate *cancer*, graded in `07` §6). The
enlarging gland squeezes the urethra, obstructing bladder outflow.

**Mechanism.** Age- and androgen-driven (DHT) prostatic growth → bladder-outlet obstruction.

**How it presents.** **Lower urinary tract symptoms (LUTS):** weak stream, hesitancy, incomplete
emptying, frequency, nocturia (waking to urinate), urgency. Can progress to retention and back up to the
kidneys.

**Management, graded.**
- **Alpha-blockers** (tamsulosin) — relax prostatic smooth muscle; **fast symptom relief**, first-line
  for symptoms.
- **5-alpha-reductase inhibitors** (finasteride, dutasteride) — block DHT, **shrink the gland** over
  months; best for larger prostates, and reduce retention/surgery risk. The **MTOPS trial** showed
  **combination** (alpha-blocker + 5-ARI) beat either alone for preventing progression.
- **Surgery** (TURP — transurethral resection; or modern laser/water-vapor techniques) for refractory
  or complicated cases.
- Honest note: 5-ARIs have sexual side effects and *lower* PSA (~50%), which must be accounted for in
  cancer screening.

### 7.2 UTIs

**What it is.** Urinary tract infections — bacterial (usually *E. coli*) infection of the bladder
(cystitis) or, more seriously, the kidney (pyelonephritis). Very common, especially in women (short
urethra) and the elderly.

**How it presents.** Burning urination (dysuria), frequency, urgency, suprapubic pain; fever/flank pain
signals kidney involvement (pyelonephritis — more serious). In the elderly, UTIs can present atypically
(confusion). Diagnosis: urinalysis/culture.

**Management, honestly.** Symptomatic UTIs are treated with **antibiotics** (short courses preferred to
limit resistance). Two honesty points: (1) **Asymptomatic bacteriuria should generally NOT be treated**
(except in pregnancy or before urologic procedures) — treating it drives resistance without benefit, one
of the clearest antibiotic-stewardship lessons. (2) For recurrent UTIs, **cranberry's evidence is weak/
mixed** (modest at best); the better-evidenced measures are hydration, and for some, prophylactic or
post-coital strategies guided by a clinician. Recurrent or complicated UTIs warrant evaluation.

### 7.3 Incontinence

**What it is.** Involuntary urine leakage — common, under-reported, and quality-of-life-limiting, rising
with age. Two main types:
- **Stress incontinence** (leak with cough/laugh/exertion) — weak pelvic-floor/sphincter support; common
  postpartum and post-menopause in women, and after prostate surgery in men.
- **Urge incontinence / overactive bladder** (sudden urge → leak) — detrusor overactivity.

**Management, graded.**
- **Pelvic-floor muscle training (Kegels)** is **first-line and genuinely evidence-based** for stress
  incontinence (and helps urge) — cross-ref `11`. It works; it's underused.
- **Behavioral** measures (bladder training, fluid/caffeine timing, weight loss).
- **Medications** for overactive bladder (antimuscarinics — with anticholinergic-burden caution in the
  elderly, a real cognitive concern; or beta-3 agonists like mirabegron).
- **Procedures** (sling surgery for stress incontinence; Botox/neuromodulation for refractory urge).
  Incontinence is treatable far more often than people assume — the main barrier is that it goes
  unmentioned.

---

## 8. The honest synthesis — one disease wearing many masks

Step back and the unifying claim of this section is hard to miss: **cardiometabolic, endocrine, and
renal disease are largely one interconnected process** — the failure of the vascular and metabolic
machinery — wearing different organ masks.

- **Insulin resistance** is the hub. It links metabolic syndrome → type 2 diabetes → fatty liver →
  PCOS → and accelerates atherosclerosis, heart failure, and kidney disease. Move it upstream (weight,
  fitness, glycemic control) and you bend the curve on all of them at once.
- **The vasculature is the shared victim.** High apoB, high blood pressure, and high glucose damage the
  same arteries — whether you measure the damage in the coronaries (MI), the glomeruli (CKD), the
  retina (retinopathy), or the brain (vascular dementia). This is why `07`'s prevention levers (BP,
  apoB, don't smoke) and this atlas's diseases are the same story told from opposite ends.
- **The two drug classes that reorganized this entire field** — **GLP-1 agonists and SGLT2 inhibitors**
  — did so precisely *because* the diseases are one disease: a glucose drug that protects the heart and
  kidney makes sense only if heart, kidney, and pancreas are failing from a shared metabolic root. That
  is the deep mechanistic vindication.
- **What's genuinely strong (RCT-backed):** the HFrEF four pillars, SGLT2/GLP-1 cardiorenal protection,
  DCCT-grade tight glucose control for microvascular complications, DiRECT-grade remission, RAAS
  blockade in proteinuric CKD, high-fluid stone prevention, levothyroxine for overt hypothyroidism,
  letrozole for PCOS fertility, TAVR for severe AS, anticoagulation for AF.
- **What's oversold or contested** (see below) — equally worth knowing.

### What's oversold, contested, or commonly misunderstood

| Claim / practice | The honest status |
|---|---|
| **Stents for stable angina save lives** | **Mostly false.** ISCHEMIA: in *stable* CAD, routine stenting relieves symptoms but does **not** reduce death/MI vs optimal medical therapy. Stents save lives in *acute* occlusion, not stable disease. |
| **Tighter glucose is always better** | **No.** ACCORD found intensive glucose-lowering *increased* mortality. Glucose control prevents microvascular complications, but the cardiorenal wins come from drug *choice* (GLP-1/SGLT2), not just a lower A1c. |
| **T2D is permanent and progressive** | **Half-myth.** DiRECT: ~46% remission at 1 yr with sufficient weight loss, especially early. Reframe T2D as often reversible. |
| **Everyone with a high TSH needs treatment** | **No.** TRUST: treating mild subclinical hypothyroidism in the elderly gave no symptomatic benefit. Treat overt disease; individualize subclinical. |
| **"Natural" T3/desiccated thyroid is superior** | **Not evidence-based** for most; blinded trials don't show combo therapy beats levothyroxine. |
| **Found thyroid cancer = lifesaving catch** | **Often overdiagnosis.** Papillary microcarcinoma is usually indolent; active surveillance is now a legitimate option. Finding it ≠ benefiting from treating it. |
| **"Adrenal fatigue"** | **Not a real diagnosis** (see `13` §3). Real adrenal disease (Addison's, Cushing's) is specific and testable. |
| **Cranberry prevents UTIs** | **Weak/mixed evidence.** Don't rely on it; treat symptomatic UTIs, don't treat asymptomatic bacteriuria. |
| **Protein harms your kidneys** | **Myth in healthy kidneys** (`17` §2.5). Modest protein restriction is a lever only in *established* CKD. |
| **Dialysis is a fine long-term solution** | **Honest reality:** survival on dialysis is poor (comparable to some cancers); transplant is far better; the real goal is slowing CKD to *avoid* it. |

---

## 9. Go deeper

| Source | Best for | Note |
|---|---|---|
| **KDIGO Clinical Practice Guidelines** (kdigo.org) — CKD Evaluation & Management (2024) | The authoritative, free, evidence-graded staging (GFR×albuminuria heat map) and management of CKD | The single best reference for "how bad is this kidney number and what changes it" |
| **ADA Standards of Care in Diabetes** (annual, *Diabetes Care*) | The living, guideline-graded standard for T1D/T2D — diagnosis, the GLP-1/SGLT2 hierarchy, complications | Updated yearly; the management hierarchy in §2.2 tracks this |
| **2022 AHA/ACC/HFSA Heart Failure Guideline** (*Circulation*/*JACC*) | The four-pillar GDMT framework and device indications, graded | The HFrEF "four pillars" come straight from here |
| **DiRECT** — Lean et al., *Lancet* 2018 (`10.1016/S0140-6736(17)33102-1`) + 2-yr (`10.1016/S2213-8587(19)30068-3`) | The proof type-2-diabetes remission is real and weight-dependent | The "twin cycle" reframing of T2D as reversible |
| **EMPA-REG OUTCOME** — Zinman et al., *NEJM* 2015 (`10.1056/NEJMoa1504720`) + **DAPA-HF** McMurray 2019 (`10.1056/NEJMoa1911303`) | The trials that turned SGLT2 inhibitors from glucose drugs into cardiorenal drugs | The mechanistic vindication that these diseases are one |
| **CREDENCE** (`10.1056/NEJMoa1811744`) + **DAPA-CKD** (`10.1056/NEJMoa2024816`) + **FLOW** (`10.1056/NEJMoa2403347`) | The modern kidney-protection RCTs (SGLT2 and GLP-1) | DAPA-CKD's non-diabetic benefit and FLOW (2024) are the fresh evidence |
| **PARADIGM-HF** — McMurray et al., *NEJM* 2014 (`10.1056/NEJMoa1409077`) | ARNI superiority in HFrEF — the first pillar | The neurohormonal-blockade logic of HF therapy |
| **DCCT/EDIC** — *NEJM* 1993 (`10.1056/NEJM199309303291401`) | The foundational proof tight glucose control prevents T1D complications + "metabolic memory" | Why CGM/pump tech matters |
| **ISCHEMIA** — Maron/Hochman et al., *NEJM* 2020 | Why stable-CAD revascularization treats symptoms, not survival | The essential honesty correction on stents |
| **Peter Attia — *Outlive*** (2023) | A readable synthesis of the cardiometabolic ("Four Horsemen") prevention frame | Big-picture *why*; cross-check specifics against the guidelines above |

---

*Section maintained by Nucleus. Graded claims live in `02-domains/disease-cardiometabolic-claims.json`.
Prevention/biomarker cross-refs: `07-clinical-prevention.md`, `L-biomarkers.md`. Hormone-axis physiology:
`13-endocrine-hormones.md`. Renal/cardiac aging: `17-organ-systems-atlas.md`. This is a literate map of
disease, not medical advice — every named trial links to its DOI; follow it to the evidence tier before
acting, and act with a clinician.*
