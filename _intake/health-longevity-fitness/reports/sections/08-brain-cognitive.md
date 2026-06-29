# 08 — Brain, Cognition & Mental Health

> **Status:** v0.1 — 2026-06-28. The neurodegeneration + mental-health section of the manual. Fills a
> standing gap: dementia is one of the "four horsemen" of age-related death, and the corpus barely
> covered it.
> **Companion data:** `02-domains/Q-brain-claims.json` (this section's graded claims). Cross-references
> Domain I (`02-domains/I-sleep-circadian.md` — sleep / glymphatic / amyloid clearance) and Domain M
> (`02-domains/M-psychosocial-determinants.md` — loneliness, purpose, social connection).
> *Graded per the manual's evidence tiers; the three honesty rules — predictor ≠ lever, cohort ≠ RCT, something beats nothing — are defined up front in "Start Here."*

This section answers the question the longevity-and-biohacking world is strangely quiet about: **what
actually protects the brain as it ages, and what is being sold to you that does not?** The asymmetry
mirrors Domain M's: the genuinely large, well-evidenced levers (hearing, vascular risk, education,
connection, sleep) are mostly unsexy and unmonetizable, while the marketed interventions (nootropics,
brain-training apps, and — at the clinical end — the new amyloid antibodies) carry far weaker
benefit-to-risk than their visibility implies.

---

## 1. The spine: the Lancet Commission and the "45% modifiable" claim

The single most important document in dementia prevention is the **Lancet Commission on dementia
prevention, intervention and care.** Its 2020 report (Livingston et al., *Lancet* 2020,
`10.1016/S0140-6736(20)30367-6`) concluded that **~40% of dementia worldwide is attributable to 12
modifiable risk factors.** The 2024 update (Livingston et al., *Lancet* 2024,
`10.1016/S0140-6736(24)01296-0`) added two factors — **high LDL cholesterol** and **untreated vision
loss** — and revised the headline to **~45% of dementia attributable to 14 modifiable risk factors,
acting across the life course.** This is the spine of the section. Everything else is detail hanging off
it.

### 1.1 The 14 factors and their population-attributable fractions (2024)

A **population-attributable fraction (PAF)** is: *if this risk factor were entirely eliminated from the
population, what share of dementia cases would, in principle, not occur?* The factors are weighted for
overlap (they share causes), so the PAFs already account for double-counting and sum to ~45%.

| Life stage | Risk factor | PAF (2024) | What it means / the honest tier |
|---|---|---|---|
| **Early life** | Less education | **5%** | Fewer years of education → lower "cognitive reserve." Strong, but the lever is societal (childhood schooling), not something a 60-year-old changes about their past. Lifelong learning is the *hopeful* extrapolation, not the proven mechanism. |
| **Midlife** | Hearing loss | **7%** | The **largest single modifiable factor.** And — uniquely — it has RCT support that it's a *lever*, not just a predictor (see §2, ACHIEVE). |
| | High LDL cholesterol | **7%** | *New in 2024.* Midlife LDL → vascular + likely amyloid pathways. Lever = the same statins/lifestyle that protect the heart. |
| | Depression | **3%** | Bidirectional: depression is both a risk factor *and* an early symptom (reverse causation is real here — see §5). |
| | Traumatic brain injury (TBI) | **3%** | Repeated/severe head injury. Lever = helmets, fall prevention, contact-sport policy. |
| | Physical inactivity | **2%** | Lever = movement (see §3). Effect on the brain runs largely through vascular and metabolic health. |
| | Diabetes | **2%** | Glycemic control; vascular + insulin-signaling pathways. |
| | Smoking | **2%** | Vascular + oxidative. Quitting at any age helps. |
| | Hypertension | **2%** | **Midlife** blood pressure is the load-bearing window (see §1.3). |
| | Obesity | **1%** | Midlife obesity; partly a proxy for the metabolic cluster above. |
| | Excessive alcohol | **1%** | >21 units/week in the Commission's threshold. |
| **Late life** | Social isolation | **5%** | Large. Cross-reference **Domain M** — this is the same connection→health signal, here aimed at the brain. |
| | Air pollution | **3%** | Particulate (PM2.5) exposure. Lever is largely policy/where-you-live, partly personal (filtration). |
| | Untreated vision loss | **2%** | *New in 2024.* Treating cataracts / correcting vision is the candidate lever; the causal evidence is thinner than for hearing. |
| | **TOTAL** | **~45%** | The other **~55%** is non-modifiable / unknown (age, *APOE4* and other genetics, and causes not yet understood). |

### 1.2 How to read this table without lying to yourself

- **45% is a population counterfactual, not your personal odds.** It says "if every one of these factors
  were eliminated everywhere, dementia would be ~45% rarer." It does **not** say any individual who does
  everything right cuts their personal risk by 45%. (Honesty rule #1: predictor ≠ lever.)
- **Most of the 14 are predictors with only *indirect* or *observational* evidence of being levers.**
  The PAFs come from combining relative risks (mostly cohort/observational) with prevalence. The
  Commission is explicit that for most factors we have **association, not randomized proof of
  prevention.** The exceptions where we have *interventional* evidence are hearing (ACHIEVE, §2),
  multidomain lifestyle (FINGER, §3), and the vascular factors via cardiovascular RCTs (SPRINT-MIND, §1.3).
- **The factors cluster.** Hypertension, diabetes, LDL, obesity, inactivity and smoking are one
  intertwined vascular-metabolic syndrome. The practical takeaway is not 14 separate projects — it's the
  cardiovascular bundle, plus hearing, plus connection, plus head protection.
- **The Commission's own framing is the honest one:** these are *opportunities to reduce risk and delay
  onset at a population level*, not a recipe that makes any person dementia-proof. Delaying onset by a few
  years at population scale is itself enormous (it roughly halves prevalence) — but that is a public-health
  claim, not a personal warranty.

### 1.3 The strongest vascular evidence: SPRINT-MIND

The cleanest randomized evidence inside the vascular cluster is **SPRINT-MIND** (Williamson et al.,
*JAMA* 2019, `10.1001/jama.2018.21442`): in the SPRINT hypertension trial, intensive blood-pressure
control (target <120 mmHg systolic vs <140) **significantly reduced mild cognitive impairment (MCI) and
the combined MCI-or-dementia endpoint.** The dementia-alone endpoint missed significance (the trial
stopped early for cardiovascular benefit, leaving it underpowered for the rarer dementia outcome). This
is the best example in the field of a vascular lever moving a cognitive *outcome* in an RCT — and it
points the same direction as the PAF table: **treat midlife blood pressure.**

---

## 2. Hearing loss → cognition: the ACHIEVE trial (the field's best recent causal evidence)

Hearing loss is the **largest single modifiable factor (7%)** and, until recently, the obvious objection
was: *is it a cause, or just an early marker of the same neurodegeneration?* The observational signal was
strong — **Lin et al., *Arch Neurol* 2011** (`10.1001/archneurol.2010.362`) found incident dementia risk
rising with baseline hearing-loss severity (mild/moderate/severe → ~2×/3×/5× hazard) in the Baltimore
Longitudinal Study of Aging — but observation can't separate cause from marker.

**ACHIEVE** (Lin et al., *Lancet* 2023, `10.1016/S0140-6736(23)01406-X`) is the randomized test. 977
adults aged 70–84 with untreated mild-to-moderate hearing loss were randomized to a **hearing
intervention** (hearing aids + audiologic support) or a **health-education control**, with 3-year change
in global cognition as the primary endpoint.

**Read the result honestly — it has two layers:**
- **In the full cohort, the primary endpoint was null** — no significant difference in 3-year cognitive
  change between hearing intervention and control.
- **In the prespecified higher-risk subgroup** (the ~half recruited from the ARIC cardiovascular cohort —
  older, more vascular risk factors, faster baseline decline), the hearing intervention **slowed
  cognitive decline by ~48% over 3 years.** The healthier subgroup (recruited de novo) declined so little
  in 3 years that there was little to slow.

**The honest synthesis:** this is the **strongest causal evidence yet that treating hearing loss can
protect cognition** — but the benefit appears concentrated in people already at elevated risk, and the
headline-grabbing "48%" is a subgroup, not the primary result. It is reasonable, low-risk, and supported
to treat hearing loss to protect the brain (and it helps connection and quality of life regardless); it
is an overstatement to say "hearing aids prevent dementia" full-stop. `rct`, primary endpoint null,
positive in the at-risk subgroup.

---

## 3. Exercise & the brain: strong mechanism, modest (and mixed) outcomes

### 3.1 The mechanism is real

Aerobic exercise raises **brain-derived neurotrophic factor (BDNF)**, drives hippocampal angiogenesis and
neurogenesis (in animals), and **cardiorespiratory fitness is consistently associated with better
cognition and lower dementia risk** in cohorts. The landmark human imaging result is **Erickson et al.,
*PNAS* 2011** (`10.1073/pnas.1015950108`): a year of moderate aerobic exercise **increased hippocampal
volume ~2%** — effectively reversing one-to-two years of age-related shrinkage — and improved spatial
memory, with **BDNF as a mediator.** `rct` (imaging/surrogate outcome).

### 3.2 The outcomes are more modest than the mechanism implies

Here the honesty rules bite. Cohort evidence that fit, active people get less dementia is strong but
confounded (people who can exercise are healthier in many other ways, and *prodromal* dementia reduces
activity years before diagnosis — reverse causation). The **RCT** evidence that starting exercise
*prevents cognitive decline* is **mixed**: several well-run trials in older adults (e.g. large aerobic-
exercise RCTs in people with MCI) have shown **little-to-no benefit on cognitive test scores**, while
others and meta-analyses show small benefits, heavily dependent on population and outcome measure. The
defensible claim: **exercise is among the best bets for brain aging because it is the same lever as for
the heart, fitness predicts cognition strongly, and the mechanism is solid — but "exercise prevents
dementia" is not a settled RCT outcome.** `mechanistic`/`cohort` strong; `rct` outcome mixed.

### 3.3 FINGER: the multidomain proof of concept

The **FINGER trial** (Ngandu et al., *Lancet* 2015, `10.1016/S0140-6736(15)60461-5`) is the first RCT to
show a **multidomain lifestyle intervention can preserve cognition.** 1,260 at-risk older Finns (elevated
dementia risk, normal-to-slightly-impaired cognition) were randomized to a 2-year intervention bundling
**diet + exercise + cognitive training + vascular/metabolic monitoring** vs general health advice. The
intervention group's composite cognitive score improved **~25% more** than control. Caveats kept honest:
the outcome is **cognitive test performance, not dementia diagnosis**; the absolute difference is modest;
and the control group also got (lighter) advice. FINGER spawned the **World-Wide FINGERS** network now
replicating across dozens of countries — the results of which (e.g. US-POINTER, reported 2025) will tell
us whether the effect generalizes. This is the proof-of-concept that lifestyle, bundled, *can* move
cognition in a randomized design. `rct`, surrogate (cognition) outcome, modest effect.

---

## 4. Diet & the brain: MIND/Mediterranean — strong observation, null-ish RCT

The **MIND diet** (Mediterranean-DASH Intervention for Neurodegenerative Delay) was built by **Martha
Clare Morris** from observational data: **Morris et al., *Alzheimers Dement* 2015**
(`10.1016/j.jalz.2015.04.007`) found higher MIND adherence **associated with slower cognitive decline and
lower Alzheimer's risk** in the Rush Memory and Aging Project. Mediterranean-diet cohorts point the same
way.

Then the RCT arrived. **Barnes et al., *NEJM* 2023** (`10.1056/NEJMoa2302368`): 604 older adults at risk
were randomized to the **MIND diet vs a control diet**, both with mild caloric restriction, for 3 years.
**Both groups improved cognition; there was no significant between-group difference.** The honest reading
follows the schema's central rule: a strong *observational* signal did **not** survive randomization. Two
caveats keep it from being a clean "MIND diet doesn't work": both arms lost weight and improved (the
control wasn't a junk-food arm), and 3 years may be too short for a dietary effect on a slow disease. But
as it stands: **MIND/Mediterranean diet is a reasonable, heart-healthy pattern with a strong cohort signal
and a null RCT for cognition.** Don't sell it as proven brain protection. `cohort` supports; `rct` null
(between-group).

> **Cross-reference Domain I (sleep).** The fourth pillar of brain maintenance is sleep. The glymphatic
> system clears interstitial amyloid-β during slow-wave sleep (Xie et al., *Science* 2013; Shokri-Kojori
> et al., *PNAS* 2018 showed one sleepless night raises amyloid PET signal in humans) — but, per Domain I,
> "sleep increases amyloid clearance" is a **mechanism** (largely mouse + small human surrogate studies),
> **not** the outcome "sleep prevents Alzheimer's." Protect sleep because the mechanism is real and the
> downside is nil; don't oversell it as a proven dementia preventive. See `02-domains/I-sleep-circadian.md` §1.

---

## 5. Mental health as longevity, told honestly

### 5.1 Depression ↔ mortality

Depression is associated with **~1.5–2× higher all-cause mortality** across meta-analyses (mediated by
suicide, but also by cardiovascular disease, reduced self-care, and treatment non-adherence). It is also
a **bidirectional dementia factor** (Lancet PAF 3%): depression raises later dementia risk *and* is an
early symptom of incipient neurodegeneration — so some of the association is reverse-causal. The honest
grade: real and important, but causally tangled (cf. Domain M's treatment of psychosocial factors).
`cohort`/`meta`, observational.

### 5.2 Exercise for depression — a genuine lever

This is one of the cleaner *interventional* stories in mental health. **Noetel et al., *BMJ* 2024**
(`10.1136/bmj-2023-075847`), a network meta-analysis of 218 RCTs (~14,000 participants), found
**exercise is an effective treatment for depression** — walking/jogging, yoga, strength training, and
mixed aerobic all beneficial, with **larger effects at higher intensity**, and effect sizes that rival or
approach those of psychotherapy and medication in head-to-head arms. **The honest caveat the authors
themselves flag:** most included trials carry **high risk of bias**, and effects shrink (though stay
positive) in the lowest-bias studies. Still: exercise for depression is a real, RCT-supported lever with a
benefit profile most drugs would envy. `meta` (of RCTs), moderate-to-large effect, bias-caveated.

### 5.3 The limits of the serotonin story

The popular "depression is a chemical imbalance / serotonin deficiency" narrative is **not supported by
the evidence.** Moncrieff et al., *Mol Psychiatry* 2022/2023 (`10.1038/s41380-022-01661-0`), an umbrella
review, found **no consistent evidence that depression is caused by low serotonin.** Two things must be
held at once, honestly:
- This **undermines the marketing story** ("correct your serotonin"), which was always a simplification.
- It does **not** mean antidepressants don't work. SSRIs have **modest but real** RCT-proven efficacy
  (Cipriani et al., *Lancet* 2018, `10.1016/S0140-6736(17)32802-7`: all 21 antidepressants beat placebo,
  standardized mean difference ~0.30 — small-to-moderate, larger in severe depression). A drug can work
  without the folk-mechanism behind it being true. The mechanism story and the outcome are separate claims
  — exactly the schema's rule.

### 5.4 Diet for depression — one positive RCT, thin overall

The **SMILES trial** (Jacka et al., *BMC Medicine* 2017, `10.1186/s12916-017-0791-y`) randomized adults
with major depression to **dietary improvement (Mediterranean-style) vs social support**; the diet group
had significantly greater remission at 12 weeks. It's an encouraging **first RCT** for "food as
treatment," but it is **small (n=67), single, unblinded** (you can't blind a diet), and not yet
robustly replicated at scale. Promising, not settled. `rct` (small, single).

> **Cross-reference Domain M (social connection).** The largest, most replicated mortality effect in the
> entire corpus is **social connection** (Holt-Lunstad meta-analyses: stronger relationships → OR ~1.50
> survival, benchmarked as comparable to quitting smoking). It is also a Lancet dementia factor (social
> isolation, PAF 5%). Mental health, connection, and brain aging are the same substrate viewed three ways.
> See `02-domains/M-psychosocial-determinants.md`.

---

## 6. The honest hype check

This is the section the supplement aisle and the App Store don't want indexed.

### 6.1 The shingles-vaccine → dementia signal (striking, but grade it carefully)

A genuinely surprising recent finding: **shingles (herpes zoster) vaccination is associated with lower
dementia risk**, and — unusually for this field — some of the evidence is **quasi-experimental**, which is
much stronger than ordinary observation.

- **Eyting, Geldsetzer et al., *Nature* 2025** (`10.1038/s41586-025-08800-x`) — *the* result. Wales rolled
  out the live zoster vaccine (Zostavax) with a **strict date-of-birth eligibility cutoff** (born on/after
  2 Sept 1933 = eligible; just before = not). People on either side of that cutoff are essentially
  identical except for vaccine access — a **natural experiment / regression-discontinuity design** that
  approximates randomization. Result: being vaccinated **reduced new dementia diagnoses over 7 years by
  ~3.5 percentage points (a ~20% relative reduction)**, with a **stronger effect in women.** This is the
  most causally credible version of the signal because the eligibility cutoff is as-good-as-random.
- **Taquet et al., *Nature Medicine* 2024** (`10.1038/s41591-024-03201-5`) — the **recombinant** vaccine
  (Shingrix) was associated with **~17% more dementia-diagnosis-free time** over 6 years vs the older live
  vaccine, suggesting the newer, more immunogenic vaccine may carry a larger effect.
- **Replication:** Pomirchy, Geldsetzer et al., *Lancet Neurology* 2026 (`10.1016/S1474-4422(25)00455-7`)
  reproduced the natural-experiment finding in Canada.

**The honest tier:** this is **quasi-experimental, not a randomized prevention trial.** The natural-
experiment design makes it far stronger than typical observational data, and the replication is
reassuring, but residual confounding (the kind of person who gets vaccinated) cannot be fully excluded
and the mechanism (zoster reactivation → neuroinflammation? off-target immune training?) is not pinned
down. It is **one of the most interesting leads in dementia prevention**, worth flagging loudly and
grading carefully. `quasi-experimental` (natural experiment), striking, replicated, not RCT.

### 6.2 The amyloid-drug saga: lecanemab and donanemab — marginal benefit, real risk

The first anti-amyloid antibodies to win approval represent decades of the amyloid hypothesis finally
"working" — and a sobering lesson in **statistical vs clinical significance.**

**Lecanemab — CLARITY-AD** (van Dyck et al., *NEJM* 2023, `10.1056/NEJMoa2212948`): 1,795 people with
early Alzheimer's, lecanemab vs placebo over 18 months. On the CDR-SB scale (0–18, higher = worse),
decline was **1.21 with lecanemab vs 1.66 with placebo — a difference of −0.45 points (~27% slower
decline).**

Read it honestly:
- **The "27%" is a relative slowing of decline, not improvement.** Everyone still got worse; the drug
  group got worse slightly less slowly.
- **0.45 points on an 18-point scale is at or below most estimates of the minimal *clinically*
  important difference** — i.e., it's statistically real but likely **imperceptible to patients and
  families** over 18 months.
- **The risks are real:** amyloid-related imaging abnormalities — brain edema (**ARIA-E ~12.6%**) and
  microhemorrhage (**ARIA-H ~17.3%**) — plus infusion reactions, and **deaths in extension studies,
  especially in people on anticoagulants or with two *APOE4* alleles.** It requires biweekly infusions and
  serial MRI monitoring.
- **Donanemab** (TRAILBLAZER-ALZ 2, Sims et al., *JAMA* 2023, `10.1001/jama.2023.13239`) tells the same
  story: statistically significant slowing, marginal clinical size, similar ARIA risk.

**The honest verdict:** these are a scientific milestone (amyloid removal *does* modestly slow decline,
validating part of the hypothesis) and a **marginal clinical tool** — small benefit, meaningful risk and
burden, high cost. Not a cure, not "reversal," and nowhere near the prevention bundle in §1. `rct`,
statistically significant, clinically marginal, real harms.

### 6.3 Brain-training games: practice the task, not the brain

- **The ACTIVE trial** (Rebok et al., *JAGS* 2014, `10.1111/jgs.12607`) — the largest cognitive-training
  RCT — found that training in memory, reasoning, or speed-of-processing produced **durable gains in the
  *trained* ability at 10 years**, and (controversially) a later signal of reduced dementia risk in the
  speed-of-processing arm (Edwards et al. 2017). But **transfer to untrained abilities and everyday
  function was limited.**
- **Commercial brain-training (Lumosity, etc.):** the 2016 expert consensus (Simons et al., *Psychol Sci
  Public Interest* 2016, `10.1177/1529100616661983`) concluded there is **little evidence that brain games
  improve general cognition or real-world function** beyond getting better at the games themselves. In
  2016 the **US FTC fined Lumos Labs $2 million** for deceptive advertising claiming Lumosity could stave
  off dementia. Honest grade: **far transfer is weak**; you get good at the practiced task. `rct`/`meta` —
  near-transfer real, far-transfer weak.

### 6.4 Nootropics and "brain supplements": mostly mechanism-or-marketing

- **Lion's mane (*Hericium erinaceus*):** the most-cited human data is a tiny Japanese RCT (Mori et al.,
  *Phytother Res* 2009, `10.1002/ptr.2634`, n≈30 with MCI) showing **transient cognitive improvement that
  reversed after stopping** — small, short, single-site, never replicated at scale. Animal/mechanistic NGF
  data is interesting; human outcome data is thin. `rct` (tiny)/`mechanistic`.
- **Ginkgo biloba:** decisively tested. The **GEM study** (DeKosky et al., *JAMA* 2008,
  `10.1001/jama.2008.2470`), a large RCT (n≈3,000, ~6 years), found ginkgo **did not prevent dementia or
  cognitive decline.** A clean negative. `rct`, null.
- **Omega-3 for cognition:** RCTs for prevention of cognitive decline (e.g. VITAL-cognition) are
  largely **null** in well-nourished older adults, despite strong observational and mechanistic priors.
  `rct`, mostly null.
- **The pattern:** most "brain supplements" sit at `mechanistic`/`animal`/`nequals1`, occasionally a tiny
  short RCT — and where large RCTs exist (ginkgo, omega-3, most multivitamins), the cognitive-prevention
  result is **null**. This is the same predictor-vs-lever gap that defines the whole field, monetized.

---

## 7. The honest summary of this section

1. **The spine is the Lancet 14 factors (~45% PAF).** It is the most authoritative map of dementia
   prevention. But it is mostly an **observational/population** construct — a counterfactual about
   populations, not a personal guarantee, and for most factors we have association rather than randomized
   proof of prevention.
2. **The lever with the best causal evidence is hearing** (ACHIEVE), followed by **vascular control**
   (SPRINT-MIND) and **bundled lifestyle** (FINGER). All three are RCT-supported and all three point at
   the same unglamorous bundle: **treat hearing/vision, control blood pressure/LDL/glucose, move, don't
   smoke, stay connected, protect your head, protect your sleep.** What's good for the heart is good for
   the brain.
3. **Mental health is longevity.** Depression raises mortality and dementia risk; exercise is a genuine
   RCT-supported treatment for depression; the serotonin-deficiency story is a marketing simplification
   that's false *and* doesn't negate the modest real efficacy of antidepressants.
4. **The hype is concentrated and gradeable.** Nootropics and brain-training games are mostly `mechanistic`
   or marketing with null large RCTs; the amyloid antibodies are a real but **clinically marginal,
   risk-laden** milestone; and the most genuinely exciting *new* lead — the shingles-vaccine signal — is
   striking precisely because it's **quasi-experimental and replicated**, which is rare in this field. Flag
   it loudly, grade it as the natural experiment it is.

---

## Go deeper

A short, honestly-annotated reading list. Grades flag where a source is observational, marginal, or
thinner than its visibility suggests.

1. **Livingston et al. — *Dementia prevention, intervention, and care: 2024 report of the Lancet standing
   Commission*** (*Lancet* 2024, `10.1016/S0140-6736(24)01296-0`; and the 2020 report,
   `10.1016/S0140-6736(20)30367-6`). **The single most important source in the section.** The 14 modifiable
   factors and the ~45% PAF. Read the Commission's own caveats — it is careful that these are population
   opportunities and mostly observational. **Tier: meta / expert commission — authoritative, but the PAFs
   rest largely on observational risk estimates.**
2. **Lin et al. — ACHIEVE** (*Lancet* 2023, `10.1016/S0140-6736(23)01406-X`). The best recent *causal*
   evidence that a single factor (hearing) is a lever, not just a marker. Read the **primary endpoint
   (null overall)** alongside the **at-risk subgroup (~48% slower decline)** — the nuance is the point.
   **Tier: rct — strong, with a subgroup caveat.**
3. **Ngandu et al. — FINGER** (*Lancet* 2015, `10.1016/S0140-6736(15)60461-5`). The proof-of-concept RCT
   that bundled lifestyle can preserve cognition; gateway to the World-Wide FINGERS network. Pair with
   **Williamson et al. — SPRINT-MIND** (*JAMA* 2019, `10.1001/jama.2018.21442`) for the vascular RCT.
   **Tier: rct — modest, surrogate (cognition) outcome.**
4. **Eyting, Geldsetzer et al. — *A natural experiment on the effect of herpes zoster vaccination on
   dementia*** (*Nature* 2025, `10.1038/s41586-025-08800-x`). The most interesting recent lead, and a
   model of how a **natural experiment** can approximate an RCT where a real trial is infeasible. Pair with
   **Taquet et al.** (recombinant vaccine, *Nat Med* 2024, `10.1038/s41591-024-03201-5`). **Tier:
   quasi-experimental — much stronger than typical observation; not a randomized prevention trial.**
5. **van Dyck et al. — Lecanemab (CLARITY-AD)** (*NEJM* 2023, `10.1056/NEJMoa2212948`). Read it to
   calibrate **statistical vs clinical significance** and benefit-vs-risk in the amyloid antibodies. Pair
   with the donanemab trial (Sims et al., *JAMA* 2023, `10.1001/jama.2023.13239`). **Tier: rct —
   statistically significant, clinically marginal, real harms (ARIA).**
6. **Noetel et al. — *Effect of exercise for depression*** (*BMJ* 2024, `10.1136/bmj-2023-075847`). The
   best current synthesis that exercise is a real treatment for depression — read *with* the authors'
   own risk-of-bias caveat. Pair with **Moncrieff et al.** (serotonin umbrella review, *Mol Psychiatry*
   2022, `10.1038/s41380-022-01661-0`) and **Cipriani et al.** (antidepressant network meta, *Lancet*
   2018, `10.1016/S0140-6736(17)32802-7`) to hold the mechanism story and the outcome apart honestly.
   **Tier: meta of RCTs — moderate effect, bias-caveated.**

---

## Cross-links

- **SIDEWAYS:** sleep / glymphatic amyloid clearance ↔ **Domain I** (`I-sleep-circadian.md` §1); social
  connection, loneliness, purpose ↔ **Domain M** (`M-psychosocial-determinants.md`); exercise dose-response
  & cardiorespiratory fitness ↔ **Domain E** (`E-exercise.md`) and Section 02 (training); vascular/metabolic
  factors (BP, LDL, glucose) ↔ **Domains D/L** (nutrition, biomarkers); diet patterns (MIND/Mediterranean)
  ↔ Section 03 (nutrition & supplements).
- **UP to canon:** neuroinflammation, redox & HPA-axis signaling, cell-water/interstitial-fluid physics
  (glymphatic), BDNF/neurotrophin signaling → `bucket-canon/05-biophysics/`. The brain is the
  outcome-layer application of these foundations.

## Gaps flagged for next wave

US-POINTER and the rest of World-Wide FINGERS (does FINGER generalize beyond Finland?); whether treating
*vision* loss moves cognition (the new 2024 factor has the thinnest causal evidence); the mechanism behind
the shingles-vaccine signal (and whether a deliberate RCT is ethical/feasible now); *APOE4*-stratified
prevention (the non-modifiable majority of risk); long-term real-world outcomes of the amyloid antibodies
beyond 18 months; head-to-head exercise-vs-medication-vs-therapy for depression in low-bias trials; and the
sleep→dementia question at the level of human *outcomes* rather than amyloid surrogates.
