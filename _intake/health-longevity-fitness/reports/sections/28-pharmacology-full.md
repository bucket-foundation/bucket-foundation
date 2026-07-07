# 28 — Pharmacology (Full) & Pharmacogenomics

**Bottom line up front.** A drug's effect is the interaction of what it does (PD) and where it goes (PK) —
and the reason the same dose helps one person and harms another is almost always PK (age, kidney, liver,
genotype, interactions). Pharmacogenomics is the most useful personal genetics there is: a handful of
large-effect gene-drug pairs that prevent catastrophe or guide choice. Interactions and polypharmacy are
the under-appreciated danger of aging, and deprescribing is often the highest-value act. Placebo and nocebo
are real endogenous pharmacology. And "generic = brand," "natural ≠ safe," and "price ≠ cost" are the three
honest corrections that save money and prevent harm.

A useful drug produces a meaningful effect at a concentration your body can deliver and hold — without
reaching a concentration that harms. That window is the whole game. And the reason the same dose helps
one person and harms another is almost always what the body does to the drug: age, kidney, liver,
genotype, other medications. It is rarely a mystery in the molecule.

This chapter is the engine underneath the drug names: how drugs work at all, the major classes, how they
interact, and how your genome changes the answer. It covers pharmacodynamics, pharmacokinetics, the CYP450
system, the everyday drug classes, interactions and polypharmacy, and a deep pass on pharmacogenomics. The
longevity-and-disease drug index — GLP-1s, statins, antihypertensives, aspirin, geroprotectors, hormones,
graded by hard-outcome evidence — lives in §10.

*How to read this: Part A is the mechanism core; Parts B/C/D are a reference map — skim to your drug class;
Parts E–F are the myth corrections.*

Three honesty rules run through it. **Mechanism ≠ outcome** — "binds the receptor, moves the number" is
pharmacodynamics, not a trial result, and a drug that "should work" on paper has an unbroken history of
failing in trials (the homocysteine story, §18 A.5). **Average ≠ you** — a dose-response curve and a
half-life are population statistics that your genotype, age, and organ function move you off of (the whole
subject of the pharmacogenomics part). **Benefit and harm are one ledger** — every drug is a net
calculation of efficacy minus toxicity minus interaction risk, kept honest by NNT (how many people you
treat to prevent one event) and NNH (how many before one is harmed) (§10).

_Not medical advice — and structurally cannot be. This is an index of how the machinery works, not guidance
on what to take: every class below has a right patient and a wrong patient, and which one you are depends on
your kidneys, liver, age, other medications, and history. Dose, choice, and combination belong to you and a
clinician who can see your whole chart._

---

# PART A — HOW DRUGS WORK (THE FUNDAMENTALS)

A drug is a molecule that changes a physiological process. Understanding *any* drug means answering two
separate questions, and almost every prescribing decision is the interaction of the two:

- **Pharmacodynamics (PD): what the drug does to the body** — which molecular target it hits, and the
  shape of the dose-to-effect relationship. *("What does the drug do?")*
- **Pharmacokinetics (PK): what the body does to the drug** — how it gets in, spreads, is broken down,
  and leaves. *("Where does the drug go, and for how long?")*

Put those together and you have the **therapeutic window** — the distance between effect and harm that
every prescribing decision is trying to stay inside.

## A.1 Pharmacodynamics — targets, agonists, antagonists, and the dose-response curve

### A.1.1 Most drugs act on four kinds of protein

The body's machinery is mostly protein (section 01 §3.2), and so are most drug targets. Four families
cover the overwhelming majority of prescriptions:

| Target type | What it is | Drug examples |
|---|---|---|
| **Receptors** | Signal-receiving proteins (GPCRs, ion-channel-linked, nuclear hormone receptors, kinase receptors) | β-blockers, opioids, antihistamines, GLP-1 agonists, corticosteroids |
| **Enzymes** | Catalytic proteins; drugs usually *inhibit* them | Statins (HMG-CoA reductase), ACE inhibitors, NSAIDs (COX), PPIs (H⁺/K⁺-ATPase), SSRIs (reuptake transporter) |
| **Transporters / ion channels** | Move ions/molecules across membranes | Calcium-channel blockers, diuretics, SSRIs (SERT), PPIs |
| **Nucleic acids / other** | DNA, microbial targets, antibodies to a protein | Chemotherapeutics, antibiotics, monoclonal antibodies (PCSK9i, anti-CGRP) |

The recurring theme of section 01 returns here: **receptors are how the cell listens.** A hormone, a
neurotransmitter, and a drug that mimics either one are all *ligands* competing for the same binding
pocket. This is why so much pharmacology is the deliberate impersonation (or blockade) of the body's
own signals — insulin, adrenaline, histamine, GABA, dopamine, cortisol all have drug agonists and
antagonists.

### A.1.2 Agonist vs antagonist — the central vocabulary

- **Agonist:** binds the receptor and **activates** it, mimicking the natural ligand (morphine at the
  µ-opioid receptor; salbutamol at the β2 receptor; a GLP-1 agonist at the GLP-1 receptor).
- **Antagonist:** binds the receptor and **blocks** it without activating, so the natural signal can't
  get through (β-blockers at β1; naloxone at the opioid receptor; antihistamines at H1; losartan at the
  angiotensin receptor). "-blocker" and "-antagonist" usually flag this class.
- **Partial agonist:** activates the receptor but only to a *submaximal* ceiling no matter the dose —
  which means it can *also* behave as a functional antagonist by occupying the receptor and blocking a
  fuller agonist. **Buprenorphine** (opioid use disorder) is the clinically important example: enough
  effect to prevent withdrawal, a ceiling that limits overdose, and competition that blocks heroin.
- **Inverse agonist:** binds a receptor that has *baseline* activity and pushes it *below* baseline
  (some antihistamines and antipsychotics).
- **Allosteric modulator:** binds a *different* site and tunes the receptor's response to its natural
  ligand up or down. **Benzodiazepines** are the canonical positive allosteric modulators — they don't
  open the GABA-A channel themselves; they make GABA's own opening *more effective* (which is why
  they're safer alone than barbiturates, which force the channel open directly).

@@FIG:PS4-agonist-spectrum@@

### A.1.3 Affinity, efficacy, potency — three things people conflate

- **Affinity** = how tightly the drug binds (how low a concentration half-occupies the target).
- **Efficacy** = how big an effect a *bound* drug produces (a full agonist has high efficacy; an
  antagonist has zero).
- **Potency** = how much drug you need for a given effect (a function of both affinity and PK). **Potent
  is not the same as effective or safe** — fentanyl is far more *potent* than morphine (micrograms vs
  milligrams) without being a "better" analgesic; the potency is precisely what makes dosing errors
  lethal.

### A.1.4 The dose-response curve and the therapeutic index — the most important picture in pharmacology

Plot effect against dose (usually log-dose) and you get the **sigmoid dose-response curve**: little
effect at low dose, a steep middle, a plateau (E_max) once the targets are saturated. Two curves matter
at once — the **benefit** curve and the **toxicity** curve — and the distance between them is the
**therapeutic window**.

The classic summary is the **therapeutic index (TI)** ≈ toxic dose / effective dose (formally TD50/ED50
or the LD50/ED50 in animal data). It splits drugs into two clinically different worlds:

- **Wide therapeutic index** (penicillin, most SSRIs, ibuprofen at normal doses): the effective and
  toxic doses are far apart, so precise dosing is forgiving.
- **Narrow therapeutic index** (warfarin, digoxin, lithium, phenytoin, aminoglycosides, theophylline,
  many chemotherapeutics): effective and toxic concentrations nearly *touch*, so a small PK change — a
  drug interaction, a failing kidney, a CYP genotype — can flip "therapeutic" to "toxic" or "useless."
  **Narrow-TI drugs are where therapeutic drug monitoring, interaction-checking, and pharmacogenomics
  earn their keep.** When this section talks about danger, it is almost always a narrow-TI drug.

This is the same dose-response logic section 01 §3 uses for hormesis (a *sub*-damaging dose helps, an
excess harms): pharmacology is dose-response biology with a deliberately chosen molecule. **"The dose
makes the poison"** (Paracelsus) is not a slogan — it is the curve.

@@FIG:P04-dose-therapeutic-index@@

### A.1.5 Tolerance, dependence, and receptor adaptation

Receptors are not passive. Chronic stimulation often triggers **downregulation** (fewer receptors) or
desensitization → **tolerance** (the same dose does less, demanding more), while chronic blockade can
**upregulate** receptors so that abrupt withdrawal causes a rebound overshoot (why β-blockers and
clonidine must be tapered, not stopped). **Physical dependence** (a withdrawal syndrome on stopping) is
a predictable receptor-adaptation phenomenon and is *not* the same as **addiction** (compulsive use
despite harm) — conflating the two is a real source of harm in pain management (section 21, §14 nervous
system).

## A.2 Pharmacokinetics — ADME, the journey of a drug

PK is four processes, abbreviated **ADME**: **A**bsorption, **D**istribution, **M**etabolism,
**E**xcretion. They jointly determine the concentration-time curve — how high the drug goes, how fast,
and how long it stays.

@@FIG:PS3-adme@@

### A.2.1 Absorption and the first-pass effect

**Absorption** is how the drug gets into the bloodstream, and it depends on the **route**:

- **Oral** is convenient but lossy. A swallowed drug must survive stomach acid and gut enzymes, cross
  the intestinal wall, and then pass through the **liver via the portal vein before reaching the rest
  of the body** — the **first-pass effect**. The liver (and gut wall) can metabolize a large fraction
  *before it ever circulates*, which is why some drugs are useless orally (insulin, most peptides — they
  are digested) and why oral doses are often far larger than IV doses of the same drug.
- **Bioavailability (F)** is the fraction of an oral dose that reaches systemic circulation intact
  (IV = 100% by definition). Low oral bioavailability is usually a first-pass or absorption problem.
- **Other routes bypass first-pass:** IV (instant, complete), sublingual (nitroglycerin, buprenorphine
  — straight to systemic blood under the tongue), transdermal (fentanyl, nicotine, estradiol patches),
  inhaled (bronchodilators — local + fast), rectal, intramuscular/subcutaneous (most injected biologics
  and GLP-1s). Route choice is often *about* first-pass.

### A.2.2 Distribution — where the drug goes once it's in

**Distribution** is how the drug spreads from blood into tissues, governed by blood flow, lipid
solubility, and **protein binding**. Two practical consequences:

- **Protein binding.** Many drugs ride on plasma albumin; only the **free (unbound) fraction is
  active**. Two highly protein-bound drugs can compete for albumin — historically taught as an
  interaction mechanism (e.g., warfarin + sulfonamides), though its real-world magnitude is often
  overstated relative to metabolic interactions.
- **Barriers and compartments.** The **blood-brain barrier** keeps many drugs out of the CNS (why
  loratadine is non-sedating but diphenhydramine, which crosses, makes you drowsy); **fat-soluble drugs
  accumulate in adipose tissue** and release slowly (a reason dosing in obesity and in the elderly —
  who have more fat, less water, less muscle — is different; cross-ref geriatric
  polypharmacy, §D.3).

### A.2.3 Metabolism — the liver and the CYP450 system

**Metabolism** chemically transforms the drug, usually to make it more water-soluble so the kidney can
excrete it. It happens mostly in the **liver**, in two conceptual phases:

- **Phase I** (oxidation/reduction/hydrolysis) — dominated by the **cytochrome P450 (CYP) enzyme
  family**, which adds or exposes a reactive group. This is the single most interaction-prone and
  genetically variable step in all of pharmacology.
- **Phase II** (conjugation) — attaches a bulky water-soluble group (glucuronide, sulfate, glutathione,
  acetyl). UGT, NAT, GST, and **TPMT** are Phase II enzymes (TPMT matters enormously for thiopurines —
  §C).

**Prodrugs flip the logic:** some drugs are *inactive until metabolized* — clopidogrel and codeine are
the headline examples, both activated by CYP enzymes. For a prodrug, a *slow*-metabolizer genotype
means **too little active drug** (clopidogrel fails to protect; codeine gives no pain relief), while for
an ordinary active drug a slow metabolizer means **too much drug** (toxicity). This inversion is the
crux of the pharmacogenomics section.

**The CYP450 cast of characters.** A handful of CYP enzymes do most of the work; knowing the big four
explains most interactions and most PGx:

| CYP enzyme | Share of drug metabolism | Notable substrates | Why it matters |
|---|---|---|---|
| **CYP3A4/5** | ~Half of all metabolized drugs | statins (simvastatin, atorvastatin), many calcium-channel blockers, benzodiazepines, immunosuppressants, many opioids | The biggest target for interactions; **inhibited by grapefruit** (§D.2) |
| **CYP2D6** | ~20–25% of drugs | codeine/tramadol activation, many antidepressants & antipsychotics, tamoxifen, metoprolol | **Most genetically variable**; copy-number ranges from 0 to >2 → poor to ultra-rapid metabolizers (§C) |
| **CYP2C19** | ~10% of drugs | clopidogrel, PPIs, some antidepressants, voriconazole | Activates clopidogrel; clears PPIs; **loss-of-function common in East-Asian ancestry** (§C) |
| **CYP2C9** | ~10–15% of drugs | warfarin, phenytoin, many NSAIDs, sulfonylureas | Clears warfarin's active enantiomer; pairs with VKORC1 for warfarin dosing (§C) |

@@FIG:PX1-cyp450@@

**Inducers vs inhibitors — the interaction engine:**
- An **inhibitor** of a CYP slows metabolism of that CYP's substrates → substrate levels **rise** →
  toxicity risk. Strong CYP3A4 inhibitors: azole antifungals (ketoconazole), some macrolide antibiotics
  (clarithromycin), ritonavir, **grapefruit juice**.
- An **inducer** *increases* the amount of CYP enzyme → metabolism speeds up → substrate levels **fall**
  → loss of effect. Classic inducers: **rifampin, carbamazepine, phenytoin, St. John's Wort** — the last
  being the honest supplement lesson (a "natural" CYP3A4/P-gp inducer that has caused **transplant
  rejection and contraceptive failure**; full treatment §D.4).

### A.2.4 Excretion, half-life, and steady state

**Excretion** removes the drug, mostly via the **kidney** (water-soluble drugs and metabolites in urine)
and partly via bile/feces. **This is why renal function is dosing-critical:** a drug cleared by the
kidney accumulates to toxic levels in someone with chronic kidney disease or in the elderly (whose GFR — the
kidney's filtration rate — declines with age) unless the dose is reduced. Metformin, many antibiotics, digoxin, gabapentin, and
direct oral anticoagulants all need renal dose adjustment.

- **Half-life (t½)** = the time for the plasma concentration to fall by half. It sets **dosing
  frequency** (short t½ → dose more often or use extended-release) and the time to reach **steady state**
  (~4–5 half-lives of regular dosing to plateau — and the same ~4–5 half-lives to wash out after
  stopping). It is why a drug started today may not show its full effect for days, and why a drug
  stopped today may linger.

@@FIG:P05-half-life@@
- **Loading dose vs maintenance dose:** when you can't wait 4–5 half-lives (a life-threatening
  arrhythmia, a serious infection), a large **loading dose** fills the distribution volume fast, then a
  smaller maintenance dose replaces what's cleared.

> **PD + PK in one sentence:** the right drug is one whose **mechanism** moves a process that matters
> (PD), at a concentration its **journey through your body** can safely deliver and hold (PK) — and the
> reason "the same dose" affects two people differently is almost always a difference in that journey
> (age, kidney, liver, genotype, interactions), which is the rest of this section.

---

# PART B — THE MAJOR DRUG CLASSES (A LITERATE MAP)

A working orientation to the drugs most people actually encounter — what each class *does* (the PD), and
the honest caveats. Classes covered in depth in section 10 (lipid-lowering, antihypertensives,
antidiabetics, GLP-1s, geroprotectors, hormones, vaccines) are **cross-referenced, not repeated**.

## B.1 Analgesics — the honest version

Pain relief splits into three pharmacologically distinct tiers, and the honest framing matters because
this is where avoidable harm concentrates (cross-ref section 21 pain/rehab; section 14 §6 nervous
system).

### B.1.1 NSAIDs (ibuprofen, naproxen, diclofenac, celecoxib, aspirin)

- **Mechanism:** inhibit **cyclooxygenase (COX-1 and COX-2)**, blocking prostaglandin synthesis →
  anti-inflammatory, analgesic, antipyretic. COX-2 inhibition drives the benefit; **COX-1 inhibition
  drives much of the gastric harm** (prostaglandins protect the stomach lining), which is why selective
  COX-2 inhibitors (celecoxib) spare the stomach somewhat.
- **The honest harm column:** **GI bleeding and ulcers** (COX-1 effect), **kidney injury** (especially
  in dehydration, heart failure, CKD, or with ACE-inhibitor/ARB + diuretic — the "triple whammy"), fluid
  retention/**blood-pressure elevation**, and a real **cardiovascular-event signal** with chronic
  high-dose use of most NSAIDs (the COX-2/rofecoxib story). NSAIDs are *not* the benign default they're
  treated as — they are among the most common causes of drug-induced GI bleeds and acute kidney injury,
  particularly in older adults (§D.3, geriatrics).

### B.1.2 Acetaminophen / paracetamol

- **Mechanism:** still incompletely understood — central COX activity and other actions; **not
  meaningfully anti-inflammatory** and does **not** cause the GI/renal/CV problems of NSAIDs at normal
  doses, which makes it the safer first-line for many.
- **The one catastrophic caveat: hepatotoxicity in overdose.** A normally-cleared drug becomes a poison
  above a threshold: a toxic metabolite (NAPQI) overwhelms glutathione and destroys the liver.
  Acetaminophen overdose is a **leading cause of acute liver failure**, the danger is amplified by
  **alcohol and fasting** (which deplete glutathione), and the margin is uncomfortably narrow because the
  drug is hidden in dozens of combination cold/flu products — people double-dose without knowing. The
  antidote (N-acetylcysteine) works if given early. **Safe at the right dose, lethal at a dose not far
  above it** — a narrow-TI lesson hiding in the most ordinary OTC drug.

### B.1.3 Opioids — say it straight

- **Mechanism:** agonists at the **µ-opioid receptor** — potent analgesia plus euphoria, respiratory
  depression, constipation, sedation, tolerance, and dependence.
- **The honest evidence:** opioids are valuable for **acute severe pain, post-surgical pain,
  and cancer/palliative pain.** For **chronic non-cancer pain they are not superior to non-opioid
  regimens** — the **SPACE** trial (Krebs et al., 2018)[^space] found opioids
  *no better* (slightly worse) than non-opioid therapy for chronic back/osteoarthritis pain over 12
  months, at the cost of dependence and overdose risk (cross-ref section 21, section 14 §6.3). The
  overdose mechanism is **respiratory depression**, reversible by the antagonist **naloxone**.
- **The PGx (pharmacogenomics) landmine:** codeine and tramadol are **prodrugs activated by CYP2D6** — *ultra-rapid*
  metabolizers convert codeine to morphine dangerously fast (deaths in children, FDA boxed warning),
  *poor* metabolizers get no relief (§C). This is one of the few places PGx is unequivocally
  life-saving.

## B.2 Antibiotics — the resistance-aware short version

Detailed in section 26 (infectious disease); the pharmacology in one frame: antibiotics exploit
differences between bacterial and human cells — **cell-wall synthesis** (penicillins, cephalosporins —
the β-lactams; humans have no cell wall, hence their wide therapeutic index), **protein synthesis**
(macrolides, tetracyclines, aminoglycosides — the bacterial ribosome differs from ours), **DNA/folate
metabolism** (fluoroquinolones, sulfonamides, trimethoprim). The honest pharmacology points: (1)
**antibiotics do nothing for viruses** — the single most consequential misuse; (2) **resistance is an
evolutionary certainty under selection pressure**, so "finish the course / use only when indicated" is a
public-good calculation, not a personal one; (3) real class-specific harms (fluoroquinolone tendon
rupture and aortic risk; aminoglycoside oto-/nephrotoxicity — a narrow-TI class needing monitoring;
*C. difficile* colitis from broad-spectrum use disrupting the microbiome — cross-ref Domain C §4). PGx
intersects here too: **G6PD deficiency** contraindicates several drugs (some sulfonamides, primaquine)
that trigger hemolysis (§C).

## B.3 Cardiovascular drug classes (cross-ref section 10 + 22)

The cardiovascular drugs are the most outcome-proven in medicine and are covered for *outcomes* in
sections 10 (lipid-lowering, antihypertensives, aspirin) and 22 (cardiometabolic disease). The
mechanistic map:

| Class | Mechanism (PD) | Use | Section-10 cross-ref |
|---|---|---|---|
| **ACE inhibitors / ARBs** | Block angiotensin II production (ACEi) or its receptor (ARB) → vasodilation, less remodeling, renal protection | Hypertension, heart failure, CKD, post-MI | §10.3 |
| **Calcium-channel blockers** | Block Ca²⁺ entry → vasodilation (dihydropyridines, e.g. amlodipine) or rate control (verapamil/diltiazem) | Hypertension, angina, rate control | §10.3 |
| **Beta-blockers** | β-adrenergic *antagonists* → ↓heart rate, ↓contractility, ↓BP | Post-MI, heart failure, arrhythmia, angina (not first-line for plain HTN) | §10.3 |
| **Diuretics** | ↑renal Na⁺/water excretion (thiazides, loop, K⁺-sparing) | Hypertension, heart failure/edema | §10.3 |
| **Statins & lipid-lowering** | HMG-CoA reductase inhibition; ezetimibe (absorption); PCSK9i (LDL-receptor recycling) | ASCVD prevention | §10.2 (full treatment) |
| **Anticoagulants / antiplatelets** | See §B.4.5 | Clot prevention | §10.4 (aspirin) |

## B.4 The other everyday classes

### B.4.1 Antihistamines (H1 antagonists)

- **Mechanism:** **H1-receptor antagonists** for allergy (and the related **H2 antagonists** — ranitidine,
  famotidine — for acid suppression, a different receptor).
- **The generational divide that matters:** **first-generation** antihistamines (**diphenhydramine**
  /Benadryl, chlorpheniramine, hydroxyzine) cross the blood-brain barrier → **sedation and
  anticholinergic effects** (dry mouth, urinary retention, confusion). They are **strongly cautioned in
  older adults** (on the Beers list) and the cumulative **anticholinergic burden** is associated with
  cognitive decline and dementia risk (§D.3; cross-ref section 19/20). **Second-generation**
  (loratadine, cetirizine, fexofenadine) barely cross the BBB → non-sedating and far safer. "Using
  Benadryl as a sleep aid" is exactly the habit the geriatric-pharmacology literature warns against.

### B.4.2 Proton-pump inhibitors (PPIs: omeprazole, pantoprazole, esomeprazole)

- **Mechanism:** **irreversibly inhibit the gastric H⁺/K⁺-ATPase** (the "proton pump") → near-complete
  acid suppression. Highly effective for GERD, peptic ulcers, and *H. pylori* regimens.
- **The honest nuance:** valuable for clear indications, but **massively over-used long-term**
  for symptoms that don't need indefinite acid blockade. Long-term observational associations (B12/
  magnesium/iron malabsorption, increased enteric infection including *C. diff*, possible bone-fracture
  and kidney signals) are mostly **confounded cohort data** — not proven causal, but enough to make
  "lowest effective dose, deprescribe when possible, don't stay on it by inertia" the honest stance.
  **Rebound hyperacidity** on stopping (the pump upregulation problem) traps people on them.

### B.4.3 Corticosteroids (prednisone, dexamethasone, inhaled/topical steroids)

- **Mechanism:** agonists at the **glucocorticoid receptor** (a nuclear hormone receptor) → broad
  **anti-inflammatory and immunosuppressive** effects by reprogramming gene transcription. Among the most
  powerful and versatile drugs in medicine (asthma/COPD flares, autoimmune disease, allergic reactions,
  some cancers).
- **The honest harm column scales with dose × duration:** short courses are usually well-tolerated;
  chronic systemic steroids cause **hyperglycemia, osteoporosis, muscle wasting, weight gain/Cushingoid
  changes, immunosuppression, cataracts, mood changes, skin thinning, and adrenal suppression** — which
  is why chronic steroids must be **tapered, never stopped abruptly** (the HPA axis needs time to
  restart its own cortisol; cross-ref section 13 endocrine). Inhaled and topical formulations are
  designed to localize the effect and minimize systemic exposure.

### B.4.4 Bronchodilators & inhaled respiratory drugs

- **Mechanism:** **β2-adrenergic agonists** relax airway smooth muscle — **short-acting (SABA:
  albuterol/salbutamol)** for rescue, **long-acting (LABA: salmeterol, formoterol)** for control;
  **muscarinic antagonists (SAMA/LAMA: ipratropium, tiotropium)** block bronchoconstriction; **inhaled
  corticosteroids (ICS)** treat the underlying inflammation. Asthma/COPD management is largely about
  combining these (cross-ref section 23 respiratory disease). The honest point: **a reliever inhaler
  treats the symptom; the controller (ICS) treats the disease** — over-reliance on the rescue inhaler
  without a controller is a known marker of poorly-controlled, higher-risk asthma.

### B.4.5 Anticoagulants & antiplatelets

- **Antiplatelets** (aspirin — irreversible COX-1 → less thromboxane; clopidogrel/ticagrelor — P2Y12
  receptor blockers) prevent **arterial** clots (heart attack/stroke).
- **Anticoagulants** prevent **venous/cardioembolic** clots. **Warfarin** (a vitamin-K-epoxide-reductase
  inhibitor) is the classic narrow-TI drug, where safe and toxic doses nearly touch. It needs INR
  monitoring (a blood test of how long clotting takes), carries a huge diet/drug-interaction surface, and
  is the textbook PGx case (§C). The **direct oral anticoagulants (DOACs:** apixaban, rivaroxaban,
  dabigatran**)** directly inhibit factor Xa or thrombin with **far less monitoring and fewer
  interactions** — the major prescribing shift of the last decade. **All anticoagulants trade clot
  prevention for bleeding risk** — the single cleanest example of the benefit-and-harm-are-one-ledger
  rule (cross-ref aspirin/ASPREE, §10.4).

### B.4.6 Common OTC drugs — the honest reminders

"OTC" means *available without a prescription*, not *without consequence* — the drugstore aisle is real
pharmacology with real interactions (NSAIDs §B.1.1, acetaminophen §B.1.2, first-gen antihistamines/"PM"
sleep aids §B.4.1). Two additions the earlier sections don't cover: **decongestants** raise BP (pseudoephedrine/
phenylephrine), and oral **phenylephrine** is **barely effective** by recent FDA review; and **antacids**
can chelate and block absorption of other drugs — separate the dosing.

## B.5 Antidepressants, anxiolytics, antidiabetics — pointers

These are owned by their dedicated sections; the one-line mechanistic placeholder plus cross-ref:
- **Antidepressants / anxiolytics** (SSRIs/SNRIs — reuptake-transporter inhibition; benzodiazepines —
  GABA-A positive allosteric modulators, §A.1.2): full treatment in **section 20 (mental
  health/psychiatry)** and **section 14 (nervous system)**. PGx (CYP2D6/2C19 and antidepressant dosing)
  in §C.
- **Antidiabetics** (metformin — AMPK/hepatic glucose output; sulfonylureas — insulin secretion; SGLT2
  inhibitors — urinary glucose loss; GLP-1 agonists — incretin): full treatment in **section 10** and
  **section 22 (cardiometabolic disease)**, Domain D.

---

# PART C — PHARMACOGENOMICS (THE DEPTH)

**Pharmacogenomics is the single most useful clinical genetics there is.** Not a probability nudge — a
specific instruction. Give a child codeine when she carries the ultra-fast-metabolizer version of one
gene and her body can convert it to a lethal dose of morphine; give it to a slow metabolizer and she
gets no pain relief at all. Same drug, same dose, opposite outcomes, decided by a single inherited
variant. These are large-effect variants with a defined clinical action — the opposite of polygenic
"wellness" noise. This part extends the practical-PGx primer in section 18 §A.2.4 with the mechanism and
the actionable detail.

@@FIG:PX2-pharmacogenomics@@

## C.1 The idea, and a one-paragraph history

**Pharmacogenetics** — the study of how inherited variation changes drug response — was named by the
German geneticist **Friedrich Vogel in 1959**, building on **Arno Motulsky's** 1957 synthesis that
"inheritance might explain many individual differences in drug response." **Werner Kalow's** 1962
foundational monograph put it on firm ground: Kalow showed inherited pseudocholinesterase variants caused
prolonged paralysis from the muscle relaxant succinylcholine — one of the first clean gene-drug stories.
The discipline's modern, *actionable* form is the **Clinical Pharmacogenetics Implementation Consortium (CPIC)**, founded
2009 and led for years by **Mary V. Relling** and **Teri Klein**, which writes the freely-available,
peer-reviewed guidelines that translate a genotype into a **specific dosing action** (cpicpgx.org;
framework Relling & Klein, 2011)[^cpic-framework]. **The shift CPIC
represents is the whole point: from "interesting genetic association" to "if genotype = X, do Y."**

## C.2 The metabolizer-phenotype concept

A CYP genotype is translated into a **metabolizer phenotype** — the practical output, a spectrum from poor (PM) through intermediate (IM) and normal (NM) to ultrarapid (UM) metabolizer (figure below).

The **prodrug inversion** is the part clinicians must hold in their head: for a normal drug, PM = danger;
for a prodrug, **UM = danger**. CYP2D6 is the most extreme case because its activity ranges from **zero
(gene deletion) to ultra-rapid (gene duplication/multiplication)** across a continuous spectrum, and its
allele frequencies vary sharply by ancestry.

@@FIG:Z03-metabolizer-prodrug@@

## C.3 The actionable gene-drug pairs (the ones with a body count or a guideline)

These are the pairs where a cheap, one-time genotype changes a real decision. (Cross-ref §18 A.2.4 for
the practical-genetics framing; this is the prescribing detail.)

| Gene | Drug(s) | What the variant does | Clinical action | Tier / guideline |
|---|---|---|---|---|
| **CYP2C19** | **Clopidogrel (Plavix)** | Loss-of-function → can't activate the prodrug → **less antiplatelet protection** after stent/ACS (stent thrombosis, stroke) | Use an alternative (prasugrel/ticagrelor) in LoF carriers; LoF common in East-Asian ancestry | **CPIC** (Lee et al. 2022)[^cpic-clopidogrel] — `rct`-supported (the strongest evidence tier; TAILOR-PCI direction) |
| **CYP2D6** | **Codeine, tramadol** (prodrug opioids) | UM → fast morphine conversion (**overdose, infant deaths via breast milk**); PM → no analgesia | Avoid codeine/tramadol in UM and PM; use a non-CYP2D6 opioid | **CPIC** (Crews et al. 2021)[^cpic-codeine]; **FDA boxed warning** |
| **CYP2C9 + VKORC1** | **Warfarin** | CYP2C9 clears warfarin; VKORC1 sets target sensitivity → genotype explains a large share of **dose variance** | Genotype-guided starting dose (also CYP4F2); narrow-TI drug | **CPIC** (Johnson et al. 2017)[^cpic-warfarin] — dosing strong; *outcome* benefit vs INR-monitoring mixed |
| **TPMT / NUDT15** | **Thiopurines** (azathioprine, 6-MP) | Deficiency → can't inactivate → **drug accumulates → life-threatening myelosuppression** at standard dose | Test **before** treating; reduce dose drastically or avoid in deficient patients | **CPIC** (Relling et al. 2019)[^cpic-thiopurine] — strong, standard of care |
| **DPYD** | **Fluoropyrimidines** (5-FU, capecitabine) | Deficiency → can't clear → **fatal toxicity** | Pre-treatment testing now standard in much of Europe; reduce dose/avoid | **CPIC**/EMA — strong; a strong mechanistic and observational case for prevented fatalities |
| **SLCO1B1** | **Simvastatin** (statins) | Transporter variant → ↑muscle exposure → **myopathy** | Lower dose / choose a different statin | **CPIC** — moderate |
| **HLA-B\*57:01** | **Abacavir** (HIV) | Predicts severe hypersensitivity reaction | **Mandatory test before prescribing** | **PREDICT-1 RCT** — near-100% NPV (a negative test all but rules the reaction out); standard of care |
| **HLA-B\*15:02 / HLA-A\*31:01** | **Carbamazepine, allopurinol** | Predicts Stevens-Johnson syndrome / TEN (potentially fatal skin reactions) | Test before prescribing in at-risk ancestries | **CPIC**/FDA — strong |
| **G6PD** | Several oxidant drugs (primaquine, rasburicase, some sulfonamides, dapsone) | Deficiency → **acute hemolysis** | Test before oxidant drugs | Strong; X-linked, common in some ancestries |
| **CYP2D6 / CYP2C19** | **Antidepressants** (SSRIs, TCAs), some antipsychotics, **tamoxifen** | Alters levels/activation; tamoxifen needs CYP2D6 to form active endoxifen | Dose adjustment; drug choice | **CPIC** — moderate (psychotropics); tamoxifen contested |

**The pattern that makes these "the good kind" (from §18):** each is a **single large-effect variant**
with a **defined action** — change the drug or the dose. That is the opposite of a polygenic risk score,
and it is why this is the most defensible application of personal genomics that exists.

## C.4 When PGx testing is useful vs oversold

Honesty cuts both ways here — PGx is *both* the most useful clinical genetics *and* a fast-growing
commercial product where the marketing outruns the evidence.

**useful (test before, or test to guide):**
- **HLA-B\*57:01 before abacavir, DPYD before fluoropyrimidines, TPMT/NUDT15 before thiopurines,
  HLA-B\*15:02 before carbamazepine in at-risk ancestries, G6PD before oxidant drugs** — these are
  *pre-emptive, single-gene, prevent-a-catastrophe* tests with clear guidelines. This is PGx at its
  strongest: a cheap test that prevents a sometimes-fatal reaction.
- **CYP2C19 for clopidogrel** in PCI/stroke and **CYP2D6 for codeine/tramadol** — strong, actionable,
  with guideline + (for clopidogrel) trial direction behind them.

**Oversold / not-ready / contested:**
- **Broad "psychiatric pharmacogenomic panels"** (marketed direct-to-consumer and to clinics to "pick
  your antidepressant") are the contested zone. The largest pragmatic trials (e.g. **PRIME Care**, VA,
  *JAMA* 2022) show **small, short-lived effects at best** — genotype-guided prescribing modestly reduced
  use of drugs with predicted interactions but produced **no durable improvement in remission**. The
  combinatorial "proprietary algorithm" panels claim more than the gene-by-gene evidence supports.
- **Routine pre-emptive PGx for everyone** is promising and being piloted (panel testing once, used over
  a lifetime), but is not yet standard, and the evidence is strongest for the specific high-stakes pairs
  above, not for a whole-genome "you metabolize everything" dashboard.
- **The reimbursement/format problem:** a positive PGx result is only useful if it reaches the
  prescriber *at the moment of prescribing* (clinical decision support) — a genotype buried in a PDF
  changes nothing. The science is ahead of the plumbing.

> **The PGx stance for this manual.** Pre-emptive single-gene testing before the handful of
> catastrophe-prone drugs (HLA/abacavir & carbamazepine, DPYD, TPMT/NUDT15, G6PD) and genotype-guided
> choice for clopidogrel and codeine are **real, guideline-backed, sometimes life-saving** — the best
> use of personal genetics there is. Broad consumer "which antidepressant / which drug is right for your
> DNA" panels are **mostly ahead of their evidence.** Same rule as §18: large-effect-variant + defined
> action = useful; everything fuzzier is a product.

---

# PART D — DRUG INTERACTIONS & POLYPHARMACY

## D.1 The two mechanisms of interaction

- **Pharmacokinetic interactions** (one drug changes another's ADME — usually via **CYP induction/
  inhibition**, §A.2.3, or transporter/protein-binding effects). Example: a CYP3A4 inhibitor raises a
  statin's level → myopathy; a CYP3A4 inducer (rifampin, St. John's Wort) lowers a contraceptive's level
  → pregnancy.
- **Pharmacodynamic interactions** (two drugs act on the *same system*, adding or opposing). Examples:
  two CNS depressants (an opioid + a benzodiazepine + alcohol) → additive **respiratory depression**, a
  major overdose mechanism; multiple serotonergic drugs (an SSRI + tramadol + a triptan) → **serotonin
  syndrome**; NSAID + anticoagulant → additive bleeding; multiple QT-prolonging drugs → arrhythmia.

## D.2 Grapefruit and the CYP3A4 story — the everyday example

**Grapefruit juice irreversibly inhibits intestinal CYP3A4** (via furanocoumarins), so a normal dose of
a CYP3A4 substrate is absorbed *as if it were a larger dose* — the body's first-pass metabolism is
disabled and drug levels can rise sharply. It matters most for **narrow-TI CYP3A4 substrates** (where
safe and toxic doses nearly touch): some statins (simvastatin, lovastatin → myopathy risk), certain
calcium-channel blockers, some immunosuppressants and antiarrhythmics, and others — the documented list
runs to dozens of drugs (Bailey et al., 2013)[^bailey-grapefruit]. The effect can last **24+ hours**, so "take it at a
different time" doesn't fix it. It is the cleanest everyday demonstration that **a food is a drug
interaction**, and that "natural" confers nothing.

## D.3 Polypharmacy — the real danger in aging

This is where pharmacology becomes a geriatric-medicine problem (cross-ref section 19 life stages; §D.3):

- **Polypharmacy** (commonly defined as ≥5 regular medications) is increasingly the norm in older
  adults, and **risk compounds combinatorially**: the chance of a clinically significant interaction
  rises steeply with each added drug, and the aging body **changes the PK** (lower renal clearance, more
  fat / less water, lower albumin, more drug accumulation) *and* the PD (more sensitivity to CNS
  depressants, anticholinergics, and hypotensives).
- **The prescribing cascade** — a side effect of drug An is misread as a new disease and treated with
  drug B, whose side effect prompts drug C — is a central driver, and a leading *reversible* cause of
  falls, confusion, and hospitalization in older adults.
- **The tools:** the **Beers Criteria** (potentially inappropriate medications in older adults — anti-
  cholinergics, long-acting benzodiazepines, certain NSAIDs) and **STOPP/START** formalize what to stop
  and what's being under-used. **Anticholinergic burden** (first-gen antihistamines, some bladder and
  psychiatric drugs, TCAs) is a specific, cumulative, dementia-and-fall-associated hazard.
- **The honest move is often *deprescribing*** — the systematic withdrawal of drugs whose harm now
  outweighs benefit. As section 10 says with aspirin: **subtracting a low-value drug is as much a
  longevity act as adding a good one.** In geriatrics this is frequently the single highest-value
  intervention available.

@@FIG:F09-deprescribing@@

## D.4 The supplement-drug interaction reality (honest)

Supplements are pharmacology that markets itself as not-pharmacology — and the interaction surface is
real and routinely ignored because people don't *tell their doctor* about supplements ("it's natural"):

- **St. John's Wort** — potent CYP3A4 and **P-glycoprotein** (a drug-efflux pump) **inducer**; has caused
  **transplant rejection, contraceptive failure, and loss of HIV/anticoagulant drug efficacy** by
  accelerating clearance. The flagship "natural-is-not-inert" case.
- **Vitamin K** (and K-rich greens) ↔ **warfarin** (antagonizes it — consistency matters more than
  avoidance); **fish oil, vitamin E, ginkgo, garlic** ↔ additive **bleeding** with anticoagulants/
  antiplatelets; **calcium / iron / magnesium / antacids** chelate and **block absorption** of many
  antibiotics and thyroid hormone (separate dosing); **grapefruit** (§D.2).
- **The quality problem compounds it:** because supplement contents and dose are uncertain (the DSHEA
  quality gap, §F.3), the interaction is unpredictable in both direction and magnitude.
- **The honest rule:** "natural" predicts nothing about interaction risk. **Tell every prescriber every
  supplement** — it is the cheapest safety intervention there is, and the one most often skipped.

---

# PART E — THE PLACEBO & NOCEBO EFFECTS AS REAL PHARMACOLOGY

The placebo response is not "nothing" — it is a **measurable neurobiological phenomenon** and belongs in
a pharmacology chapter as a real, dose-able effect that every drug rides on top of.

@@FIG:F10-placebo-nocebo@@

- **Placebo is real physiology, not just reporting bias.** Placebo analgesia is partly **endogenous-
  opioid mediated** — it is **blocked by naloxone** (Levine et al., *Lancet* 1978), which is about as
  hard a piece of evidence as exists that "expectation" recruits the same receptor systems drugs do.
  Placebo responses show **dopaminergic** signatures in Parkinson's, conditioned immune and endocrine
  responses, and reproducible brain-imaging correlates. The effect has a **dose-response of its own**
  (more "treatment" ritual → bigger response; injections beat pills; "expensive" beats "cheap").
- **Why every RCT has a placebo arm:** because the *drug* effect is the **increment over** an often-large
  placebo response, not the total improvement. Much of what naïve before/after testimonials and
  uncontrolled supplement "studies" measure is the placebo response plus regression to the mean plus
  natural history — which is exactly why the evidence ladder (`SCHEMA.md`) ranks the RCT above the
  anecdote. **The placebo effect is the reason "it worked for me" is the weakest tier of evidence.**
- **Open-label placebo — the strange frontier.** Placebos can produce benefit **even when the patient is
  told it's a placebo** (open-label placebo, e.g. Kaptchuk's IBS work, 2010)[^kaptchuk-olp] —
  suggesting the ritual and conditioning, not just deception, carry
  part of the effect. Real, but modest, and mostly studied in symptom-based conditions (pain, IBS,
  fatigue), **not** in disease that needs a pharmacological cure.
- **Nocebo — the evil twin, and it's clinically expensive.** **Negative** expectation produces **real
  adverse symptoms**: told a drug causes headaches, more people get headaches — on the *placebo* arm.
  This is not hypothetical: the **statin nocebo finding** (SAMSON, §10.2.3 — ~90% of "statin side
  effects" occurred on placebo months too) and the well-documented **nocebo barrier to generic
  switching** (people told they're getting a "different" pill report more side effects) are major,
  measurable drivers of real-world non-adherence. Nocebo is *why* how a drug is described changes how it
  is tolerated — and why the "everyone knows statins wreck your muscles" cultural script is partly
  self-fulfilling.

> **The pharmacology lesson:** placebo and nocebo are not the *absence* of pharmacology — they are
> endogenous pharmacology (your own opioid/dopamine/stress systems) triggered by expectation, running
> in parallel with whatever the drug does. That is exactly why a controlled comparison is the only way
> to isolate a drug's *own* effect, and why "I felt better" is evidence about *you on that day*, not
> about the molecule.

---

# PART F — HONEST FRAMING (THE THINGS THE MARKETING GETS WRONG)

## F.1 Generic = brand (bioequivalence is a real, enforced standard)

A **generic** drug contains the same active ingredient, strength, route, and dosage form as the brand,
and must prove **bioequivalence** — that its concentration-time curve (peak concentration C_max and total
exposure AUC) falls within a regulator-defined window of the brand's (the FDA standard requires the 90%
confidence interval of the generic/brand ratio to sit within **80–125%**, which sounds loose but, because
it's a *confidence interval around the mean*, in practice means the averages are typically within a few
percent). Generics are **not "weaker" or "lower quality"** — they are the same drug at a fraction of the
price once patent exclusivity ends. **The main honest caveats are narrow:** (1) for a **narrow-TI drug**
(warfarin, levothyroxine, some antiepileptics, tacrolimus) it's reasonable to stay on a *consistent*
product and re-check levels when switching, because small differences matter more there; (2) the
*inactive* excipients differ, which rarely but occasionally matters (a dye/filler intolerance); (3)
**nocebo** drives a lot of "the generic doesn't work for me" reports (§E). For the vast majority of
drugs, insisting on brand-name is paying more for the marketing, not the medicine.

## F.2 The "natural = safe" fallacy

"Natural" is a claim about *origin*, not about *safety, efficacy, or dose* — and it predicts none of
them. Digitalis (foxglove), warfarin (sweet clover), the most potent toxins known (botulinum, ricin,
tetrodotoxin), and the deadliest carcinogens (aflatoxin) are all "natural." St. John's Wort is a natural
product that causes serious drug interactions (§D.4); grapefruit is a natural CYP3A4 inhibitor (§D.2);
many herbal products are hepatotoxic. **The honest reframing:** the questions that matter — *does it
work, at what dose, with what harms, and what does it interact with?* — are identical for a plant extract
and a synthesized molecule. "Natural" answers none of them. (This is the supplement-side twin of the
mechanism-≠-outcome rule that runs through the whole manual.)

## F.3 Supplement quality & the regulation gap

In the US, dietary supplements are regulated under **DSHEA (1994)** as a **food-like category, not as
drugs** — meaning they **do not need to prove efficacy or safety before sale**, and the FDA must act
*after* a product is on the market. The documented consequences:

- **Label ≠ contents.** Independent testing (USP, NSF, ConsumerLab, and academic analyses) repeatedly
  finds products with **less, more, or none** of the labeled ingredient, **mislabeled species** (herbal
  DNA-barcoding studies), and **undeclared pharmaceutical adulterants** — most dangerously, hidden
  prescription drugs (sildenafil analogs in "male enhancement," sibutramine in "weight loss," steroids
  in "muscle building") and contaminants, documented across years of FDA recalls.
- **The actionable hygiene:** third-party certification (**USP Verified, NSF Certified for Sport,
  Informed Choice**) is the only real signal of what's actually in the bottle, because the label alone
  isn't verified before sale. This is the regulation gap that section 03 (nutrition/supplements) treats
  in full — flagged here so the *pharmacological* reader understands **a supplement is a drug with worse
  quality control and no efficacy requirement.**

## F.4 Drug-development & cost reality (brief, honest)

- **It's hard.** Most candidate drugs fail; the journey from target to approval spans
  preclinical → Phase I (safety) → Phase II (does it work?) → Phase III (large RCT) → regulatory review,
  takes many years, and the **vast majority of compounds that enter human trials never reach market** —
  most failures are in **Phase II/III for lack of efficacy**, the mechanism-≠-outcome rule killing
  drugs that "should have worked."
- **It's expensive — and the headline figures are contested.** The often-cited "~$1–2.6
  billion per approved drug" estimates (DiMasi et al.) include the **capitalized cost of all the
  failures and the cost of capital**; critics put the out-of-pocket figure far lower. The honest reading:
  *aggregate* R&D is expensive largely *because most drugs fail*, while *individual* successful-drug
  accounting is a contested, advocacy-laden number.
- **Price ≠ cost.** The **price** of a drug (especially an US list price) is set by market exclusivity,
  patents, and what payers will bear — **not by its manufacturing cost**, which for most small molecules
  is pennies, and not in any simple way by its R&D. The collapse to near-free **once a drug goes generic**
  (§F.1) is the proof: the molecule didn't change, the monopoly ended. This is why "it's expensive
  because it's cutting-edge" and "generics are cheap because they're inferior" are *both* wrong — price
  tracks exclusivity, not quality or cost.

---

## The honest synthesis

Pharmacology is **dose-response biology aimed at a chosen molecular target**, delivered through a body
that absorbs, distributes, metabolizes, and excretes on its own genetically-variable schedule. The five
recurring lessons of this whole section are exactly the five in the BLUF and the honesty footer below —
PK explains why the same dose helps one person and harms another; pharmacogenomics is the one personal
genetics that pays; interactions/polypharmacy/deprescribing dominate in aging; placebo and nocebo are
real endogenous pharmacology; and "generic = brand," "natural ≠ safe," "price ≠ cost" are the three
money-and-harm corrections.

---

### Go deeper

**The fundamentals (PD/PK/CYP) — the standard references:**
- **Goodman & Gilman's *The Pharmacological Basis of Therapeutics* (14th ed.)** and **Katzung's *Basic &
  Clinical Pharmacology*** — the canonical textbooks for everything in Part A (receptors, dose-response,
  ADME, the CYP system). **Tier: textbook — canonical.**
- **Rang & Dale's *Pharmacology*** — the cleanest teaching treatment of agonist/antagonist/partial-
  agonist pharmacodynamics (§A.1). **Tier: textbook — solid.**

**Pharmacogenomics — the actionable, guideline-grade home:**
- **CPIC guidelines** (cpicpgx.org; framework **Relling & Klein**, *Clin Pharmacol Ther* 2011,
  `10.1038/clpt.2011.34`) — the freely-available, peer-reviewed gene-drug dosing guidelines. The single
  best resource for "if genotype = X, do Y." **Tier: implementation guideline — strong.**
- **CYP2C19 / clopidogrel** (Lee et al. 2022, `10.1002/cpt.2526`); **CYP2D6 / opioids** (Crews et al.
  2021, `10.1002/cpt.2149`); **CYP2C9+VKORC1 / warfarin** (Johnson et al. 2017, `10.1002/cpt.668`);
  **TPMT/NUDT15 / thiopurines** (Relling et al. 2019, `10.1002/cpt.1304`). The four worked examples.
  **Tier: guideline (clopidogrel/codeine `rct`-supported) — strong.**
- **PharmGKB** (pharmgkb.org) — the curated knowledge base of variant-drug relationships behind CPIC.
  **Tier: curated database — strong.**

**Interactions, geriatrics, deprescribing:**
- **Bailey DG, et al. "Grapefruit–medication interactions."** *CMAJ* 2013, `10.1503/cmaj.120951` — the
  definitive everyday CYP3A4 interaction. **Tier: review — strong.**
- **AGS Beers Criteria** (updated periodically in *J Am Geriatr Soc*) and **STOPP/START** — the
  potentially-inappropriate-medication tools that operationalize the polypharmacy section (§D.3). **Tier:
  consensus guideline — strong.**

**Placebo/nocebo:**
- **Levine JD, et al.** *Lancet* 1978 — naloxone-reversible placebo analgesia, the hard evidence that
  placebo recruits endogenous opioids. **Kaptchuk TJ, et al.** *PLoS ONE* 2010, `10.1371/journal.pone.0015591`
  — open-label placebo in IBS. **SAMSON** (Wood 2020, `10.1056/NEJMc2031173`, §10.2.3) — the statin
  nocebo n-of-1. **Tier: rct/mechanistic — strong on the phenomenon, modest on magnitude.**

**Honest framing (generics, supplements, drug development):**
- **FDA Orange Book / bioequivalence guidance** — the 80–125% standard behind "generic = brand" (§F.1).
- **DSHEA (1994)** and the FDA supplement-adulteration recall record + **USP/NSF** verification programs —
  the regulation gap (§F.3); cross-ref section 03. **Tier: regulatory — definitive on the rules.**
- **DiMasi JA, et al.** *J Health Econ* 2016 (the contested ~$2.6B figure) — read *with* its critics for
  the honest cost picture (§F.4). **Tier: economics — contested by design.**

---

## Cross-links

- **Section 10 (medical & pharmacology):** the longevity/disease drug index this section is the engine
  under — GLP-1s, statins, antihypertensives, aspirin/ASPREE, vaccines, geroprotectors, hormones.
  **Do not duplicate — extend.**
- **Section 18 (genetics/anatomy) §A.2.4:** the practical-PGx primer this Part C extends; and §A.5
  (MTHFR / homocysteine) as the mechanism-≠-outcome twin of §A.1.
- **Section 01 (foundations):** §3 (hormesis dose-response = the dose-response curve, §A.1.4), §4.3
  (nutrient-sensing receptors), §3.2 (proteins as drug targets), §6.3 (redox signaling).
- **Section 21 (pain/injury/rehab) & 14 (nervous system §6):** opioids/SPACE, NSAIDs, the honest pain
  ladder (§B.1).
- **Section 19 (life stages) & geriatrics:** polypharmacy, Beers, deprescribing (§D.3).
- **Section 20 (mental health) & 13 (endocrine):** antidepressants/anxiolytics and corticosteroid/HPA
  detail the placeholders in §B.4–B.5.
- **Section 03 (nutrition/supplements):** the supplement quality/regulation gap (§F.3) in full.
- **Section 22/23/26:** cardiometabolic, respiratory/GI, and infectious-disease drug detail (§B.2–B.4).

> **Honesty footer.** This section refuses two opposite errors: **pharmacophobia** ("drugs are poisons /
> natural is safer") — which ignores that the best-evidenced interventions in this whole manual are
> prescription drugs for disease states (§10), and that "natural" is a marketing word with no
> pharmacological meaning (§F.2) — and **pharmacological over-optimism** ("a pill / a peptide / a panel
> for everything") — which ignores that most drugs fail in trials, that the same dose is *not* the same
> in your body, that interactions compound silently with age, and that a large part of "it worked" is
> your own endogenous placebo pharmacology. Mechanism is a hypothesis; the controlled outcome is the
> evidence; the net ledger, for *this* person on *these* drugs, is the only thing that counts.

---

## Sources & notes

[^space]: SPACE — Krebs EE et al., *JAMA* 2018. doi:10.1001/jama.2018.0899. claim: opioids-chronic-noncancer-pain-not-superior (rct)
[^cpic-framework]: CPIC framework — Relling MV & Klein TE, *Clin Pharmacol Ther* 2011. doi:10.1038/clpt.2011.34. claim: cpic-genotype-to-action
[^cpic-clopidogrel]: CPIC — Lee CR et al., *Clin Pharmacol Ther* 2022. doi:10.1002/cpt.2526. claim: cyp2c19-clopidogrel (rct-supported, TAILOR-PCI direction)
[^cpic-codeine]: CPIC — Crews KR et al., *Clin Pharmacol Ther* 2021. doi:10.1002/cpt.2149. FDA boxed warning. claim: cyp2d6-codeine-tramadol
[^cpic-warfarin]: CPIC — Johnson JA et al., *Clin Pharmacol Ther* 2017. doi:10.1002/cpt.668. claim: cyp2c9-vkorc1-warfarin-dosing
[^cpic-thiopurine]: CPIC — Relling MV et al., *Clin Pharmacol Ther* 2019. doi:10.1002/cpt.1304. claim: tpmt-nudt15-thiopurine
[^bailey-grapefruit]: Bailey DG et al., "Grapefruit–medication interactions." *CMAJ* 2013. doi:10.1503/cmaj.120951. claim: grapefruit-cyp3a4-inhibition
[^kaptchuk-olp]: Kaptchuk TJ et al., open-label placebo in IBS. *PLoS ONE* 2010. doi:10.1371/journal.pone.0015591. claim: open-label-placebo-ibs
