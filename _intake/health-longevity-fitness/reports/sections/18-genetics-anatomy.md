# 18 — Genetics (Practical) & an Anatomy / Physiology Primer

Your DNA report claims to reveal your ideal diet, your "power vs endurance" type, and your optimal supplements. It says far less about you than that. A short list of variants can change a real decision — which drugs are safe at what dose, a few high-penetrance disease genes, your lifelong Lp(a) level. The vast rest of what gets sold as "personal genomics" is small-effect common-variant noise dressed up as a verdict. Part A sorts the short list from the noise. Part B is a quick anatomy/physiology primer — the orientation map that ties the manual's body-systems sections together.

_Not medical advice. This chapter covers what your genes mean for you and what to test; drug dosing lives in §10, screening in §07._

---

# PART A — GENETICS, PRACTICALLY

## A.1 What your genome actually is and does (a one-page recap)

Section 01 (§4) treats this as a foundation; here is the working summary you need before reasoning
about any test.

- **Genes → proteins.** Your genome is ~3.1 billion base pairs of DNA, ~20,000 protein-coding genes,
  copied identically into nearly every cell. The cell reads a gene (DNA → RNA → protein, the central
  dogma) to build the protein machines that *are* your physiology — enzymes, receptors, channels.
  **Most of the genome is not genes**: it is regulatory and non-coding sequence that decides *which*
  genes are read, *when*, and *how loudly*. This is why two
  cells with identical DNA (a neuron and a liver cell) are completely different — the difference is
  *regulation*, the layer the epigenetic clocks of Domain C read.
- **Variants / SNPs.** Any two unrelated humans differ at ~4–5 million sites. The commonest kind is a
  **single-nucleotide polymorphism (SNP)** — one letter swapped. Most SNPs are silent or trivial; a
  small minority change a protein or its expression. A consumer chip "reads your DNA" by genotyping
  ~600,000–1,000,000 of these *common* SNPs — it does **not** sequence your genome.
- **Common vs rare variants — the most important distinction for testing.**
  - **Common variants** (present in >1–5% of people) each have *tiny* effects on common traits and
    diseases. This is what a SNP chip and a polygenic score capture.
  - **Rare variants** (familial, often <0.1%) can have *large*, sometimes near-deterministic effects —
    a single broken copy of *BRCA1*, *LDLR* (familial hypercholesterolemia), or an *HFE*/*MLH1* gene.
    These are the "actionable" findings, and a SNP chip is the *wrong instrument* to find
    most of them (it tests a few pre-chosen spots, not the whole gene).
- **Polygenicity — why "fitness genes" are mostly hype.** Almost every trait you care about
  (height, VO₂max (a fitness/aerobic-capacity score), strength, longevity, intelligence, blood
  pressure, body weight) is **polygenic** —
  the sum of *thousands* of common variants each shifting the trait by a hair, plus a large
  environmental contribution. The 2017 **"omnigenic" model** (Boyle, Li & Pritchard, 2017)[^omnigenic]
  pushed this further: for a typical complex trait, so many genes
  contribute that essentially *any* gene expressed in the relevant tissue nudges it a little, and a
  handful of "core" genes carry only a slice of the heritability. **The practical consequence is
  decisive: there is no "sprinter gene," no "endurance gene," no "longevity gene" you can read off a
  chip and act on.**
- **The *ACTN3* "speed gene" is the textbook example.** The R577X variant is *real* (the XX genotype
  lacks α-actinin-3 in fast fibers) yet explains only ~1–3% of the differences between people in any
  performance measure and predicts essentially nothing for an individual. When a direct-to-consumer
  (DTC) report tells you your "power potential" or "endurance type," it is reading a few common SNPs
  that explain a rounding error of the trait and dressing the noise as a verdict.

@@FIG:B10-common-rare-variants@@

> **The one-line filter for Part A.** A handful of *rare, large-effect* variants are worth knowing
> because they are **actionable** (you can do something specific). The vast polygenic remainder — the
> "wellness," "fitness," and "nutrition" reports — is mostly *small-effect common variants* whose
> individual predictive value rounds to noise. Spend your attention on the first category.

---

## A.2 The few variants that actually matter for an individual

These are the variants where knowing your status can change a real decision. Everything not on this
short list is, for personal action, far less important than the DTC industry implies. The table is the
whole list at a glance; the subsections after it (§§A.2.1–A.2.5) walk through the rows that need more
than one line — skip to whichever matters to you.

| Variant / gene | What it is | Why it can matter for *you* | Honest grade |
|---|---|---|---|
| **APOE (ε4)** | Lipid-transport apolipoprotein; ε2/ε3/ε4 alleles | Strongest common risk allele for **late-onset Alzheimer's** + a CVD/lipid modifier | Real, large relative risk (RR) — but a *risk* allele, not destiny; **counseling-fraught** (§A.3) |
| **Lp(a) — *LPA*** | Genetically-set lipoprotein(a) level (mostly *LPA* kringle-repeat) | **Causal**, lifelong CVD/aortic-stenosis risk; ~20% of people are high; **one-time test** | Strong (Mendelian-randomization causal); see Domain L |
| **FOXO3** | Forkhead transcription factor, stress resistance | Replicated **longevity** association across populations | Real at *population* scale; **near-useless personally** (§A.4) |
| **MTHFR (C677T / A1298C)** | Folate-cycle enzyme variant | Marketed endlessly; **mostly meaningless** for healthy people | **Overhyped — debunk (§A.5)** |
| **HFE (C282Y / H63D)** | Hereditary hemochromatosis (iron overload) | Treatable if it ever manifests (phlebotomy); but **low penetrance** | Real gene, **modest personal risk** (§A.2.2) |
| **BRCA1/2 & cancer genes** | High-penetrance hereditary cancer | **actionable** — screening, risk-reducing surgery, cascade testing | Strong *for true carriers*; chip testing is the wrong tool (§A.2.3) |
| **Pharmacogenes (CYP2C19, CYP2D6, DPYD, TPMT, SLCO1B1, HLA-B)** | Drug-metabolism / hypersensitivity variants | **The most useful clinical genetics there is** — dose & drug choice | Strong, guideline-backed (CPIC); see §A.2.4 |

@@FIG:BX1-actionable-variants@@

### A.2.1 APOE — the honest headline (full counseling treatment in §A.3)

*APOE* comes in three alleles (ε2, ε3, ε4). The **ε4** allele is the single strongest *common* genetic
risk factor for late-onset Alzheimer's disease, and it shows a clean **gene-dose** relationship: one
ε4 copy raises lifetime risk roughly **2–3×**, two copies (ε4/ε4, ~2% of people) roughly **8–15×**
(Farrer's ε4/ε4 odds ratio is ≈15 in Caucasians), relative to the common ε3/ε3 (Corder et al., 1993; meta-analysis Farrer et al., 1997).[^apoe-risk] The
effect is **modified by age, sex, and ancestry** — larger in women, and substantially smaller in
several African-ancestry populations (Farrer 1997) — a
caution against reading any single risk number as universal. ε4 also modestly raises cardiovascular
risk and LDL. But ε4 is *neither necessary nor sufficient*: most Alzheimer's patients are not ε4/ε4,
and many ε4/ε4 carriers never develop dementia. It is a **risk allele, not a diagnosis** — which is
exactly why disclosing it is delicate (§A.3).

@@FIG:B03-apoe-gene-dose@@

### A.2.2 Hemochromatosis (HFE) — real gene, low penetrance

Hereditary hemochromatosis is the textbook case of **"a Mendelian disease that mostly doesn't happen."**
*HFE* C282Y homozygosity is the commonest genotype, yet **clinical iron-overload disease is the
exception, not the rule**: in the HealthIron cohort, only a minority of C282Y homozygotes (≈**28% of
men, <2% of women**) developed iron-overload-related disease over time (Allen et al., 2008).[^hfe-penetrance]
The point cuts two ways: (1) it *is* worth knowing, because
the treatment — periodic phlebotomy if ferritin/transferrin saturation climb — is trivial and fully
preventive; but (2) **a positive genotype is not a diagnosis**; you act on the *iron studies*
(ferritin, transferrin saturation), not on the SNP alone. Predictor ≠ lever (something that forecasts
risk isn't automatically something that, changed, lowers it); here the lever is the blood test that
follows.

### A.2.3 BRCA and the actionable cancer genes — the *right* findings, the *wrong* instrument

The high-penetrance hereditary-cancer genes — *BRCA1/2* (breast/ovarian), the Lynch-syndrome mismatch-
repair genes (*MLH1/MSH2/MSH6/PMS2*, colorectal/endometrial), *TP53*, *APC*, and others — are where
genetics earns its keep: a true pathogenic variant can mean lifetime cancer risks of 40–80%, and the
responses are concrete and effective (intensified screening, risk-reducing surgery, cascade testing of
relatives, choice of therapy). These sit on the **ACMG "secondary findings"** list (§A.2.5) and the
**CDC Tier-1** genomics conditions (HBOC, Lynch, familial hypercholesterolemia) precisely because they
are *actionable*.

**But the consumer-chip caveat is large enough to be its own warning.** When the FDA authorized
23andMe to report *BRCA* in 2018, it authorized **three specific Ashkenazi-Jewish founder variants** —
out of **thousands** of known pathogenic *BRCA1/2* variants. A "negative" 23andMe *BRCA* result rules
out three variants and **nothing else**; a person from a high-risk family who gets a reassuring DTC
result and skips real clinical testing has been actively misled by the format. Pathogenic-cancer-gene
testing belongs in a **clinical lab with genetic counseling**, prompted by family history — not on a
saliva-kit wellness report.

### A.2.4 Pharmacogenomics — the useful clinical genetics

**The highest-value DNA information for most people is pharmacogenomic** — how your variants change
drug metabolism and hypersensitivity. Unlike polygenic "risk," these are often **single, large-effect variants with a
clear clinical action**, codified by the **Clinical Pharmacogenetics Implementation Consortium (CPIC)**
(framework: Relling & Klein, 2011)[^cpic-framework]

- **CYP2C19 → clopidogrel (Plavix).** Loss-of-function carriers (poor metabolizers — common in East-
  Asian ancestry) under-activate the prodrug and get **less antiplatelet protection** after stenting;
  guidelines recommend an alternative agent (CPIC clopidogrel guideline, Lee et al. 2022).[^cpic-clopidogrel]
  Also affects some antidepressants/PPIs.
- **CYP2D6 → codeine/tramadol & many psychiatric drugs.** Ultra-rapid metabolizers convert codeine to
  morphine dangerously fast (FDA boxed warning); poor metabolizers get no analgesia. Dose/drug choice
  changes.
- **DPYD → fluoropyrimidines (5-FU, capecitabine).** Deficient metabolizers risk **fatal toxicity**;
  pre-treatment testing is now standard in much of Europe.
- **TPMT / NUDT15 → thiopurines (azathioprine).** Deficiency → life-threatening myelosuppression at
  standard doses; test-before-treat.
- **SLCO1B1 → statins.** A transporter variant raises simvastatin myopathy risk; informs statin choice.
- **HLA-B\*57:01 → abacavir** and **HLA-B\*15:02 → carbamazepine** — single alleles that predict
  severe, sometimes fatal hypersensitivity; testing is **mandatory before prescribing** in the
  relevant settings. This is genetics with a body count attached, and it is *prevented* by a cheap test.

**Why this is the good kind.** These pass *both* honesty rules: the variant is large-effect (not a
polygenic whisper), and there is a **defined clinical action** (change the drug or the dose). This is
the part of your genome most worth knowing — far more than any "wellness" panel.

### A.2.5 The actionable-gene list, formalized: ACMG Secondary Findings

When a lab does whole-exome/genome sequencing, the **American College of Medical Genetics & Genomics**
publishes a curated list of genes to report *opportunistically* because they are highly penetrant **and
medically actionable** — the **ACMG SF v3.2** list of **81 genes** (Miller et al., 2023).[^acmg-sf]
It is the field's consensus answer to "which genetic
findings are worth acting on even if you weren't looking for them": hereditary cancers, familial
hypercholesterolemia, cardiomyopathies and arrhythmias (long-QT, *MYH7*, etc.), malignant
hyperthermia, aortopathies. **This list — not a wellness report — is the definition of "actionable
genetics."** If a finding isn't ~this caliber of penetrance-plus-action, it is information — it doesn't
tell you what to do.

---

## A.3 APOE and the honest counseling problem — predictor that isn't a lever

APOE deserves its own subsection because it is the place where the **predictor ≠ lever** rule bites
hardest, and where the DTC industry does the most quiet harm.

The problem: ε4 is a strong predictor (§A.2.1) but **there is, as of now, no proven intervention that
specifically neutralizes ε4 risk.** So a person who learns they are ε4/ε4 receives a frightening,
lifelong, *partly* predictive number — and **no genotype-specific lever to pull**. This is the textbook
predictor-without-a-lever, and it raises four real counseling issues:

1. **Risk ≠ certainty.** Even ε4/ε4 lifetime risk, while substantially elevated, is well short of 100%
   and varies by sex and ancestry — so a naked "8–15×" on a DTC dashboard, with no absolute framing and
   no counselor, invites disproportionate fear (or false reassurance for ε3/ε3). (Relative vs absolute
   risk: §A.6.)
2. **The "right not to know."** Predictive testing for an untreatable condition is the classic case
   where many people, fully informed, *choose not to test* — and that choice is legitimate. The
   research-genetics convention (e.g., the REVEAL studies of APOE disclosure) is **explicit informed
   consent and counseling before disclosure**, precisely because some people are harmed by knowing.
3. **The lever that *does* exist is generic, not genotype-specific.** ε4 carriers are not helpless —
   but what helps them is the *same* dementia-risk-reduction toolkit that helps everyone (Domain on
   brain/cognition, section 08): blood-pressure and lipid control, exercise, hearing correction
   (ACHIEVE, graded in section 08), sleep, not smoking, metabolic health. **There is some evidence ε4
   carriers may benefit *more* from these levers — which flips the script: the high-genetic-risk person
   is exactly the one for whom lifestyle is most worth it (Rule 3, "something beats nothing").**
4. **Insurance / privacy.** In the US, GINA bars *health*-insurance and employment discrimination but
   **not life, disability, or long-term-care insurance** — a concrete reason genotype disclosure is
   not consequence-free.

> **The APOE stance for this manual.** Knowing your ε4 status is a *personal* decision that should
> involve counseling, not a saliva kit's push notification. If you do know it, the response is **not**
> a special supplement or "ε4 protocol" sold to you — it is to take the universal brain-and-vascular
> levers *seriously*, because you may have the most to gain from them. Predictor learned; lever is the
> ordinary one, pulled harder.

---

## A.4 FOXO3 — true at the population scale, near-useless personally

*FOXO3* is the cleanest illustration of **"a real longevity gene that tells you almost nothing about
yourself."** It is one of only two loci (with *APOE/TOMM40*) that replicate across most human longevity
studies (Domain C §1). It is mechanistically deep — the human
ortholog of the worm *daf-16* in the insulin/IGF-1→FOXO stress-resistance axis that *doubled*
*C. elegans* lifespan (section 01 §4.3). All of that is *true* and *important for science*.

**And it is nearly worthless as a personal predictor**, for three reasons that generalize to *every*
"longevity SNP": (1) the **effect size is small** — a longevity-associated FOXO3 allele shifts the odds
of exceptional longevity by a modest factor, swamped by environment and chance; (2) **lifespan
heritability is only ~10–25%** (Domain C §1), so most of why people live long is *not* in their DNA at
all; and (3) **you cannot act on it** — there is no "activate your FOXO3" intervention that has moved a
human outcome. Knowing you carry the "good" FOXO3 allele changes nothing you should do; knowing you
*lack* it changes nothing either. It is a population-genetics fact wearing a personal-genomics costume.

---

## A.5 MTHFR — the most overhyped variant in consumer genetics (debunk)

No variant is sold harder, on weaker grounds, than **MTHFR**. The pitch — found across naturopathy,
"functional medicine," and supplement marketing — is that carrying the common **C677T** (or A1298C)
*MTHFR* variant means you "can't methylate," causing fatigue, anxiety, miscarriage, autism,
cardiovascular disease, and "toxicity," all "fixed" by buying expensive **methylfolate** supplements.

**The evidence does not support testing or treating *MTHFR* in the general, healthy population.** The
authoritative statement is an **ACMG practice guideline whose title is the verdict**: *"Lack of evidence
for MTHFR polymorphism testing"* (Hickey et al., 2013).[^mthfr-acmg] Its findings:

- The common *MTHFR* variants are **extremely common** (the C677T "TT" genotype is present in ~10–15%
  of many populations — a "risk" allele a tenth of everyone carries is not a personal red flag).
- *MTHFR* genotyping has **no proven utility** for recurrent pregnancy loss or for thrombophilia
  work-ups, and the College recommends **against** ordering it for these indications.
- The historical cardiovascular signal ran through **homocysteine** — and the large homocysteine-
  *lowering* RCTs (folate/B-vitamins) **failed to reduce cardiovascular events**. Lowering the
  intermediate did not move the outcome (a clean mechanism-≠-outcome failure, the central rule of
  section 01).

What is *actually* true and small: TT homozygotes have, on average, slightly higher homocysteine and a
modestly higher folate requirement — fully covered by **ordinary dietary folate or standard folic acid**
(and the periconceptional folic-acid recommendation for *all* pregnancies stands regardless of *MTHFR*
status). There is **no good evidence** that *MTHFR* carriers need special "methylated" vitamins, that
the variant causes the long list of conditions attributed to it, or that "MTHFR" explains a person's
symptoms. **Grade: overhyped; testing not recommended; the supplement upsell is the product, not the
science.**

---

## A.6 Consumer genetic testing (23andMe-type) — what it's good for, and the honest limits

A consumer kit genotypes a few hundred thousand to a million common SNPs. Sorted by honesty:

**What it is good for**

| Use | Why it works |
|---|---|
| **Ancestry / relative-finding** | Common-SNP patterns are exactly what ancestry inference needs. This is the strongest, real product. |
| **Carrier status (recessive)** | For specific, well-defined variants (e.g., common CF, Tay-Sachs, sickle-cell alleles), the chip tests the right spots. Useful for reproductive planning. |
| **A few actionable variants** | The FDA-authorized reports — *BRCA* (3 founder variants), *MUTYH*, *APOE*, *HFE*, *G6PD* — **as starting points that must be clinically confirmed**, never endpoints. |
| **Pharmacogenomics (partial)** | Some PGx-relevant variants (CYP2C19 alleles, etc.) are informative — the most useful "health" content on the chip (§A.2.4). |

**The honest limits — where the chip is noise, or worse, misleading**

- **"Wellness / fitness / nutrition" reports are mostly noise.** "Endurance vs power profile," "caffeine
  sensitivity," "ideal diet" — these read small-effect common SNPs that explain a rounding error of
  polygenic traits (§A.1): *entertainment-grade*, not decision-grade.
- **Relative risk ≠ absolute risk.** A report saying a variant gives "2.1× the average risk" of some
  condition is meaningless without the *baseline*: 2.1× a 0.2% lifetime risk is still 0.4%. DTC
  dashboards routinely show the multiplier and bury (or omit) the absolute number — the single most
  common way these reports mislead.
- **A "negative" is not clearance.** The chip tests *pre-selected* spots. A reassuring *BRCA* or
  carrier result rules out *those variants only* (§A.2.3). For anyone with a concerning family history,
  a DTC negative is dangerous false comfort.
- **Genotyping-chip false positives.** Raw consumer data run through third-party interpreters has a
  **high false-positive rate for rare "pathogenic" variants** (a chip is built to read common SNPs, not
  to call rare mutations); clinically important "findings" from raw DTC data must be confirmed in a
  diagnostic lab before anyone acts.
- **Polygenic risk scores (PRS) — promising, not yet personal, and ancestry-biased.** PRS aggregate
  thousands of SNPs and *do* stratify risk at the *population* level for some diseases. But individual
  predictive value is limited, and crucially PRS are **trained mostly on European-ancestry data and
  transfer poorly to other ancestries** — deploying them naively could *widen* health disparities
  (Martin et al., 2019; Mostafavi et al., 2020, showing prediction accuracy varies *even within* an
  ancestry group).[^prs-ancestry] A DTC "polygenic score" is a population instrument wearing a personal
  label.

> **Bottom line on DTC.** Buy it for ancestry and curiosity; use the carrier/PGx/actionable-variant
> outputs only as **clinically-confirmable leads**; ignore the wellness/fitness/nutrition reports for
> any real decision; and never read a "negative" as an all-clear.

---

## A.7 Epigenetics, practically — clocks are tests, not validated personal surrogates

Domain C (§2) and section 01 (§4.2) cover the mechanism; the *practical* question is: **should you buy
a methylation-age test, and what does the number mean?** The honest answer is **no, not yet, for
personal decision-making** — for reasons that are about *measurement*, not mysticism:

@@FIG:98-epigenetic-clock@@

1. **Predictive ≠ validated surrogate.** Epigenetic age acceleration reliably predicts mortality at the
   *cohort* level (Chen 2016 meta, Domain C §2). But the field's own consensus (Moqri et al., *Cell*
   2023, Biomarkers of Aging Consortium, Domain C §3) is that **no aging biomarker is yet validated as
   a surrogate** that reliably *moves with an intervention and predicts its clinical benefit*. A clock
   that forecasts death across a population is *not* a personal dashboard you should optimize.
2. **Reliability.** The original clocks have **poor test–retest reliability** (ICC as low as ~0.6–0.8);
   principal-component versions fix this, but **many "I reversed my biological age" results sit inside
   the measurement noise** of the consumer test that produced them (Higgins-Chen 2022, Domain C §2).
   Two saliva kits, same week, can disagree by years.
3. **Clocks disagree with each other.** GrimAge, DunedinPACE, PhenoAge, Horvath capture partly
   *different* signals and correlate imperfectly; "your biological age" depends on which clock you
   bought.

**Practical stance:** a consumer methylation-age result is a fun, weakly-reliable correlate, not a
validated readout of "how fast you are aging" and not something to chase with supplements. The honest
biomarkers to *act* on are the boring validated ones (Domain L: ApoB/LDL, blood pressure, A1c, VO₂max,
grip, DXA) — they have hard-outcome links *and* respond to known levers. Predictor ≠ lever, again.

---

## A.8 Gene × environment — genes load the gun, environment pulls the trigger

The unifying frame for all of Part A, and the bridge to `04-individual-variation.md`:

- **Heritability is not destiny, and it is not even personal.** "Lifespan is ~10–25% heritable" or
  "trainability is ~47% heritable" (HERITAGE, `04-individual-variation.md` §2.1) are *population
  variance* statements — they describe how much of the *spread between people* is genetic in a given
  environment. They do **not** tell you how much of *your* outcome is fixed, and they say nothing about
  what happens when you change the environment (heritability of height was high *and* average height
  rose with nutrition — both true).
- **The responder / non-responder reality is genetic — and beatable.** The same 20-week program
  produced VO₂max gains from ~0% to >40%, with the *response itself* partly heritable (HERITAGE). But
  Montero & Lundby (`04` §2.2) showed apparent "non-responders" **do respond to a higher dose**. So
  even where genetics demonstrably shapes the *response*, the lever (change the stimulus) still works.
  Genes set the *dose-response curve you're on*; they don't lock the door.
- **Gene × environment interaction is where the action is — and where "DNA-based diets" die.** The
  strongest test of personalized-by-genotype eating is **DIETFITS** (Gardner et al., 2018):[^dietfits]
  >600 people randomized to healthy low-fat vs healthy
  low-carb diets, pre-genotyped for a "low-fat/low-carb responsive" SNP pattern — and **genotype did
  not predict which diet worked better.** The "obesity gene" *FTO* tells the same story: across 9,500+
  people, *FTO* genotype **did not affect weight-loss response** to diet/exercise/drugs (Livingstone et
  al., 2016).[^fto-weightloss] **"Eat for your genotype" is, on the best
  current evidence, a product, not a finding.**

> **The whole of Part A in one sentence.** Your genome contains a *short* list of variants worth acting
> on (pharmacogenes, a few high-penetrance disease genes, Lp(a), maybe APOE *with counseling*) and a
> *vast* polygenic remainder that the wellness industry sells as personal insight but that, for *you*,
> is mostly noise — and the levers that move your actual outcomes are environmental, work regardless of
> genotype, and matter *most* for the people at highest genetic risk.

---

# PART B — AN ANATOMY & PHYSIOLOGY PRIMER

This is the orientation map, so the manual's body-systems sections have a frame to hang on. It answers
three questions: how is a body organized, what are the organ systems and where does this manual cover
each, and what minimum physiology should every reader carry?

## B.1 Levels of organization — the body is a nested hierarchy

A human body is built in layers, each emergent from the one below. This is not pedantry: it is *why*
the manual reasons from foundations up to outcomes (section 01), because **a lever applied at one level
acts through every level below it.**

| Level | What it is | Where the manual treats it |
|---|---|---|
| **Atoms** | C, H, O, N, Ca, Na, K, Fe, P… the elements | Chemistry/physics canon (`bucket-canon/01–03`) |
| **Molecules** | Water, ATP, glucose, proteins, lipids, DNA | §01 (§2–§4): bioenergetics, membranes, the genome |
| **Organelles** | Mitochondria, nucleus, ribosomes | §01 §2 (the mitochondrion = the master variable) |
| **Cells** | The smallest living unit; ~37 trillion of them | §01 §2–§3; senescence in §01 §5 |
| **Tissues** | Groups of like cells: epithelial, connective, muscle, nervous | §B.2 below; section 11 (body systems) |
| **Organs** | Multiple tissues in one functional structure (heart, liver) | sections 07, 08, 11 |
| **Organ systems** | Organs cooperating for a function (~11–12; §B.3) | the whole manual — see the navigation table |
| **Organism** | You — all systems integrated by homeostasis | §01 §6.2; this section |

@@FIG:BS1-levels-of-organization@@

The **four basic tissue types** every organ is built from: **epithelial** (the barrier/exchange
surfaces), **connective** (support and transport; the most diverse class), **muscle** (the only tissue
that generates force), and **nervous** (fast signaling). Most of what aging and training *do* to you is
a change in one of these four tissues.

@@FIG:Z05-tissue-types,RA11-tissue-epithelial,RA12-tissue-connective,RA13-tissue-muscle@@

## B.2 Homeostasis — the organizing principle that makes a "system" a system

The reason 37 trillion cells behave as *one organism* and not a heap is **homeostasis**: the active
maintenance of a stable internal milieu (temperature, pH, glucose, calcium, osmolarity, oxygen) against
constant perturbation — Claude Bernard's *milieu intérieur*, Walter Cannon's coinage (section 01 §6.2).
Every organ system is, at bottom, a **homeostatic loop**: a sensor, a set-point, an effector, and
negative feedback. The respiratory and cardiovascular systems hold O₂/CO₂ and pH; the kidneys hold
water, sodium, and acid-base; the endocrine pancreas holds glucose; the skin and hypothalamus hold
temperature. **Allostasis** is the modern refinement — stability *through* predictive change — and its
cost, **allostatic load**, is the wear from stress responses that never reset (section 01 §6.2; section
05 on sleep/stress). When you read any body-system section, ask: *what variable is this system holding
constant, and what is the cost when it's chronically pushed?* That question is the spine of physiology.

## B.3 The organ systems — and where this manual covers each (navigation table)

There are **eleven** classical organ systems (twelve if you count the immune system separately from the
lymphatic plumbing it travels in). They are not independent — they share organs (the pancreas is
digestive *and* endocrine), and homeostasis couples them all — but the taxonomy is the standard map.
Use this as the **index to the rest of the manual** — the section numbers in the last column (§02,
§07, §11…) point to other chapters, and the words in parentheses tell you what's there (§07 =
cardiovascular and metabolic, §11 = skin/bone/organ detail, §02 = training, and so on):

@@FIG:17-organ-systems-map@@

| # | Organ system | Core job (the homeostatic variable) | Primary coverage in this manual |
|---|---|---|---|
| 1 | **Integumentary** (skin, hair, nails) | Barrier; temperature; vitamin-D synthesis | **§11** (skin/photoaging, sunscreen); §09 (UV exposure) |
| 2 | **Skeletal** (bones, joints, cartilage) | Structure; movement levers; Ca store; marrow | **§11** (bone/BMD, LIFTMOR, osteoporosis); §04 (leverage); §02 (loading) |
| 3 | **Muscular** (skeletal muscle) | Force, movement, the metabolic sink | **§02** (training), **§04** (fiber type, sarcopenia); §01 §2 (the ATP engine) |
| 4 | **Nervous** (brain, cord, nerves, special senses) | Fast signaling, cognition, autonomic control | **§08** (brain/cognition); §05 (autonomic/HRV, sleep); §11 (vision, hearing) |
| 5 | **Endocrine** (hypothalamus-pituitary, thyroid, adrenal, pancreas, gonads) | Slow chemical signaling; metabolism, growth, stress, reproduction | **§07** (metabolic/thyroid), §05 (cortisol/stress), §04 (sex hormones, menopause, TRT); §03/D (insulin) |
| 6 | **Cardiovascular** (heart, vessels, blood) | Bulk transport of O₂, fuel, heat, signals; BP | **§07** (CVD prevention, lipids/ApoB, BP); §02 (VO₂max); §01 §2 (delivery half of bioenergetics) |
| 7 | **Lymphatic / Immune** | Fluid return; defense; inflammaging | **§07/B** (inflammaging); §01 §5 (senescence/SASP); §11 (oral-systemic) |
| 8 | **Respiratory** (airways, lungs) | Gas exchange (O₂ in, CO₂ out); pH | **§02** (VO₂max, the O₂ pathway); §09 (air pollution); §01 §2 |
| 9 | **Digestive** (GI tract, liver, pancreas, microbiome) | Break food into absorbable fuel/building blocks | **§03** (nutrition/supplements); Domain C §4 (microbiome); §01 §2.5 (substrate) |
| 10 | **Urinary / Renal** (kidneys, bladder) | Water/electrolyte/acid-base balance; BP; waste | **§07** (renal/metabolic markers); §11 (pelvic floor/continence); §10 (drug clearance) |
| 11 | **Reproductive** (gonads, associated organs) | Reproduction; sex-hormone milieu | **§04** (sex differences, menopause/andropause); Domain N (women's longevity) |
| 12 | **(Immune, counted separately)** | Innate + adaptive defense; immunosenescence | **§07/B** (immune aging, iAge clock — Domain C §3); §01 §5 |

Two cross-cutting layers sit *underneath* every row and are treated as their own sections because they
govern all the systems at once: **genetics/-omics** (this section + Domain C) and the **mechanism
bridge** (§12, `12-mechanism-bridge.md`) that ties each system's outcomes down to the §01 foundations.

## B.4 The minimum physiology every reader should carry

Three end-to-end stories. Each one is a *chain across systems*, and each ties directly to a foundation —
which is the whole point: **the levers in this manual act on these chains.**

### B.4.1 How oxygen gets to a working muscle (the VO₂max chain)

@@FIG:hemoglobin@@

This is the single most important integrated-physiology story in the manual, because **VO₂max is the
strongest exercise-related mortality predictor (Domain E)** and it is *literally* the throughput of this
chain:

@@FIG:BS2-vo2max-oxygen-chain@@

1. **Lungs** — you ventilate; O₂ crosses the thin alveolar–capillary membrane into blood (respiratory
   system; diffusion down a partial-pressure gradient).
2. **Blood** — O₂ binds **hemoglobin** in red cells (the cooperative O₂-binding curve is why a little
   change in lung loading moves a lot of delivery).
3. **Heart** — **cardiac output** (heart rate × stroke volume) pumps oxygenated blood to the body; this
   is the step training expands most (a bigger stroke volume is the central adaptation).
4. **Capillaries** — O₂ diffuses from blood into muscle; trained muscle grows *more* capillaries,
   shortening the diffusion distance.
5. **Mitochondria** — O₂ is the final electron acceptor of the electron transport chain (section 01 §2);
   endurance training roughly *doubles* mitochondrial content (Holloszy). **VO₂max is the integrated
   capacity of this entire chain** — which is exactly why section 01 calls bioenergetic capacity the
   master variable. Train any link (lungs rarely limit; heart, capillaries, mitochondria do) and the
   whole pipe gets bigger.

### B.4.2 How food becomes ATP (the fuel chain)

Detailed in section 01 §2; the system-level summary:

@@FIG:BS3-food-to-atp-chain@@

**Digestive → cardiovascular → cells → mitochondria.** Food is broken to glucose, fatty acids, and amino
acids and absorbed across the gut epithelium (microbiome fermenting fiber to SCFAs, Domain C §4); the blood
distributes fuels and insulin while the liver buffers glucose; inside cells glucose → glycolysis → pyruvate
and fat → β-oxidation both converge on **acetyl-CoA → the Krebs cycle**, loading NADH/FADH₂; those carriers
feed the **electron transport chain**, and **ATP synthase** spends the proton gradient to make ATP
(chemiosmosis — the foundation law, §01 §2.2). **Metabolic flexibility** — switching cleanly between glucose
and fat — is itself a marker of health; losing it is the early signature of insulin resistance (§01 §2.5).

### B.4.3 How a signal travels (the control chain)

The body coordinates itself two ways, fast and slow:

- **Fast — electrical (nervous system).** A neuron fires an **action potential**: a self-propagating
  wave of Na⁺-in/K⁺-out across the membrane, governed by voltage-gated channels (the Hodgkin–Huxley
  foundation, canon `05-biophysics`). At the **synapse** it converts to a chemical signal
  (neurotransmitter) to the next cell. Milliseconds. This is reflexes, movement, the **autonomic**
  sympathetic/parasympathetic balance read out as HRV (section 05).
- **Slow — chemical (endocrine system).** A gland releases a **hormone** into the blood; it travels
  everywhere and acts only on cells with the matching receptor (insulin → glucose uptake; cortisol →
  stress metabolism; estrogen/testosterone → reproductive and tissue maintenance). Seconds to days.
- **Cellular — the nutrient-sensing switches.** *Inside* every cell, the mTOR / AMPK / sirtuin / FOXO
  network (section 01 §4.3) reads the fed/fasted/stressed state and sets "grow" vs "repair." **This is
  the layer almost every lifestyle lever ultimately pulls** — which is why fasting, exercise, and
  caloric restriction share so many effects.

> **Why the primer matters for the rest of the manual.** Every recommendation downstream — train this,
> eat that, sleep, treat your blood pressure — acts on one of these three chains, through one of the
> organ systems in §B.3, by holding or shifting a homeostatic variable. When a claim can't be placed on
> a chain and traced to a foundation (section 01), be skeptical: that's where hype lives (the rule that
> governs the whole manual).

---

### Go deeper

**Practical genetics — the honest, authoritative sources:**
- **ACMG, *"Lack of evidence for MTHFR polymorphism testing"*** (Hickey et al., *Genet Med* 2013,
  `10.1038/gim.2012.165`). The definitive MTHFR debunk, straight from the profession that does the
  testing. **Tier: practice guideline — strong.**
- **ACMG SF v3.2 secondary-findings list** (Miller et al., *Genet Med* 2023,
  `10.1016/j.gim.2023.100866`). The field's consensus 81-gene definition of "actionable" genetics —
  the right yardstick against which to measure any "important" genetic finding. **Tier: consensus —
  strong.**
- **CPIC guidelines** (cpicpgx.org; framework Relling & Klein, *Clin Pharmacol Ther* 2011,
  `10.1038/clpt.2011.34`; clopidogrel Lee et al. 2022, `10.1002/cpt.2526`). The home of the useful clinical genetics — drug-gene dosing. **Tier: implementation guideline — strong.**
- **Boyle, Li & Pritchard, *"An Expanded View of Complex Traits: From Polygenic to Omnigenic"***
  (*Cell* 2017, `10.1016/j.cell.2017.05.038`). Why single-gene "trait genes" are a category error.
  **Tier: theory/landmark — high.**

**The "DNA-based diet / fitness" reality check:**
- **DIETFITS** (Gardner et al., *JAMA* 2018, `10.1001/jama.2018.0245`) + **FTO weight-loss meta-
  analysis** (Livingstone et al., *BMJ* 2016, `10.1136/bmj.i4707`). The two cleanest demonstrations
  that genotype does **not** predict diet/weight-loss response. **Tier: RCT + meta — strong.**

**Polygenic scores — promise and the ancestry caveat:**
- **Martin et al., *Nat Genet* 2019** (`10.1038/s41588-019-0379-x`) and **Mostafavi et al., *eLife*
  2020** (`10.7554/eLife.48376`). Why PRS are a population instrument, transfer poorly across (and even
  within) ancestries, and could widen disparities if used naively. **Tier: methods — strong.**

**Anatomy & physiology — the orientation textbooks (load-bearing references):**
- **OpenStax, *Anatomy and Physiology* (2e, 2022)** — free, CC-licensed, the cleanest open primer for
  levels of organization and the organ systems (§B.1–B.3). **Tier: textbook — solid, and free.**
- **Guyton & Hall, *Textbook of Medical Physiology* (14th ed., 2020)** — the standard reference for the
  homeostatic-loop framing and the three chains of §B.4. **Tier: textbook — canonical.**
- **Marieb & Hoehn, *Human Anatomy & Physiology*** — the most widely-used teaching text for the
  tissue/organ/system hierarchy. **Tier: textbook — solid.**

---

## Cross-links

- **Domain C (genetics/-omics mechanism):** `deelen-2019-longevity-meta-gwas`,
  `timmers-2019-parental-lifespan-gwas`, `marioni-2015-dnam-age-mortality`, `bell-2019-clock-consensus`,
  `higgins-chen-2022-pc-clocks`, `biomarkers-of-aging-consortium-validation-gap`,
  `wallace-2013-heteroplasmy-threshold` — this section builds the *practical* layer on these.
- **Section 01 (foundations):** §4 (DNA, epigenetics, the nutrient-sensing switches), §2 (the ATP
  chain), §6.2 (homeostasis/allostasis) — the mechanisms this section turns into navigation.
- **Section 04 (individual variation):** HERITAGE responders/non-responders, heritability-of-
  trainability — the gene × environment evidence (§A.8).
- **Section 11 (body systems):** the organ-by-organ detail the §B.3 table points into.
- **Section 07 / 08 / 02 / 03 / 05:** cardiovascular, brain, muscular, digestive/endocrine, autonomic —
  the systems whose homeostatic loops §B.3 maps.
- **Domain L (biomarkers):** the *validated* tests to act on instead of unvalidated methylation-age
  (§A.7).
- **UP to canon:** Hodgkin–Huxley excitability (the action potential, §B.4.3), chemiosmosis (§B.4.2),
  mitochondrial genetics (§A & Domain C) → `bucket-canon/05-biophysics/`.

> **Honesty footer.** Part B exists so that every lever in the manual can be placed on a real chain, in
> a real system, holding a real variable — because a recommendation you can't trace to a mechanism is a
> recommendation you can't trust.

---

## Sources & notes

[^omnigenic]: Boyle, Li & Pritchard — "An Expanded View of Complex Traits: From Polygenic to Omnigenic." Cell 2017. doi:10.1016/j.cell.2017.05.038. PMID 28622505.
[^apoe-risk]: Corder et al. — Science 1993. doi:10.1126/science.8346443. Meta-analysis: Farrer et al. — JAMA 1997. PMID 9343467.
[^hfe-penetrance]: Allen et al. (HealthIron cohort) — NEJM 2008. doi:10.1056/NEJMoa073286. PMID 18199861.
[^cpic-framework]: Relling & Klein (CPIC framework) — Clin Pharmacol Ther 2011. doi:10.1038/clpt.2011.34.
[^cpic-clopidogrel]: CPIC clopidogrel guideline, Lee et al. — 2022. doi:10.1002/cpt.2526.
[^acmg-sf]: ACMG SF v3.2, Miller et al. — Genet Med 2023. doi:10.1016/j.gim.2023.100866. PMID 37347242.
[^mthfr-acmg]: ACMG practice guideline "Lack of evidence for MTHFR polymorphism testing," Hickey et al. — Genet Med 2013. doi:10.1038/gim.2012.165. PMID 23288205.
[^prs-ancestry]: Martin et al. — Nat Genet 2019. doi:10.1038/s41588-019-0379-x. Mostafavi et al. — eLife 2020. doi:10.7554/eLife.48376.
[^dietfits]: DIETFITS, Gardner et al. — JAMA 2018. doi:10.1001/jama.2018.0245. PMID 29466592.
[^fto-weightloss]: Livingstone et al. — BMJ 2016. doi:10.1136/bmj.i4707. PMID 27650503.
