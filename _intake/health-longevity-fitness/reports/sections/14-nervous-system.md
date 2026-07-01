# 14 — The Nervous System (as a system)

Learn how the nervous system actually works and you get a built-in bullshit detector. You can tell a
normal "senior moment" from disease, and see the "rewire your brain in 21 days," "dopamine detox," and
"vagus hack" pitches for what they are. This chapter is the physiology — how the machine is built and
how it runs. The disease end — dementia, neurodegeneration, mental-health outcomes — lives in §08.

_Not medical advice. Dementia and depression as outcomes: §08. Evidence tiers (strongest to weakest:
`rct` > `meta` > `cohort` > `mechanistic`/`animal` > `anecdotal`) are defined in the manual's "Start
Here."_

---

## 1. Architecture: how the nervous system is built

### 1.1 CNS vs PNS — the two-compartment map

The nervous system splits into the **central nervous system (CNS)** — brain + spinal cord, encased
in bone and the blood–brain barrier — and the **peripheral nervous system (PNS)** — everything
else: the cranial and spinal nerves, the sensory and motor fibres, the autonomic ganglia, and the
**enteric nervous system** of the gut. The split is not just anatomical; it is *regenerative*.
Peripheral axons can regrow (slowly, ~1 mm/day) along their Schwann-cell sheaths; central axons
mostly cannot, because the CNS environment (myelin-associated inhibitors, the glial scar) actively
blocks regrowth. This single fact explains why a severed finger nerve can recover and a severed
spinal cord generally does not — and why "neuroplasticity" (§4) is real but bounded.

@@FIG:A05-cns-pns@@

### 1.2 The neuron and the action potential — the foundation

The functional unit is the **neuron** — dendrites in, soma, axon out to the synaptic terminals.
Its defining trick is the **action potential**, and the mechanism is one of the most
completely solved problems in all of biology — which is why it sits in canon as a *foundation*,
not an outcome.

@@FIG:A01-neuron,RA01-neuron@@

- A neuron at rest holds its inside ~−70 mV relative to outside. That voltage is built and
  maintained by the **Na⁺/K⁺-ATPase ("the sodium–potassium pump")**, which burns ATP to push 3 Na⁺
  out and 2 K⁺ in per cycle, establishing the ion gradients that store the cell's electrical
  potential energy. Jens Christian Skou's discovery of this enzyme (1957) won the 1997 Nobel Prize
  in Chemistry; it is the literal pump under all bioelectricity. **The brain spends an
  estimated ~20% of the body's resting energy budget largely to run these pumps** — thinking is
  metabolically expensive because keeping neurons poised to fire is.
- When a stimulus depolarises the membrane past threshold, voltage-gated Na⁺ channels open, Na⁺
  rushes in (the upstroke), then inactivate while voltage-gated K⁺ channels open and repolarise it
  (the downstroke). This all-or-nothing spike propagates down the axon. **Hodgkin & Huxley (1952)**
  wrote the quantitative equations for exactly this in the squid giant axon — a model so precise it
  still predicts membrane behaviour today (Hodgkin & Huxley, 1952; Nobel Prize 1963).[^hh]
  `mechanistic` (the mechanism is understood end to end) — and as solid as biology gets.

@@FIG:46-action-potential,RA06-action-potential@@

> **UP-link to canon.** The Na⁺/K⁺ gradient and the Hodgkin–Huxley formalism are
> `bucket-canon/05-biophysics/` foundations (bioelectricity, ion gradients, membrane excitability),
> adjacent to the cell-water/interstitial-fluid physics that Domain I's glymphatic story rests on.
> Everything downstream in this section — neurotransmission, autonomic tone, pain signalling — is an
> *application* of these foundations.

### 1.3 Synapses, glia, and myelin — the parts list

- **Synapses.** Where one neuron talks to the next, almost always *chemically*: the action potential
  triggers Ca²⁺ influx → vesicles release a neurotransmitter → it binds receptors on the next cell →
  excites or inhibits it. The adult human brain has on the order of ~10¹⁴ synapses. Synaptic
  *strength* is adjustable, and that adjustability is the physical substrate of learning (§4).

@@FIG:66-synapse,RA02-synapse@@

- **Glia — not "support cells."** Glia roughly match or outnumber neurons (the once-quoted "10:1"
  ratio is a myth; it's closer to ~1:1). Three families do real computational and immune work:
  - **Astrocytes** regulate the synaptic environment, recycle neurotransmitters (glutamate uptake),
    buffer K⁺, control blood flow, form the blood–brain barrier with endothelium, and supply
    neurons with metabolic substrate. The "tripartite synapse" (pre + post + astrocyte) is now
    standard (Sofroniew & Vinters, 2009).[^tripartite] They are
    also the aquaporin-4 cells that drive **glymphatic clearance during sleep** — the direct bridge
    to Domain I.
  - **Microglia** are the brain's resident immune cells, and — strikingly — they **prune synapses**
    during development and continue surveilling them in adulthood, using complement tagging
    ("eat-me" signals) to decide which connections to remove (Schafer et al., 2012).[^microglia]
    Mis-tuned microglial pruning is now implicated in
    neurodevelopmental and neurodegenerative disease — a live research front, not a settled lever.
  - **Oligodendrocytes** (CNS) and **Schwann cells** (PNS) make **myelin** — the lipid wrapping that
    insulates axons so the signal jumps node-to-node (saltatory conduction), raising conduction
    speed up to ~100×. Myelin loss is the lesion in multiple sclerosis; subtle myelin changes
    accompany normal aging.

**Honest debunk — "we only use 10% of our brain."** False, and a useful place to start the honesty
work. Functional imaging shows essentially *all* of the brain is active over a day; there is no
silent 90% waiting to be unlocked. Focal damage anywhere produces deficits, which could not be true
if 90% were spare. The myth's only kernel of truth is that glia outnumber the firing neurons and
that any single moment uses a subset of circuits — neither of which means latent unused capacity.

---

## 2. The autonomic nervous system — the body's autopilot

### 2.1 Sympathetic vs parasympathetic

The **autonomic nervous system (ANS)** runs the involuntary body: heart rate, digestion, pupil,
sweat, airway, vasculature. It has two arms, classically opposed:

| | **Sympathetic** ("fight/flight") | **Parasympathetic** ("rest/digest") |
|---|---|---|
| Net effect | Mobilise: ↑HR, ↑BP, pupils dilate, airways open, gut slows, glucose released | Restore: ↓HR, digestion on, pupils constrict |
| Main transmitter at target | Norepinephrine (mostly) | Acetylcholine |
| Anatomy | Thoracolumbar outflow, paravertebral chain | Craniosacral; the **vagus nerve** carries most of it |
| Adrenal link | Drives adrenal medulla → epinephrine into blood | — |

@@FIG:92-autonomic-ns@@

The honest correction to the pop version: they are **not a simple seesaw**. Both arms are active at
rest, they can co-activate, and "balance" is contextual, not a single dial you turn toward
"parasympathetic = good." Chronic *over*-parasympathetic states exist; acute sympathetic activation
is adaptive and necessary. The useful idea is **autonomic flexibility** — the capacity to shift
appropriately — not "maximise vagal tone."

@@FIG:93-fight-or-flight@@

### 2.2 The vagus nerve and HRV — the real readout, honestly graded

The **vagus** (cranial nerve X) is the main parasympathetic highway: ~80% of its fibres are
*afferent* (carrying signals gut/heart/lung → brain), only ~20% efferent (brain → organs). Its tonic braking of the heart's sinoatrial
node is what makes **heart-rate variability (HRV)** a window onto parasympathetic activity. This is
covered in depth in the autonomic/HRV thread (`02-domains/threads/thread-autonomic-hrv.md`) and
Domain I §4 — the short version, kept consistent here:

- **Solid:** HRV genuinely indexes vagal/autonomic regulation; slow breathing (~6 breaths/min,
  ~0.1 Hz resonance) and extended exhalation reliably raise it via respiratory sinus arrhythmia and
  the baroreflex; chronically low resting HRV *associates* with stress and higher CV/all-cause
  mortality risk (`mechanistic`/`cohort` — observational, follow-a-group evidence).
- **Hype:** HRV is a **biomarker, not an intervention**. "Raise your HRV" is not itself a validated
  health outcome (predictor ≠ lever — something that forecasts risk isn't automatically something
  that, changed, lowers it). It is noisy, posture-, age- and method-dependent, and only
  interpretable *within one person over time* — cross-person "my HRV beats yours" is close to
  meaningless. Whether HRV-guided training produces real outcomes (vs. a wearable vanity metric)
  is an open Wave-2 question.

### 2.3 The gut–brain axis

The vagus is also the spine of the **gut–brain axis** — bidirectional signalling between the enteric
nervous system (~the "second brain," ~500 million neurons), the gut microbiome, the immune system,
and the CNS, via vagal afferents, microbial metabolites (short-chain fatty acids), enteroendocrine
hormones, and immune cytokines (Cryan et al., 2019).[^gutbrain] **Grade it carefully:** the mechanistic and *animal* evidence is rich
and real (germ-free mice have altered stress responses and behaviour; vagotomy blocks some effects).
But the leap from "mouse microbiome shapes mouse behaviour" to "this probiotic fixes your mood/
anxiety in humans" is mostly unmade — human RCTs of "psychobiotics" are small, heterogeneous, and
inconsistent. The axis is one of the most exciting frontiers in neuroscience and one of the most
oversold in the supplement aisle. `animal`/`mechanistic` strong; human `outcome` thin.

@@FIG:54-gut-brain-axis@@

### 2.4 The "vagus hacks" honest take

A whole wellness genre promises to "stimulate your vagus" with cold plunges, gargling, humming, ear
massage, and breathing apps. Untangle three claims:

- **Implanted/clinical VNS is real medicine.** Surgically implanted vagus nerve stimulation is
  FDA-approved for refractory epilepsy and treatment-resistant depression (Rush et al., 2000)[^vns]
  — though even there the depression evidence is
  modest, slow, and was contentious at approval. This is a device + surgery, not a breathing trick.
- **Slow breathing/exhalation genuinely raises vagal output** acutely — that part of the "vagal
  tone" story is mechanistically sound (it's the same physiology as §2.2 and the breath domain).
- **Most consumer "vagus hacks"** (gargling, cold face immersion via the diving reflex, *transcutaneous*
  auricular stimulation gadgets) have either acute-only effects, tiny/short trials with surrogate
  endpoints (HRV, mood scales), or no good human outcome data at all. The mechanism (you *can* nudge
  autonomic tone) is real; the marketed *outcomes* (cure anxiety, "reset your nervous system")
  outrun the evidence. **Polyvagal theory** — Stephen Porges's influential framework that popularised
  much of this language (Porges, 2023)[^porges]
  — is best treated as an *interpretive lens that generated useful clinical intuitions*, but several
  of its specific evolutionary/anatomical claims are **disputed by comparative physiologists**; grade
  the theory `theoretical`/contested and the specific hacks by their (mostly thin) trials, not by the
  theory's popularity.

---

## 3. Neurotransmitters — what they actually do (and the pop-neuroscience errors)

Neurotransmitters are the chemical currency at the synapse. The single most important correction to
pop-neuroscience: **a transmitter is not a feeling.** Dopamine is not "pleasure," serotonin is not
"happiness," GABA is not "calm." Each is a signalling molecule that does *different* things in
*different* circuits, and the same molecule can be excitatory in one place and modulatory in another.

@@FIG:BX2-neurotransmitters@@

| Transmitter | What it actually does (mechanistically) | The pop error |
|---|---|---|
| **Glutamate** | The brain's **main excitatory** transmitter (~most synapses). Drives the depolarisation that underlies nearly all fast signalling and, via NMDA/AMPA receptors, **learning (LTP)**. Excess = excitotoxicity (stroke, seizure). | Ignored entirely by pop-neuro, yet it does most of the work. |
| **GABA** | The main **inhibitory** transmitter; gates excitation, sets cortical rhythm. Target of benzodiazepines, alcohol, anaesthetics. | "GABA supplements calm you" — oral GABA barely crosses the blood–brain barrier; the calm is mostly placebo/peripheral. |
| **Dopamine** | **Motivation, reward *prediction*, and movement** — not pleasure per se. Schultz's work showed dopamine neurons fire to *reward-prediction error* (better-than-expected), the teaching signal of reinforcement learning (Schultz, Dayan & Montague, 1997).[^schultz] Also runs motor control (its loss = Parkinson's). | "Dopamine = pleasure/the addiction molecule"; the "dopamine detox." See §3.1. |
| **Serotonin (5-HT)** | Modulates mood, gut motility (~90% of body serotonin is in the gut), sleep, appetite, aggression — a broad neuromodulator, **not a happiness meter**. | "Low serotonin causes depression." See §3.2. |
| **Acetylcholine** | Neuromuscular junction (every voluntary muscle), parasympathetic transmitter, and **attention/learning/memory** in cortex (the basal-forebrain cholinergic system degenerates in Alzheimer's — basis of cholinesterase-inhibitor drugs). | Mostly absent from pop-neuro despite being central to memory. |
| **Norepinephrine** | Arousal, vigilance, the sympathetic "go" signal, and (from the locus coeruleus) attention and stress response. | Conflated with adrenaline/"energy." |

### 3.1 The "dopamine detox" debunk

The viral "dopamine fasting/detox" idea — abstain from phones, food, fun to "reset your dopamine
receptors" — is **mechanistically confused**. You cannot meaningfully lower or "reset" baseline
dopamine by avoiding fun for a day; dopamine is tonically essential (you'd be Parkinsonian without
it), and pleasurable activities don't "deplete" a reservoir. What the practice *can* do — and the
only honest defence of it — is plain **stimulus control / behavioural cessation**: stepping back from
compulsive, highly-reinforcing inputs (slot-machine phone use) can reduce craving and restore
attention. That's real and useful, but it's behaviour change, not neurochemistry. The "dopamine"
framing is wrong; the underlying habit-reset can still help. `anecdotal`/behavioural, mislabelled
mechanism.

### 3.2 The "serotonin imbalance" debunk (cross-ref 08)

The "chemical imbalance / low-serotonin theory of depression" is **not supported** by the evidence —
the umbrella review by Moncrieff et al. (2022)[^moncrieff]
found no consistent evidence depression is caused by low serotonin. Section 08 §5.3 handles this in
full and makes the crucial second point: **this does not mean antidepressants don't work.** SSRIs
have modest-but-real RCT efficacy (Cipriani et al., 2018)[^cipriani]; a drug can help without the folk-mechanism behind it being true.
Hold the mechanism story and the outcome apart — exactly the schema's rule.

---

## 4. Neuroplasticity — real, bounded, and badly oversold

"Neuroplasticity" is the brain's capacity to change its structure and function with experience. It is
genuinely one of the most important discoveries in neuroscience — and it is also the most abused word
in the wellness/self-help economy. Both things are true; the job is to draw the line.

### 4.1 Where plasticity is real and load-bearing

- **Learning and memory** are plasticity: long-term potentiation (LTP) strengthens co-active synapses
  (Hebb's "cells that fire together wire together"), the cellular basis of memory. Solid foundation.
- **Stroke and injury recovery.** After a stroke, surviving tissue can take over lost functions, and
  this can be *driven by rehabilitation*. The strongest evidence is **constraint-induced movement
  therapy (CIMT)**: restraining the good arm to force use of the impaired one improves limb function —
  shown in the **EXCITE randomized trial** (Wolf et al., 2006).[^excite]
  This is plasticity harnessed clinically. `rct` (a randomized trial — the strongest evidence tier).
- **Use-dependent cortical remapping.** Sensory and motor maps reorganise with use, training, and
  injury (musicians' enlarged finger maps; map shifts after amputation). The flip side is maladaptive:
  cortical reorganisation after amputation correlates with **phantom-limb pain** (Karl et al., 2001;
  Flor's body of work)[^phantom] — plasticity isn't always
  benign.
- **Exercise drives it.** Aerobic exercise raises **BDNF** (brain-derived neurotrophic factor — a
  growth factor that helps neurons grow and survive) and increased hippocampal volume in a
  randomized trial (Erickson et al., 2011)[^bdnf] — see Section 08 §3 and
  Domain E. The mechanism (BDNF, neurogenesis, angiogenesis) is real; the cognitive *outcomes* are
  more modest than the mechanism implies (08 §3.2).

### 4.2 Critical periods — the part the hype ignores

Plasticity is **not uniform across the lifespan**. There are **critical/sensitive periods** — windows
(largely in childhood) when circuits are maximally shapeable: language, binocular vision, absolute
pitch. Hubel & Wiesel's Nobel work on ocular dominance showed a window after which the change becomes
hard or impossible. Adult plasticity is real but *smaller, slower, and more effortful* than the
"infinitely rewireable brain" marketing implies. This is why adults learn languages with an accent
and why the recovery ceiling after adult brain injury is bounded.

### 4.3 The "rewire your brain" debunk

The self-help industry sells "rewire your brain in 21 days," apps and courses promising to remodel
your mind on demand. The honest position: **the mechanism is real but the marketed dose-response is
fantasy.** Meaningful structural change requires large amounts of *specific, effortful, repeated*
practice (rehab, instrument, language), it is *domain-specific* (you get better at the trained thing,
not "smarter" in general — same far-transfer failure as the brain-training games in 08 §6.3), and the
gains are bounded by age and critical periods. "Neuroplasticity" in an ad is almost always a
mechanism-word doing outcome-work it hasn't earned. Use it as licence to *practice deliberately*, not
as a promise that any course rewrites you.

**Honest debunk — "left brain vs. right brain personalities."** The idea that people are logical
"left-brained" or creative "right-brained" types is false. Hemispheres *are* specialised for some
functions (language usually left-lateralised, spatial attention often right), but large connectivity
studies find **no evidence that individuals have a dominant hemisphere** driving personality (Nielsen
et al., 2013).[^nielsen] It's a real anatomical asymmetry inflated
into a fake personality taxonomy.

---

## 5. Brain aging without disease — and the levers that exist

Section 08 owns dementia and neurodegeneration. This is the *non-disease* counterpart: what happens to
a *normally* aging nervous system, and what (honestly) moves it.

### 5.1 Normal cognitive aging vs. pathology

Normal aging is **not** dementia. With age, most people see modest declines in **processing speed,
working memory, and fluid reasoning** (manipulating new information), while **crystallised abilities**
(vocabulary, accumulated knowledge) hold steady or *improve* into later life. The brain shrinks
slightly (especially prefrontal cortex and hippocampus), white-matter integrity declines, and
dopaminergic signalling wanes. The key distinction: normal aging causes *slower* and *less efficient*
cognition that does not impair independent daily function; **dementia is a pathological process** (08)
that does. Confusing the two drives both needless anxiety ("senior moments = early Alzheimer's") and
dangerous complacency.

### 5.2 Cognitive reserve

**Cognitive reserve** is why two people with identical brain pathology can have very different
symptoms: richer education, occupational complexity, mentally and socially active lives are associated
with *tolerating more pathology before showing deficits* (Stern, 2012; Scarmeas & Stern, 2003).[^reserve]
**Grade it with the rules in hand:** the
evidence is largely **observational** (cohort) and shot through with reverse causation (early disease
shrinks engagement years before diagnosis; healthier, wealthier people get more education). Reserve is
a real, useful *construct* and a strong *predictor*; it is a much weaker *lever* — "do puzzles to build
reserve" is not what the data show (far-transfer fails, 08 §6.3). What plausibly builds reserve is the
same unglamorous bundle below, sustained over decades, not a brain-game subscription.

### 5.3 The neuroprotective levers (all cross-referenced)

There is no brain supplement, game, or 2026 drug that competes with this bundle, and every item is
covered in depth elsewhere — the point here is that they converge:

- **Exercise** — best single bet; BDNF + vascular mechanism, modest RCT outcomes (08 §3, Domain E).
- **Sleep** — glymphatic clearance, memory consolidation; protect it, don't oversell it as a proven
  preventive (Domain I, 08 §4 cross-ref).
- **Social connection** — the largest, most replicated mortality signal in the corpus, and a Lancet
  dementia factor (Domain M; 08 §1, §5).
- **Lifelong learning / mental engagement** — plausible reserve-builder, weak as an isolated lever.
- **Vascular control** (BP, LDL, glucose, don't smoke) — what's good for the heart is good for the
  brain; SPRINT-MIND is the cleanest RCT (08 §1.3).
- **Hearing and vision** — treat them; ACHIEVE is the best causal evidence (08 §2).

The honest summary mirrors 08: **the levers are unsexy and unmonetisable, and that is precisely why
they're under-marketed and over-substituted-for.**

---

## 6. Pain and the peripheral nervous system

Pain is the part of clinical neuroscience where the public model is *most* wrong and the cost of being
wrong is highest. The single most important modern finding: **pain is an output of the brain, not a
readout of tissue damage** — and the two can diverge dramatically.

### 6.1 Nociception ≠ pain

**Nociception** is the detection of potentially damaging stimuli by peripheral nociceptors and their
signal travelling up the spinal cord. **Pain** is the *conscious experience the brain constructs*,
weighing that signal against context, expectation, attention, mood, and meaning. They usually track
together, but not always: soldiers and athletes sustain major injuries with little pain in the moment;
people have severe chronic pain with no detectable tissue damage. The brain runs descending modulation
(periaqueductal grey → spinal cord) that can amplify or suppress the signal — which is why the same
injury hurts differently on different days.

The cleanest experimental proof is **placebo analgesia**: expectation of relief activates the brain's
own opioid system and measurably reduces pain, and **naloxone (an opioid blocker) reverses it** —
placebo pain relief is a real neurochemical event, not "just imagination" (Amanzio & Benedetti, 1999;
Petrovic et al., 2002; Zubieta et al., 2005).[^placebo] The
brain has a built-in pharmacy that context can dispense.

### 6.2 Acute vs. chronic pain — and the biopsychosocial model

- **Acute pain** is the useful alarm: it tracks tissue damage and resolves as tissue heals (days to
  weeks). Treat the cause, control the pain, expect recovery.
- **Chronic pain** (>3 months, now a diagnosis in its own right — Treede et al., 2015)[^treede] is **not just "acute pain that lasted longer."** In many chronic
  pain states the nervous system itself has changed — **central sensitisation**: the spinal cord and
  brain become amplifiers, so pain persists and spreads beyond, or entirely without, ongoing tissue
  damage. **Pain ≠ tissue damage** is the load-bearing modern fact.

The framework that captures this is the **biopsychosocial model** (Gatchel et al., 2007):[^gatchel] chronic pain emerges from biological, psychological *and* social
factors together, not from a structural lesion alone. The exemplar is **low back pain** — the world's
leading cause of disability — where imaging findings (disc bulges, "degeneration") are **common in
pain-free people and correlate poorly with symptoms**, and the *Lancet* Low Back Pain Series concluded
that the dominant management model is wrong: most low back pain has no identifiable structural cause and
is worsened by over-imaging, over-medicalising, and over-treating (Hartvigsen et al., 2018).[^hartvigsen] `cohort`/`review` — strong and consequential.

### 6.3 How chronic pain is actually (best) treated — graded honestly

The evidence-based core for most non-cancer chronic pain is **active, multidisciplinary, and
self-management-oriented**, not a pill or a procedure:

- **Stay active / graded exposure + exercise** — first-line for chronic low back pain and most chronic
  musculoskeletal pain. Rest and avoidance worsen it.
- **Pain neuroscience education (PNE)** — teaching people *how pain works* (that hurt ≠ harm) measurably
  reduces pain and disability when combined with exercise (Wood & Hendrick meta-analysis, 2018;
  Watson et al., 2019).[^pne] Effects are
  **small-to-moderate and strongest combined with movement**, not as a lecture alone. The work of
  **Lorimer Moseley & David Butler** (*Explain Pain*) popularised this; grade the *concept* as
  well-supported and the *effect size* as modest. `meta` of RCTs, small-moderate.
- **CBT and psychological therapies** — modest but real benefit for pain-related disability and mood.
- **Opioids — the honest verdict.** For chronic non-cancer pain, opioids are **not superior to
  non-opioid medication** and carry serious harms. The landmark **SPACE randomized trial** (Krebs et al.,
  2018)[^space] compared opioid vs. non-opioid medication for chronic back and
  osteoarthritis pain over 12 months and found **no benefit of opioids on pain-related function — and
  slightly *worse* pain in the opioid group**, plus more side effects. Combined with the addiction and
  overdose toll documented through the opioid epidemic (CDC guideline, Dowell et al., 2016),[^cdc]
  the evidence is clear: **opioids are not first-line for chronic non-cancer
  pain.** They retain a real role in acute, post-surgical, cancer, and palliative pain. `rct` — a
  decisive negative for the over-prescribed indication.

### 6.4 Peripheral neuropathy (diabetic and beyond)

**Peripheral neuropathy** — damage to peripheral nerves — most commonly from **diabetes**, where
chronic hyperglycaemia injures the longest axons first (the classic "stocking-glove" numbness,
burning, and pain starting in the feet). It affects roughly half of people with long-standing diabetes
and is a leading cause of foot ulcers and amputations (Feldman et al., 2019).[^feldman] Honest treatment picture:

- **The only disease-modifying lever is upstream**: tight **glycaemic control** prevents/slows it in
  type 1 diabetes (clearly) and modestly in type 2 — once nerves are damaged, regrowth is limited.
- **For the *pain***, the evidence-based first-line drugs are **not opioids and not ordinary
  painkillers** but agents that act on neuropathic signalling: **gabapentinoids (pregabalin,
  gabapentin), SNRIs (duloxetine), and tricyclics (amitriptyline)** (Finnerup et al., NeuPSIG
  systematic review, 2015; duloxetine Cochrane, Lunn et al., 2014).[^neuropathic-drugs] **Grade honestly:** even first-line, the **numbers
  needed to treat are ~4–8** for 50% pain relief — you'd have to treat 4–8 people for one to get 50%
  relief, so *most* patients don't get major relief from any
  single drug, and side effects are common. Neuropathic pain is hard to treat; managing
  expectations is part of treating it. `meta` — first-line agents real but modestly effective.

---

## 7. Mental health's neural basis — brief, honest, cross-referenced

Section 08 §5 covers mental-health *outcomes* (depression↔mortality, exercise as treatment, the
serotonin debunk, antidepressant efficacy). The systems-level point to add here is about the **model
of causation**, because it shapes everything downstream:

The **"chemical imbalance" model** — that depression, anxiety, etc. are simply deficits/excesses of
single neurotransmitters to be topped up — is **scientifically obsolete**. Mood disorders involve
distributed *circuit* dysfunction (prefrontal–limbic networks), neuroplasticity and stress-system
(HPA-axis) changes, inflammation, genetics, and environment — not a single low chemical. The honest
synthesis the field now holds:

- The **folk-mechanism is wrong** (no "serotonin deficiency disease"), which matters because it was the
  marketing story and it shaped how a generation understood their own minds.
- The **treatments can still work** despite the wrong mechanism: antidepressants (modest, real —
  Cipriani 2018), psychotherapy, and — one of the cleaner interventional findings — **exercise as a
  genuine RCT-supported treatment for depression** (Noetel et al., 2024; 08 §5.2).[^noetel]
- **Mechanism and outcome are separate claims** — the schema's central discipline, and the whole reason
  this corpus grades them apart.

---

## 8. The honest summary of this section

1. **The foundations are rock-solid and sit in canon.** The action potential, the Na⁺/K⁺ pump, and
   Hodgkin–Huxley are among the most completely solved problems in biology — bioelectricity is a
   `bucket-canon/05-biophysics/` foundation, and everything downstream is an application of it.
2. **Glia are not background.** Astrocytes (glymphatics, the synaptic environment) and microglia
   (synaptic pruning, immunity) do real computational and clearance work; the field's frontier
   (microglia in disease, gut–brain axis) is exciting and mostly still `animal`/`mechanistic`.
3. **Autonomic "balance" is flexibility, not max-vagus.** HRV is a real readout and a poor target;
   slow breathing genuinely raises vagal output; most consumer "vagus hacks" oversell acute or
   surrogate effects (predictor ≠ lever, again).
4. **Neurotransmitters aren't feelings.** Dopamine = reward-prediction/motivation, not pleasure;
   serotonin isn't a happiness meter. The "dopamine detox" and "serotonin imbalance" are both
   mechanistically wrong, even where the adjacent behaviour (habit reset) or treatment (SSRIs) can
   still help.
5. **Neuroplasticity is real, bounded, and abused.** Learning, stroke rehab (CIMT), and
   exercise→BDNF are genuine; "rewire your brain in 21 days," left/right-brain types, and the 10%
   myth are not. Adult plasticity is smaller, slower, domain-specific, and gated by critical periods.
6. **Pain is the highest-stakes correction.** Pain ≠ tissue damage; chronic pain is often central
   sensitisation; the best treatment is active/biopsychosocial (movement + pain education + CBT),
   **opioids are not first-line for chronic non-cancer pain** (SPACE), and neuropathic pain is
   genuinely hard to treat even with the right (non-opioid) first-line drugs.
7. **For the aging brain, the levers are the same unglamorous bundle** as everywhere in this corpus —
   move, sleep, connect, learn, control the vascular risks, treat hearing/vision — and no supplement,
   game, or current drug competes with it.

---

## Go deeper

A short, honestly-annotated reading list — mix of the field's anchor textbook, the load-bearing
primary trials, and the best debunks.

1. **Kandel, Koester, Mack & Siegelbaum — *Principles of Neural Science* (6th ed., 2021).** The
   canonical textbook of the field; the authoritative, careful account of everything in §§1–4
   (membrane potentials, synapses, neurotransmitters, plasticity). If one source grounds this whole
   section, it's this. **Tier: textbook — authoritative synthesis.**
2. **Hodgkin & Huxley — *A quantitative description of membrane current...*** (*J Physiol* 1952,
   `10.1113/jphysiol.1952.sp004764`). The foundation: the action potential, solved. Read it (or a good
   summary) to see what "settled `mechanistic` science" actually looks like — and why bioelectricity
   belongs in canon, not in the outcomes pile. **Tier: mechanistic — as solid as biology gets.**
3. **Moseley & Butler — *Explain Pain* / pain-neuroscience-education evidence** (concept paper:
   Moseley & Butler, *J Pain* 2015; meta-analysis: Wood & Hendrick, *Eur J Pain* 2018,
   `10.1002/ejp.1314`). The modern, evidence-based reframing of chronic pain (hurt ≠ harm). Read the
   *concept* as well-supported and the *effect size* as modest-and-best-with-exercise — the honest
   calibration matters. **Tier: meta of RCTs — small-to-moderate, combination-dependent.**
4. **Krebs et al. — SPACE trial** (*JAMA* 2018, `10.1001/jama.2018.0899`). The randomized evidence that
   opioids are *not* superior to non-opioids for chronic back/osteoarthritis pain. The single most
   important "graded-honestly" source for how chronic pain should (not) be drugged. Pair with the CDC
   guideline (Dowell et al., *MMWR* 2016, `10.15585/mmwr.rr6501e1`). **Tier: rct — decisive negative.**
5. **Gatchel et al. — *The biopsychosocial approach to chronic pain*** (*Psychol Bull* 2007,
   `10.1037/0033-2909.133.4.581`), with **Hartvigsen et al. — *What low back pain is and why we need to
   pay attention*** (*Lancet* 2018, `10.1016/s0140-6736(18)30480-x`). Together they make the case that
   pain ≠ structural lesion, and that over-imaging/over-medicalising low back pain is iatrogenic.
   **Tier: review/cohort — strong and consequential.**
6. **Huberman-grade-the-primary (autonomic/dopamine content).** Popular neuroscience communicators
   (Andrew Huberman and peers) accurately convey much real physiology — slow-breathing→vagal output,
   dopamine-as-motivation — *and* drift into protocol claims (specific "dopamine" and "vagus" hacks)
   that outrun the trials. Treat the communicator as **provenance, not evidence** (schema rule): take
   the mechanism, then grade each specific protocol against its actual (often small/surrogate) primary
   source. **Tier: communication — verify every actionable claim downstream.**

For the mechanism-words that get abused, anchor on the debunk primaries: **Schultz et al.** (*Science*
1997, `10.1126/science.275.5306.1593`) for what dopamine really signals; **Moncrieff et al.** (*Mol
Psychiatry* 2022, `10.1038/s41380-022-01661-0`) for the serotonin myth; **Nielsen et al.** (*PLoS ONE*
2013, `10.1371/journal.pone.0071275`) for left/right-brain.

---

## Cross-links

- **SIDEWAYS:** dementia / neurodegeneration / depression *outcomes* ↔ **Section 08**
  (`08-brain-cognitive.md`) — the disease counterpart; HRV / autonomic recovery & gut-brain ↔ **Domain
  I** (`I-sleep-circadian.md` §4) and the **autonomic/HRV thread**
  (`threads/thread-autonomic-hrv.md`); exercise → BDNF / cognition ↔ **Domain E** + Section 08 §3;
  social connection as a neuroprotective lever ↔ **Domain M** (`M-psychosocial-determinants.md`);
  sleep / glymphatic clearance ↔ **Domain I** §1; nerve damage in diabetes ↔ Section 07 (clinical
  prevention) and the body-systems section (11).
- **UP to canon:** the **Na⁺/K⁺ pump, ion gradients, the action potential (Hodgkin–Huxley
  excitability), and membrane bioelectricity** are foundations in `bucket-canon/05-biophysics/`
  (adjacent to the cell-water / interstitial-fluid physics under the glymphatic story). The nervous
  system *as experienced* — autonomic tone, neurotransmission, pain, plasticity — is the outcome-layer
  application of those foundations.

## Gaps flagged for next wave

Whether HRV-guided training / biofeedback produces real outcomes vs. a vanity metric (shared with
Domain I/G); human (not mouse) evidence that the gut–brain axis is a *lever* in mood/anxiety
("psychobiotics"); whether any consumer "vagus" intervention beats sham on a hard endpoint; the
mechanism and reach of microglial pruning in adult disease; real-world effectiveness of pain
neuroscience education at scale and over years; disease-modifying (not just symptomatic) treatment for
established peripheral neuropathy; and the circuit-level (vs. transmitter-level) model of mood
disorders as it matures toward actionable, gradeable interventions.

---

## Sources & notes

[^hh]: Hodgkin & Huxley — *J Physiol* 1952. doi:10.1113/jphysiol.1952.sp004764. Nobel Prize 1963. claim: action-potential-hh (mechanistic)

[^tripartite]: Sofroniew & Vinters — *Acta Neuropathol* 2009. doi:10.1007/s00401-009-0619-8. claim: astrocyte-tripartite-synapse (mechanistic)

[^microglia]: Schafer et al. — *Neuron* 2012. doi:10.1016/j.neuron.2012.03.026. claim: microglia-synaptic-pruning (mechanistic)

[^gutbrain]: Cryan et al., "The Microbiota-Gut-Brain Axis" — *Physiol Rev* 2019. doi:10.1152/physrev.00018.2018. claim: gut-brain-axis (animal/mechanistic)

[^vns]: Rush et al. — *Biol Psychiatry* 2000. doi:10.1016/s0006-3223(99)00304-2. claim: vns-depression-approval (rct)

[^porges]: Porges — *Compr Psychoneuroendocrinol* 2023. doi:10.1016/j.cpnec.2023.100200. claim: polyvagal-theory-contested (theoretical)

[^schultz]: Schultz, Dayan & Montague — *Science* 1997. doi:10.1126/science.275.5306.1593. claim: dopamine-reward-prediction-error (mechanistic)

[^moncrieff]: Moncrieff et al. — *Mol Psychiatry* 2022. doi:10.1038/s41380-022-01661-0. claim: serotonin-imbalance-debunk (meta)

[^cipriani]: Cipriani et al. — *Lancet* 2018. doi:10.1016/S0140-6736(17)32802-7. claim: ssri-efficacy (meta/rct)

[^excite]: Wolf et al. (EXCITE trial) — *JAMA* 2006. doi:10.1001/jama.296.17.2095. claim: cimt-stroke-recovery (rct)

[^phantom]: Karl et al. — *J Neurosci* 2001. doi:10.1523/jneurosci.21-10-03609.2001; and Flor's body of work. claim: cortical-remap-phantom-pain (mechanistic)

[^bdnf]: Erickson et al. — *PNAS* 2011. doi:10.1073/pnas.1015950108. claim: exercise-bdnf-hippocampus (rct)

[^nielsen]: Nielsen et al. — *PLoS ONE* 2013. doi:10.1371/journal.pone.0071275. claim: left-right-brain-debunk (cohort)

[^reserve]: Stern — *Lancet Neurol* 2012. doi:10.1016/S1474-4422(12)70191-6. Scarmeas & Stern — *J Clin Exp Neuropsychol* 2003. doi:10.1076/jcen.25.5.625.14576. claim: cognitive-reserve (cohort)

[^placebo]: Amanzio & Benedetti — *J Neurosci* 1999. doi:10.1523/jneurosci.19-01-00484.1999. Petrovic et al. — *Science* 2002. doi:10.1126/science.1067176. Zubieta et al. — *J Neurosci* 2005. doi:10.1523/jneurosci.0439-05.2005. claim: placebo-analgesia-naloxone (mechanistic)

[^treede]: Treede et al. — *Pain* 2015. doi:10.1097/j.pain.0000000000000160. claim: chronic-pain-diagnosis (review)

[^gatchel]: Gatchel et al. — *Psychol Bull* 2007. doi:10.1037/0033-2909.133.4.581. claim: biopsychosocial-pain-model (review)

[^hartvigsen]: Hartvigsen et al. (*Lancet* Low Back Pain Series) — *Lancet* 2018. doi:10.1016/s0140-6736(18)30480-x. claim: low-back-pain-overmedicalised (cohort/review)

[^pne]: Wood & Hendrick meta-analysis — *Eur J Pain* 2018. doi:10.1002/ejp.1314. Watson et al. — *J Pain* 2019. doi:10.1016/j.jpain.2019.02.011. claim: pain-neuroscience-education (meta)

[^space]: Krebs et al. (SPACE trial) — *JAMA* 2018. doi:10.1001/jama.2018.0899. claim: opioids-not-first-line (rct)

[^cdc]: Dowell et al. (CDC guideline) — *MMWR* 2016. doi:10.15585/mmwr.rr6501e1. claim: cdc-opioid-guideline (guideline)

[^feldman]: Feldman et al., "Diabetic neuropathy" — *Nat Rev Dis Primers* 2019. doi:10.1038/s41572-019-0092-1. claim: diabetic-neuropathy (review)

[^neuropathic-drugs]: Finnerup et al. (NeuPSIG systematic review) — *Lancet Neurol* 2015. doi:10.1016/s1474-4422(14)70251-0. Lunn et al. (duloxetine Cochrane) 2014. doi:10.1002/14651858.cd007115.pub3. claim: neuropathic-first-line-nnt (meta)

[^noetel]: Noetel et al. — *BMJ* 2024. doi:10.1136/bmj-2023-075847. claim: exercise-depression-rct (meta/rct)
