# 20 — Mental Health & Psychiatry

> **Status:** v0.1 — 2026-06-28. The clinical-psychiatry section of the manual. Fills a standing gap:
> mental health appears across the corpus as a *longevity factor* (Section 08 §5: depression↔mortality,
> exercise-as-treatment, the serotonin debunk; Section 14 §7: the obsolete "chemical imbalance" model),
> but the **psychiatric conditions themselves** — what they are, how common they are, what actually
> treats them, and how honest the evidence is — were never mapped. This section is that map.
> **Companion data:** `02-domains/mentalhealth-claims.json` (this section's graded claims).
> **Cross-references** — and deliberately does **not duplicate** — **Section 08** (`08-brain-cognitive.md`
> §5: depression & mortality, exercise meta-analysis, the serotonin-deficiency umbrella review,
> Cipriani's antidepressant network meta) and **Section 14** (`14-nervous-system.md` §3, §7:
> neurotransmitters-aren't-feelings, the dopamine-detox debunk, the circuit-not-chemical model of mood).
> Read those first for the mechanism layer; this section is the **conditions-and-treatments** layer.
>
> *Graded per the manual's evidence tiers; the three honesty rules — predictor ≠ lever, cohort ≠ RCT, something beats nothing — are defined up front in "Start Here."*

> **A word on tone.** This is the one section where getting the evidence-grading right has a body count.
> Underselling treatment talks people out of care that would help them; overselling it sets up
> disillusionment that talks them out of care *next* time. Psychiatric conditions are **real medical
> conditions**, not character flaws or marketing inventions — *and* the field's evidence is genuinely
> messier than either its boosters or its critics admit. Both things are true. The compassionate move and
> the honest move are the same move: grade it straight, and say so plainly.

---

## 0. The map at a glance

| Condition | ~Lifetime prevalence (approx.) | First-line, best-evidenced treatment | The honest caveat |
|---|---|---|---|
| **Major depression** | ~15–20% | Psychotherapy (CBT/IPT) and/or antidepressant; **exercise** as real adjunct | Drug-vs-placebo gap is **modest on average, larger in severe** depression; the "chemical imbalance" story is false but the drugs still modestly work |
| **Generalized anxiety / panic / phobias** | ~20–30% (anxiety disorders combined) | **CBT with exposure** (first-line); SSRIs/SNRIs | Avoidance is the engine; benzodiazepines relieve fast but are a trap for chronic use |
| **OCD** | ~2–3% | **Exposure & response prevention (ERP)** + SSRI (often higher doses) | Generic "talk therapy" doesn't work; it must be ERP. Real but partial response is the norm |
| **PTSD** | ~6–8% | **Trauma-focused psychotherapy** (TF-CBT, CPT, PE) first-line | EMDR works but the "eye movements" are likely inert; MDMA-therapy is promising-but-**not FDA-approved** (rejected 2024) |
| **Bipolar disorder** | ~1–2% (BP-I + BP-II) | **Lithium** (mood-stabilizer; uniquely anti-suicide) | Under-prescribed; antidepressants alone can destabilize; it is a *spectrum*, often misdiagnosed as unipolar depression for years |
| **Schizophrenia / psychosis** | ~0.7–1% | **Antipsychotics** + early intervention + psychosocial support | Antipsychotics genuinely work for positive symptoms but carry serious **metabolic** harms; clozapine is best-and-underused |
| **ADHD** | ~5% children, ~2.5–4% adults | **Stimulants** (largest effect size in psychiatry) | A real, heritable condition — *and* genuinely over- and under-diagnosed depending on the setting; adult self-diagnosis needs care |
| **Eating disorders** (anorexia, bulimia, BED) | ~1–4% combined | **Family-based therapy** (adolescent AN), **CBT-E** (bulimia/BED) | **Anorexia has among the highest mortality of any psychiatric illness**; early intervention matters most |

Prevalence figures are order-of-magnitude (they vary widely by country, diagnostic edition, and survey
method). They are here to convey *scale*, not precision.

@@FIG:DX1-psychiatric@@

---

## 1. Depression — the honest centre of gravity

Section 08 §5 already covers depression's link to mortality and dementia, the **exercise** meta-analysis
(Noetel et al., *BMJ* 2024, `10.1136/bmj-2023-075847`), and the **serotonin-deficiency umbrella review**
(Moncrieff et al., *Mol Psychiatry* 2022, `10.1038/s41380-022-01661-0`). This section adds the part 08
left out: **what major depression *is*, and the full honest picture of what treats it.**

### 1.1 What it is

**Major depressive disorder (MDD)** is not "sadness." It is a syndrome of persistent low mood and/or loss
of interest/pleasure (anhedonia) lasting ≥2 weeks, plus a cluster of changes in sleep, appetite, energy,
concentration, self-worth, and — critically — recurrent thoughts of death or suicide. It impairs
function. Lifetime prevalence is roughly **15–20%**, with about a 2:1 female:male ratio in diagnosis. It
is **recurrent** in most people who have one episode, and it is one of the leading causes of disability
worldwide (GBD studies consistently rank it near the top).

### 1.2 The chemical-imbalance myth — said cleanly

The story most people absorbed — *depression is a chemical imbalance, specifically too little serotonin,
and antidepressants top it back up* — **is not supported by the evidence.** Moncrieff et al.'s umbrella
review (08 §5.3, 14 §3.2) found no consistent evidence that depression is caused by low serotonin. The
honest reframing the field now holds (Section 14 §7): mood disorders are **distributed circuit
dysfunction** — prefrontal-limbic networks, stress/HPA-axis and neuroplasticity changes, inflammation,
genetics, and environment — **not a single low chemical.**

Two things must be held at once, and the temptation is always to drop one of them:
- The **marketing mechanism is false.** This matters morally, because a generation was told a story about
  their own brains that wasn't true, and some organized their identity around it.
- **It does not follow that the treatments don't work.** This is honesty rule #1. The mechanism story and
  the outcome are *separate claims*. Antidepressants have modest, real, RCT-proven efficacy regardless of
  why.

### 1.3 What actually works — graded

**Psychotherapy.** Cognitive behavioral therapy (CBT) and interpersonal therapy (IPT) are first-line,
evidence-based treatments for depression with effect sizes broadly comparable to medication for mild-to-
moderate illness, and better durability after stopping (the skills persist; a pill's effect ends when you
stop the pill). Cuijpers and colleagues' large body of meta-analytic work is the anchor here — with the
honest footnote that psychotherapy trials are also inflated by publication bias and unblindable
conditions, so the *true* effect is somewhat smaller than the raw literature suggests, but still real.
`meta` of RCTs.

**Medication — the Cipriani result, honestly.** The single most important modern source is **Cipriani et
al., *Lancet* 2018** (`10.1016/S0140-6736(17)32802-7`, PMID 29477251): a network meta-analysis of **522
trials, ~116,000 patients, all 21 antidepressants.** Headline: **all 21 beat placebo** for acute MDD in
adults. The honest reading of the *size*: the pooled standardized mean difference was about **0.30** — a
**small-to-moderate** effect. That number is the crux of the entire antidepressant debate:
- To boosters, "all 21 beat placebo" is vindication.
- To critics, "SMD ~0.30" is barely above the ~0.2 threshold often cited as a minimal clinically
  perceptible difference, and a chunk of even that may be unblinding (patients guess they're on the drug
  from side effects and report accordingly).
- **The reconciling fact is severity.** The drug-placebo gap is **smallest in mild depression and largest
  in severe depression** — the pattern reported by Fournier et al. (*JAMA* 2010, `10.1001/jama.2009.1943`)
  and broadly consistent since. This is honesty rule #2 in action: the average effect is modest, but the
  average hides the people for whom it is decisive.

@@FIG:D07-antidepressant-severity@@

**The Kirsch placebo debate.** Irving Kirsch's "*The Emperor's New Drugs*" (Kirsch et al., *PLoS Medicine*
2008, `10.1371/journal.pmed.0050045`) used FDA trial data — including unpublished negative trials — to
argue that the antidepressant-placebo difference falls below clinical significance for all but the most
severe depression, and that much of the apparent benefit is a **large placebo response** plus publication
bias. The lasting contribution is **not** "antidepressants are fake" (Cipriani's later, larger, all-trials
analysis still finds a real drug effect) — it is two permanent corrections: **(1)** the placebo response in
depression is genuinely large, and **(2)** publication bias systematically inflated the published record
until regulators forced trial registration. Both critiques were right and improved the field; the strong
version ("they don't work") overshoots the data. `meta` — contested, severity-dependent.

**Exercise** (cross-ref 08 §5.2): a genuine, RCT-supported treatment for depression (Noetel *BMJ* 2024),
with effect sizes that rival therapy and medication in head-to-head arms — caveated by high risk of bias
in the included trials. The most under-prescribed effective treatment in the field. `meta`.

**Severe / treatment-resistant depression.** When depression is severe, psychotic, or hasn't responded to
trials of medication + therapy, the picture changes and the heavy tools earn their place:
- **ECT (electroconvulsive therapy)** remains, for severe and especially psychotic or catatonic
  depression, **one of the most effective treatments in all of medicine** (remission rates well above
  drugs), unfairly stigmatized by its history and its cinematic depiction; modern ECT is done under
  anaesthesia with muscle relaxant. Memory side effects are real and usually transient. `meta`/`rct`.
- **Ketamine / esketamine** produces rapid (hours) antidepressant and anti-suicidal effects in treatment-
  resistant depression — a genuine mechanistic departure (glutamatergic, not monoaminergic). Honest
  caveats: effects can be **transient**, the long-term safety and abuse-liability profile is still being
  worked out, and the field is awash in poorly-regulated for-profit ketamine clinics overselling it.
  `rct` — real, rapid, durability uncertain.

### 1.4 The honest synthesis for depression

Depression is real and serious; the serotonin story sold to explain it is false; therapy and medication
both **modestly** beat placebo on average, with the benefit **concentrated in more severe illness**;
exercise is a genuine and under-used lever; and for the severe end, ECT and ketamine are powerful tools
the public badly misjudges. The defensible message is neither "just take the pill" nor "the pills are a
scam" — it is **"treatment helps, more so the sicker you are, and the best plan is usually combined and
includes the free levers."**

---

## 2. Anxiety disorders — where therapy clearly leads

### 2.1 What they are

Anxiety disorders are the **most common** psychiatric conditions (combined lifetime prevalence ~20–30%).
The family shares one engine — **avoidance** — across several presentations:
- **Generalized anxiety disorder (GAD):** chronic, free-floating worry across many domains.
- **Panic disorder:** recurrent panic attacks (surges of physical terror) plus fear of the next one;
  often agoraphobic avoidance follows.
- **Specific & social phobias:** intense fear of a specific object/situation, or of scrutiny/judgment.
- **OCD** (now classified separately from anxiety disorders in DSM-5, but mechanistically related — §2.4).

The unifying mechanism: anxiety drives **avoidance**, avoidance brings short-term relief, and that relief
**reinforces** the avoidance — so the fear is never disconfirmed and the disorder is *maintained* by the
very behaviour that feels protective. This is why the treatment is what it is.

### 2.2 What works — CBT and exposure, first-line

**Cognitive behavioral therapy with exposure** is the first-line, best-evidenced treatment for anxiety
disorders — the meta-analytic anchor is **Carpenter, Hofmann et al., *Depression & Anxiety* 2018**
(`10.1002/da.22728`, PMID 29451967), confirming CBT's efficacy across GAD, panic, social anxiety, and
related disorders versus placebo. Exposure therapy works by the inverse of the maintaining mechanism:
**deliberately, gradually approaching the feared thing without the safety behaviour**, until the
prediction ("this will be catastrophic") is disconfirmed and the fear extinguishes. It is one of the more
mechanistically coherent treatments in psychiatry — the therapy directly reverses the thing that
maintains the disorder. `meta` of RCTs.

**Medication.** SSRIs and SNRIs are effective and first-line pharmacotherapy for most anxiety disorders,
roughly comparable to CBT in the short term, with CBT showing better durability after discontinuation.
Combination is common. `meta`/`rct`.

### 2.3 The honest take — benzodiazepines

**Benzodiazepines** (alprazolam, lorazepam, diazepam, clonazepam) relieve acute anxiety **fast and
reliably** — which is exactly the trap. For chronic anxiety they are a poor long-term strategy: tolerance,
dependence, withdrawal (which mimics and worsens anxiety), cognitive impairment, fall/accident risk
(especially in older adults), and — used as a safety behaviour — they can **undermine exposure therapy**
by short-circuiting the disconfirmation that makes it work. They have a legitimate role (short-term,
crisis, specific situations) and a large illegitimate one (chronic daily use). `rct`/`clinical` — effective
acutely, harmful chronically.

### 2.4 OCD — the specific case

**Obsessive-compulsive disorder** (~2–3% lifetime) is intrusive, distressing thoughts (obsessions) plus
repetitive acts or mental rituals (compulsions) performed to neutralize them. The crucial honest point:
**generic talk therapy does not treat OCD** — the specific, effective psychotherapy is **Exposure and
Response Prevention (ERP)**, in which the person is exposed to the trigger and *prevented from performing
the compulsion*, breaking the obsession→ritual→relief cycle. SSRIs help too, often at **higher doses and
longer trials** than for depression. Even with best treatment, response is frequently **partial** — OCD is
genuinely hard, and managing that expectation is part of treating it honestly. `meta`/`rct`.

---

## 3. Bipolar disorder — the lithium story, told straight

### 3.1 What it is, and the spectrum

**Bipolar disorder** is recurrent episodes of **mania/hypomania** (elevated/irritable mood, decreased
need for sleep, grandiosity, racing thoughts, risky behaviour) interleaved with depression. It is a
**spectrum**, not a binary:
- **Bipolar I:** at least one full manic episode (often with psychosis or hospitalization).
- **Bipolar II:** hypomania (milder, no psychosis) plus major depression — frequently **misdiagnosed as
  unipolar depression for years**, because patients present in the depressed phase and don't report
  hypomania as a problem.

Combined prevalence is roughly **1–2%.** The diagnostic-delay problem is a real clinical harm: bipolar
depression treated with an antidepressant **alone** (no mood stabilizer) can precipitate a switch into
mania or rapid cycling. Getting the diagnosis right *is* part of the treatment.

### 3.2 Lithium — underused, and uniquely anti-suicide

**Lithium** is the oldest mood stabilizer and, by a wide margin, the best-evidenced — and it is
**chronically under-prescribed**, displaced by newer, heavily-marketed (and patent-protected) agents
despite weaker evidence. Two facts make lithium exceptional:
- **It is the most effective long-term mood stabilizer** for relapse prevention in bipolar disorder
  (maintenance trials and meta-analyses; the BALANCE trial, Geddes et al., *Lancet* 2010,
  `10.1016/S0140-6736(09)61828-6`, supports lithium-containing maintenance).
- **It uniquely reduces suicide.** **Cipriani et al., *BMJ* 2013** (`10.1136/bmj.f3646`, PMID 23814104) —
  a systematic review and meta-analysis — found lithium **reduces the risk of suicide and of all-cause
  mortality** in people with mood disorders versus placebo. This is a rare and precious thing in
  psychiatry: a treatment with a **direct anti-suicide signal**, an effect that appears partly
  *independent* of its mood-stabilizing action. `meta` of RCTs.

@@FIG:D21-lithium-suicide@@

The honest caveats keep lithium from being a free lunch: it has a **narrow therapeutic window** (needs
blood-level monitoring), affects **thyroid and kidney** over years (also needs monitoring), and is
dangerous in overdose. But these are *manageable* with standard monitoring — and they do not justify how
far it has fallen out of fashion. The honest verdict: **lithium is one of psychiatry's most valuable
drugs, it is under-used, and its anti-suicide effect is one of the field's most important findings.**

---

## 4. Schizophrenia & psychosis — antipsychotics, graded honestly

### 4.1 What it is

**Schizophrenia** (~0.7–1% lifetime) is a chronic disorder of **positive symptoms** (hallucinations,
delusions, disorganized thought/speech), **negative symptoms** (flat affect, avolition, social
withdrawal), and **cognitive impairment**. "Psychosis" is the broader phenomenon (loss of contact with
reality) that also appears in bipolar mania, severe depression, drug states, and delirium. Onset is
typically late teens to twenties. The negative and cognitive symptoms — not the dramatic positive ones —
drive most of the long-term disability.

### 4.2 Antipsychotics — they work, and they cost

The honest two-sided ledger, anchored by **Leucht et al., *Lancet* 2013** (`10.1016/S0140-6736(13)60733-3`,
PMID 23810019), a multiple-treatments meta-analysis of **15 antipsychotics across 212 trials, ~43,000
patients**:
- **They genuinely work** for positive symptoms and for relapse prevention — all 15 beat placebo, with
  meaningful effect sizes. For acute psychosis, antipsychotics are not optional folk medicine; they are
  effective and, often, life-stabilizing. `meta` of RCTs.
- **The cost is real and metabolic.** The second-generation ("atypical") antipsychotics, especially
  **olanzapine and clozapine**, cause substantial **weight gain, dyslipidemia, insulin resistance, and
  type-2 diabetes** — driving the **15–20-year reduced life expectancy** seen in serious mental illness,
  much of it cardiometabolic. Older "typical" agents cause more movement disorders (extrapyramidal
  effects, tardive dyskinesia). There is no free antipsychotic; the choice is a trade between symptom
  control and a specific harm profile, and the metabolic harms demand active monitoring. `meta`/`cohort`.

@@FIG:D18-antipsychotics@@

**Clozapine** is the most effective antipsychotic for treatment-resistant schizophrenia (Leucht's data
support this) and is **under-used** because it requires regular blood monitoring (risk of agranulocytosis)
— the same pattern as lithium: the best drug, hampered by a monitoring burden that scares prescribers more
than it should.

### 4.3 Early intervention

The strongest *systems-level* finding is that **early intervention matters.** **Duration of untreated
psychosis (DUP)** — the lag between symptom onset and treatment — predicts worse outcomes, and
specialized early-intervention services improve them. The **RAISE-ETP trial** (Kane et al., *Am J
Psychiatry* 2016, `10.1176/appi.ajp.2015.15050632`) showed that a coordinated specialty-care package
(medication + family education + supported employment/education + therapy) for **first-episode psychosis**
improved quality of life and symptoms versus usual care, with **greater benefit the shorter the DUP.**
The lever is not just the drug — it is **catching it early and wrapping psychosocial support around it.**
`rct`.

---

## 5. ADHD — a real condition, honestly bounded

### 5.1 What it is, and that it is real

**Attention-deficit/hyperactivity disorder** is a neurodevelopmental condition — persistent inattention
and/or hyperactivity-impulsivity that begins in childhood and impairs function across settings. It is one
of the **most heritable** psychiatric conditions (twin-study heritability ~70–80%), associated with
measurable differences in brain development and function. The reflexive skepticism ("ADHD isn't real, kids
are just kids / adults just want stimulants") is **wrong**: untreated ADHD carries real costs — academic
failure, accidents, substance use, unemployment, and elevated mortality. It is a real condition.

### 5.2 Stimulants — the largest effect size in psychiatry

**Stimulant medications** (methylphenidate, amphetamines) are the first-line treatment and have **one of
the largest effect sizes of any psychiatric drug class.** The anchor is **Cortese et al., *Lancet
Psychiatry* 2018** (`10.1016/S2215-0366(18)30269-4`, PMID 30097390), a network meta-analysis of ADHD
medications in children and adults: **methylphenidate** was the preferred first choice in children/
adolescents and **amphetamines** in adults, both clearly beating placebo, with non-stimulants
(atomoxetine, guanfacine) as effective second-line options. Treatment improves core symptoms and, in
observational data, is associated with **reduced accidents, injuries, and other harms.** `meta` of RCTs.

### 5.3 The honest nuance — over- and under-diagnosis, and adult ADHD

ADHD is a real condition that is **also genuinely over-diagnosed in some settings and under-diagnosed in
others** — both at once, which is what makes the discourse so confused:
- **Over-diagnosis** drivers: the youngest children in a school year are diagnosed more often than their
  older classmates (the "relative age effect" — normal immaturity read as pathology); diagnostic
  thresholds applied loosely; and a culture that pathologizes ordinary distractibility in a high-
  stimulation environment.
- **Under-diagnosis** drivers: girls and women (less hyperactive, more inattentive presentation,
  historically missed), and adults whose childhood ADHD was never caught.
- **Adult ADHD and self-diagnosis** deserve particular care. Adult ADHD is real and was historically
  under-treated — *but* the symptoms (distractibility, restlessness, difficulty focusing) are **non-
  specific** and overlap heavily with anxiety, depression, poor sleep, and simply living inside an
  attention-fragmenting media environment. A social-media-driven wave of self-diagnosis is real; some of
  it is genuine recognition of a missed condition, and some of it is normal modern distraction relabeled.
  The honest position: **take adult ADHD seriously, assess it properly (history of childhood onset,
  cross-setting impairment, rule out mimics), and resist both the dismissive and the credulous reflex.**
  `clinical`/`cohort`.

---

## 6. PTSD & trauma — therapy first, and the psychedelic frontier

### 6.1 What it is

**Post-traumatic stress disorder** (~6–8% lifetime) follows exposure to actual/threatened death, serious
injury, or violence, and is defined by four symptom clusters: **intrusion** (flashbacks, nightmares),
**avoidance** (of reminders), **negative alterations in cognition/mood**, and **hyperarousal**
(hypervigilance, startle, sleep disruption). Most people exposed to trauma do **not** develop PTSD; the
disorder is the *failure of normal recovery*, and that framing matters for treatment.

### 6.2 Trauma-focused psychotherapy — first-line

The first-line, best-evidenced treatments are **trauma-focused psychotherapies** that process the memory
rather than avoid it: **Prolonged Exposure (PE)**, **Cognitive Processing Therapy (CPT)**, and
**trauma-focused CBT.** Guideline bodies (APA, NICE, VA/DoD) converge on these as first-line, ahead of
medication. SSRIs (sertraline, paroxetine) have a real but **more modest** role and are second-line for
most. The mechanism mirrors anxiety treatment: PTSD is maintained by avoidance, and the effective
therapies work by **approaching and processing** the traumatic memory in safety. `meta`/`rct`.

### 6.3 The honest EMDR debate

**Eye Movement Desensitization and Reprocessing (EMDR)** is an effective treatment for PTSD — guidelines
endorse it, and it outperforms waitlist/placebo. The honest controversy is about **why** it works. EMDR
pairs trauma recall with bilateral stimulation (the therapist's finger moving side to side, tracked by the
patient's eyes). **Dismantling studies — which compare EMDR with and without the eye movements — largely
find the eye movements add little or nothing**; the active ingredient appears to be the **exposure** (the
structured, repeated recall of the trauma), not the signature eye movements. So the honest verdict: **EMDR
works, but probably because it is a form of exposure therapy with an elaborate and likely-inert ritual
attached.** This is honesty rule #1 again — the treatment is real, the proprietary mechanism is doubtful.
`meta`/`rct` — efficacy real, mechanism contested.

### 6.4 The psychedelic-therapy frontier — promising, early, and not approved

This is the live frontier, and it is where the gap between *headline* and *evidence* is widest, so it
needs grading with particular care.

- **MDMA-assisted therapy for PTSD.** The MAPS/Lykos phase-3 program produced striking results: **Mitchell
  et al., *Nature Medicine* 2021** (MAPP1, `10.1038/s41591-021-01336-3`, PMID 33972795) and the
  confirmatory **Mitchell et al., *Nature Medicine* 2023** (MAPP2) reported large reductions in PTSD
  severity, with substantial fractions of participants **no longer meeting PTSD criteria** after a few
  MDMA-assisted sessions — effects larger than typical drug trials. **But the honest, load-bearing fact:
  the FDA *rejected* the application in August 2024**, declining to approve MDMA-assisted therapy and
  requesting an **additional phase-3 trial.** The concerns were real and methodological: **functional
  unblinding** (almost everyone knows whether they got MDMA, which inflates expectancy effects in a
  therapy-heavy trial), questions about trial conduct and data integrity, and unresolved abuse-liability
  and cardiovascular safety. So: **genuinely promising, plausibly transformative for a hard-to-treat
  condition — and not an approved, available treatment, with a regulator explicitly saying the evidence is
  not yet sufficient.** `rct` — promising, **unblinding-confounded, not approved**.

@@FIG:D20-mdma-ptsd@@

- **Psilocybin for depression** (adjacent, cross-ref §1): **Carhart-Harris et al., *NEJM* 2021**
  (`10.1056/NEJMoa2032994`, PMID 33852780) compared psilocybin-assisted therapy with escitalopram for
  depression; psilocybin was **not statistically superior** on the primary endpoint, though several
  secondary measures favored it. Promising signal, **not** a demonstrated knockout, **early.** FDA has
  granted "breakthrough therapy" designations (a status about review speed, **not** evidence of efficacy)
  but **has not approved** psychedelic therapies. `rct` — early, primary endpoint not met.

The whole frontier shares one structural problem the corpus should flag loudly: **you cannot blind a
psychedelic trial.** Participants know whether they're tripping, expectancy effects are enormous,
enthusiastic believers run the trials, and the therapy wrapped around the drug is itself an active and
unstandardized treatment. None of that means the effects are fake — the signals are large and the unmet
need is severe — but it means the evidence tier is **lower than the excitement implies**, and the honest
word is **"promising and unproven,"** not "psychedelics cure trauma."

---

## 7. Eating disorders — the highest-mortality psychiatric illnesses

### 7.1 What they are, and why they are dangerous

- **Anorexia nervosa:** restriction of intake → significantly low body weight, intense fear of weight gain,
  and a distorted body image. It is, by mortality, **among the most lethal of all psychiatric disorders.**
  **Arcelus et al., *Archives of General Psychiatry* 2011** (`10.1001/archgenpsychiatry.2011.74`, PMID
  21727255), a meta-analysis of 36 studies, found a **standardized mortality ratio of ~5–6 for anorexia
  nervosa** — roughly **five to six times** the expected death rate — from both medical complications
  (cardiac, electrolyte) and a high suicide rate. This single fact should reframe eating disorders from
  "lifestyle/vanity" problems (the cultural misread) to the **serious, sometimes fatal medical illnesses**
  they are. `meta`/`cohort`.

@@FIG:D19-anorexia-smr@@

- **Bulimia nervosa:** binge eating followed by compensatory purging (vomiting, laxatives, excessive
  exercise); often normal weight, which is why it hides. Carries serious medical risks (electrolyte
  disturbance, cardiac).
- **Binge-eating disorder (BED):** recurrent binges **without** compensatory purging; the **most common**
  eating disorder, strongly associated with obesity and its sequelae.

### 7.2 What helps

- **Adolescent anorexia → Family-Based Treatment (FBT, "the Maudsley approach").** FBT — which empowers
  parents to take charge of refeeding rather than locating the problem inside the adolescent — is the
  **best-evidenced** treatment for adolescent AN, outperforming individual therapy for this group (Lock,
  Le Grange, and colleagues' RCTs). Weight restoration is the foundation; you cannot therapy your way out
  of starvation while still starving. `rct`.
- **Bulimia and BED → CBT-E (enhanced cognitive behavioral therapy)**, developed by **Christopher
  Fairburn**, is first-line and effective. For **BED specifically**, the stimulant **lisdexamfetamine** is
  FDA-approved and reduces binge frequency. SSRIs (especially fluoxetine) help bulimia. `rct`/`meta`.
- **Anorexia in adults** remains genuinely hard — no single treatment dominates, and relapse is common —
  which makes the one robust finding all the more important: **early intervention and weight restoration
  improve outcomes**, and delay worsens them. `clinical`.

The honest throughline: eating disorders are **dangerous medical illnesses**, anorexia especially;
**early, weight-focused, family-involved treatment** is the strongest lever; and the cultural tendency to
treat them as vanity or willpower problems is both wrong and lethal.

---

## 8. The evidence-based lifestyle foundation (and the honest debunks)

This is the floor under everything above — cross-referenced rather than re-derived, because the corpus
already grades each lever in depth. The point here is that they **converge** on mental health, and that
the wellness industry sells a **distorted** version of them.

### 8.1 What genuinely helps (all cross-referenced)

- **Exercise** — a real RCT-supported treatment for depression (Noetel *BMJ* 2024; 08 §5.2), and broadly
  protective against anxiety. The single most under-prescribed effective intervention. (Domain E, 08 §3.)
- **Sleep** — bidirectional with nearly every psychiatric condition: poor sleep is both a *symptom* and a
  *driver* of depression, anxiety, mania (sleep loss can trigger mania in bipolar), and psychosis. Treating
  insomnia (CBT-I is first-line, not sleeping pills) **improves mental health outcomes**, not just sleep.
  (Domain I; 05 recovery/sleep.) `meta`.
- **Social connection** — the largest, most replicated mortality signal in the entire corpus (Holt-Lunstad;
  Domain M; 08 §5), and a powerful buffer against depression and a protective factor against suicide.
  Loneliness is a mental-health risk factor in its own right.
- **Sunlight / circadian regularity** — bright light is an evidence-based treatment for **seasonal**
  depression and an adjunct in non-seasonal depression; regular light/dark and sleep/wake timing stabilizes
  mood, and is part of standard bipolar self-management. (Domain I; 09 exposures.) `rct` (seasonal).
- **Not self-medicating with alcohol** — alcohol is a depressant, worsens sleep architecture, raises
  anxiety on the rebound, and is a major suicide risk multiplier. "Taking the edge off" nightly is one of
  the most common and most counterproductive lay treatments for anxiety and low mood.

These are **the floor, not the ceiling.** They are not a substitute for treating serious mental illness —
telling someone with melancholic depression or first-episode psychosis to "just exercise and get sunlight"
is its own kind of harm. But they are real, free, side-effect-light, and systematically under-used.

### 8.2 The honest debunks

- **Most supplements for mood are not supported.** The supplement aisle sells "natural" mood fixes that
  mostly sit at `mechanistic`/`anecdotal`. The honest exceptions and near-misses: **omega-3 (EPA-
  predominant)** has a modest signal as an *adjunct* in depression in some meta-analyses (mixed, not
  settled); **St John's Wort** has real efficacy for *mild* depression (comparable to SSRIs in some
  trials) but has **dangerous drug interactions** (it induces liver enzymes — it can wreck the levels of
  contraceptives, anticoagulants, antiretrovirals, transplant drugs) and is unregulated/variable in
  potency, so "natural = safe" is exactly wrong here; **vitamin D, magnesium, "GABA," 5-HTP** and most
  others are mechanism-or-marketing for mood, with thin or null outcome evidence. Correcting a genuine
  *deficiency* (e.g. B12, vitamin D) is real medicine; supplementing the already-replete for mood is mostly
  not. (Cross-ref 14 §3: oral GABA barely crosses the blood-brain barrier.)
- **"Dopamine detox" is mechanistically confused** (full debunk in 14 §3.1). You cannot "reset your
  dopamine receptors" by avoiding fun for a day; what helps is plain **stimulus control / behavioural
  cessation** of compulsive inputs — real and useful, but it is behaviour change, not neurochemistry, and
  the "dopamine" framing is wrong.
- **The wellness-industrial overclaim.** Breathwork, cold plunges, "vagus hacks," nervous-system "resets,"
  manifestation, and the rest convey *some* real physiology (slow breathing genuinely raises vagal output —
  14 §2.4) wrapped in *outcome* claims ("cure your anxiety," "heal your nervous system") that **outrun the
  trials.** Grade the mechanism as possibly real and the marketed outcome as unproven. The tell is always
  the same: a `mechanistic` claim doing `outcome` work it hasn't earned (schema hard rule #1).

The structural point across all of §8: **the genuinely effective mental-health levers are mostly free and
unmonetizable** (exercise, sleep hygiene, connection, sunlight, treating real illness with real treatment),
**while the marketed ones are mostly monetizable and mostly oversold.** That asymmetry — the same one that
runs through 08 and 14 — is not a coincidence; it is the business model.

---

## 9. Suicide — prevention basics, framed honestly

Suicide is the highest-stakes outcome in this entire section, so it gets its own honest framing.

### 9.1 The honest framing

- **Most people who think about suicide do not die by it, and suicidal states are usually transient and
  treatable.** Acute suicidal crises often pass within hours; surviving the crisis window is frequently
  the whole game. This is the empirical basis for hope and for intervention.
- **Asking about suicide does not plant the idea.** This is a persistent and dangerous myth. Direct,
  calm questions about suicidal thoughts **do not increase** suicidal ideation or behaviour — and they open
  the door to help. The Columbia Protocol (C-SSRS) and similar tools are built on this.
- **Means restriction is one of the most effective population-level interventions.** Reducing access to
  lethal means at the moment of crisis — barriers on bridges, safer medication packaging, firearm access
  reduction, restricting access to pesticides (a leading method in much of the world) — **measurably saves
  lives**, precisely because crises are transient and method-substitution is incomplete. (Mann et al.,
  *JAMA* 2005, `10.1001/jama.294.16.2064`, the suicide-prevention strategies review, is the anchor.)
  `cohort`/`review` — strong and consequential.

### 9.2 What reduces suicide risk

- **Treating the underlying condition** (depression, bipolar, psychosis, substance use) — and note the two
  treatments in this section with *direct* anti-suicide evidence: **lithium** (Cipriani *BMJ* 2013, §3.2)
  and **clozapine** (for schizophrenia). **Ketamine** acutely reduces suicidal ideation (§1.3).
- **Connection and follow-up** — caring-contact interventions (brief, repeated check-ins after a crisis)
  reduce subsequent attempts; social connection is protective (§8, Domain M).
- **Crisis resources** — in the US, the **988 Suicide & Crisis Lifeline** (call/text 988) is the
  front-line resource; most countries have equivalents. This section is a research map, not a substitute
  for that.

### 9.3 The honest limits

Suicide is **genuinely hard to predict at the individual level** — risk-prediction tools perform poorly at
identifying *which specific person* will act and *when*, even though they identify *populations* at higher
risk. This is honesty rule #2 at its starkest: a real population-level signal that does not translate into
reliable individual prediction. The implication is **not** fatalism — it is to lean on the interventions
that work *regardless* of prediction: **treat the illness, restrict the means, stay in contact, and act on
the crisis in front of you.**

---

## 10. The honest summary of this section

1. **Psychiatric conditions are real medical conditions** — heritable, biologically grounded, and
   disabling — *and* the field's evidence is messier than either its boosters or its critics admit. Both
   are true; grading them straight is the compassionate move.
2. **Depression:** the serotonin-imbalance story is false (08 §5.3); therapy and medication both
   **modestly** beat placebo, with benefit **concentrated in severe illness** (Cipriani 2018; Fournier
   2010); Kirsch's placebo critique was partly right and improved the field without proving the drugs
   useless; **exercise** is a genuine under-used lever; ECT and ketamine are powerful tools for the severe
   end that the public misjudges.
3. **Anxiety/OCD/PTSD:** **psychotherapy with exposure leads** — CBT/exposure for anxiety, ERP for OCD,
   trauma-focused therapy (PE/CPT) for PTSD — because it directly reverses the avoidance that maintains the
   disorder. SSRIs are real second-line/adjunct. **Benzodiazepines** relieve fast and trap slow.
4. **Bipolar:** **lithium is under-used, is the best mood stabilizer, and uniquely reduces suicide**
   (Cipriani *BMJ* 2013). It is a spectrum, and bipolar-II is chronically misdiagnosed as unipolar
   depression — a real harm, since antidepressants alone can destabilize.
5. **Schizophrenia:** **antipsychotics genuinely work** for positive symptoms (Leucht 2013) but carry
   **serious metabolic harms** that shorten life; clozapine is best-and-underused; **early intervention**
   (short DUP + coordinated specialty care, RAISE) improves outcomes.
6. **ADHD:** a **real, highly heritable** condition; **stimulants have one of the largest effect sizes in
   psychiatry** (Cortese 2018); *and* it is genuinely over-diagnosed in some settings and under-diagnosed
   in others, with adult self-diagnosis needing careful, mimic-aware assessment.
7. **PTSD's frontier:** EMDR works but the eye movements are likely inert (it's exposure in costume);
   **MDMA-assisted therapy is promising but FDA-rejected (2024)** pending another trial, and the whole
   psychedelic field is **unblindable**, so the evidence tier sits below the excitement.
8. **Eating disorders** are **dangerous medical illnesses** — **anorexia has among the highest mortality
   in psychiatry** (Arcelus 2011, SMR ~5–6); FBT (adolescent AN) and CBT-E (bulimia/BED) are the levers;
   early weight-focused treatment matters most.
9. **The lifestyle foundation is real and the floor, not the ceiling** — exercise, sleep, connection,
   sunlight, not self-medicating with alcohol — while **most mood supplements, "dopamine detox," and the
   wellness-industrial "nervous-system reset" genre are mechanism-or-marketing.** The effective levers are
   free and unmonetizable; the oversold ones are not. That asymmetry is the business model, not a coincidence.
10. **Suicide:** crises are usually **transient and treatable**, asking about it doesn't plant it, **means
    restriction works**, lithium/clozapine/ketamine have direct anti-suicide signals, individual prediction
    is genuinely poor — so lean on the interventions that work regardless of prediction.

---

## Go deeper

A short, honestly-annotated reading list. Grades flag where a source is contested, severity-dependent, or
thinner than its visibility implies.

1. **Cipriani et al. — *Comparative efficacy and acceptability of 21 antidepressant drugs*** (*Lancet*
   2018, `10.1016/S0140-6736(17)32802-7`, PMID 29477251). The definitive antidepressant network meta:
   **all 21 beat placebo, SMD ~0.30.** Read it *with* **Fournier et al.** (*JAMA* 2010,
   `10.1001/jama.2009.1943`) on severity-dependence and **Kirsch et al.** (*PLoS Med* 2008,
   `10.1371/journal.pmed.0050045`) on the placebo/publication-bias critique — the three together are the
   whole honest debate. **Tier: meta of RCTs — real but modest, severity-dependent, contested size.**
2. **Cipriani et al. — *Lithium in the prevention of suicide in mood disorders*** (*BMJ* 2013,
   `10.1136/bmj.f3646`, PMID 23814104). The anti-suicide evidence for lithium — one of psychiatry's most
   important and under-acted-on findings. **Tier: meta of RCTs — a rare direct anti-suicide signal.**
3. **Leucht et al. — *Comparative efficacy and tolerability of 15 antipsychotic drugs*** (*Lancet* 2013,
   `10.1016/S0140-6736(13)60733-3`, PMID 23810019). The two-sided ledger on antipsychotics: they work, and
   they cost (metabolic harms). **Tier: multiple-treatments meta — efficacy and harm both real.**
4. **Cortese et al. — *Comparative efficacy and tolerability of medications for ADHD*** (*Lancet
   Psychiatry* 2018, `10.1016/S2215-0366(18)30269-4`, PMID 30097390). Why stimulants are first-line and
   among the largest effects in psychiatry — read alongside the honest over/under-diagnosis nuance. **Tier:
   network meta of RCTs — large effect.**
5. **Mitchell et al. — *MDMA-assisted therapy for severe PTSD*** (*Nat Med* 2021,
   `10.1038/s41591-021-01336-3`, PMID 33972795; confirmatory MAPP2, *Nat Med* 2023). The promise — and then
   the **FDA's 2024 rejection** and the unblinding problem. The cleanest case study in the section of
   "large signal, low tier, not approved." Pair with **Carhart-Harris et al.** (psilocybin vs escitalopram,
   *NEJM* 2021, `10.1056/NEJMoa2032994`, PMID 33852780). **Tier: rct — promising, unblinding-confounded,
   not approved.**
6. **Arcelus et al. — *Mortality rates in patients with anorexia nervosa and other eating disorders***
   (*Arch Gen Psychiatry* 2011, `10.1001/archgenpsychiatry.2011.74`, PMID 21727255). The number that
   reframes eating disorders as lethal medical illness (SMR ~5–6 for AN). **Tier: meta of cohort studies —
   strong and consequential.**
7. **Carpenter, Hofmann et al. — *Cognitive behavioral therapy for anxiety and related disorders*** (*Depress
   Anxiety* 2018, `10.1002/da.22728`, PMID 29451967). The meta-analytic case that exposure-based CBT is
   first-line for anxiety. **Tier: meta of RCTs.**
8. **Mann et al. — *Suicide prevention strategies: a systematic review*** (*JAMA* 2005,
   `10.1001/jama.294.16.2064`). The evidence that **means restriction** and physician/gatekeeper education
   are the interventions with the strongest population-level effect. **Tier: review — strong on means
   restriction.**

---

## Cross-links

- **SIDEWAYS:** depression↔mortality, the exercise-for-depression meta, the serotonin umbrella review,
  Cipriani's antidepressant network meta ↔ **Section 08** (`08-brain-cognitive.md` §5); neurotransmitters-
  aren't-feelings, the dopamine-detox and serotonin-imbalance debunks, the circuit-not-chemical model of
  mood ↔ **Section 14** (`14-nervous-system.md` §3, §7); sleep ↔ mood (CBT-I, sleep-loss→mania) ↔ **Domain
  I** (`I-sleep-circadian.md`) and **Section 05** (recovery/sleep/stress); social connection / loneliness
  as a mental-health and suicide-protective lever ↔ **Domain M** (`M-psychosocial-determinants.md`);
  light/circadian and seasonal depression ↔ **Domain I** + **Section 09** (exposures); HPA-axis / cortisol /
  stress physiology ↔ **Section 13** (`13-endocrine-hormones.md`); supplements-for-mood honest grading ↔
  **Section 03** (nutrition & supplements).
- **UP to canon:** the circuit-, plasticity-, and stress-physiology substrate of mood and psychosis rests
  on **neuroinflammation, HPA-axis signalling, BDNF/neurotrophin signalling, and membrane bioelectricity**
  → `bucket-canon/05-biophysics/`. Mental health is the **outcome-layer application** of those foundations,
  not a foundation itself — exactly as 08 and 14 frame the brain.

## Gaps flagged for next wave

The biomarker/blood-test question for psychiatric diagnosis (still no validated lab test for any common
condition — diagnosis remains clinical); whether the inflammation-and-depression subtype is a real,
treatable phenotype (anti-inflammatory augmentation trials are mixed); the durability and abuse-liability
of ketamine/esketamine beyond the acute window; the result of the **additional MDMA phase-3 trial** the FDA
required (and whether unblindable psychedelic trials can ever clear the regulatory bar); psilocybin's true
effect size once blinding and therapist-allegiance are controlled; head-to-head therapy-vs-medication-vs-
exercise for depression in *low-bias* trials (08's open gap, repeated here); the genetics of treatment
response (pharmacogenomics in psychiatry is still mostly noise — cf. Section 18); long-term real-world
outcomes of early-intervention psychosis services at scale; and a validated, deployable individual-level
suicide-risk model (the field's most consequential open problem).
