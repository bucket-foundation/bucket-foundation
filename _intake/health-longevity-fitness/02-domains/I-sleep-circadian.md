# Domain I — Sleep, Circadian & Recovery

> **Status:** v0.1 (Wave 1) — 2026-06-27. Graded claim set; companion data in `I-claims.json` (16 claims).
> **Discipline:** sleep & circadian neuroscience + autonomic/stress physiology. The **outcome/application
> layer** — mechanisms resting on foundations (non-visual photoreception / melanopsin, cell-water &
> interstitial-fluid physics, redox) carry `canon_link` UP to `bucket-canon/05-biophysics/`.
>
> **The governing rule, sharpest in this domain:** *sleep increases brain Abeta clearance in mice* is a
> **mechanism**, not the **outcome** "sleep prevents Alzheimer's." *Blue light suppresses melatonin* is a
> **mechanism**, not "screens give you disease." *Short sleep associates with mortality* is a **cohort
> association** (and U-shaped — long sleep associates too), not "sleep less and you die sooner." Almost all
> sleep media collapses exactly these gaps. Tiers below keep them apart.

## How to read the tiers (descending rigor)
`meta` > `rct` > `cohort` > `cross-sectional` > `mechanistic` > `animal` > `theoretical`. Structural fact:
the **glymphatic-clearance story is foundational but `animal` (mice)**; the **sleep-duration-mortality
evidence is `meta`/`cohort` but U-shaped and confounded by reverse causation**; the **circadian-light
mechanism (melatonin suppression) is settled `mechanistic` human science**, but the **hard health OUTCOMES
of light hygiene are thin**. Read those asymmetries honestly — they are where the hype lives.

---

## 1. Sleep architecture & glymphatic clearance — the "why sleep" mechanism

Sleep cycles through NREM (N1→N2→N3 slow-wave) and REM in ~90-min cycles; slow-wave sleep dominates early
night, REM the later cycles. The mechanistic case for *why* this is non-negotiable rests on the
**glymphatic system** (Nedergaard group):

- **Iliff et al., Sci Transl Med 2012** (`10.1126/scitranslmed.3003748`, mice): a brain-wide **paravascular
  ("glymphatic") pathway dependent on astrocytic aquaporin-4** routes CSF through the parenchyma and clears
  interstitial solutes including **amyloid-beta**; AQP4 knockout cuts clearance ~70%. `animal`. The
  anatomical substrate.
- **Xie et al., Science 2013** (`10.1126/science.1241224`, mice): during **sleep/anesthesia the interstitial
  space expands ~60%** and convective CSF-ISF exchange surges, roughly **doubling Abeta clearance**. `animal`.
  This is the "sleep washes the brain" result. UP-link to canon (**cell-water / interstitial-fluid physics**).
- **Shokri-Kojori et al., PNAS 2018** (`10.1073/pnas.1721694115`, **human**, n=20): a single sleepless night
  **raised Abeta PET signal ~5% in hippocampus/thalamus** — the mechanism translates to humans. `mechanistic`
  (surrogate biomarker).

**Watch the gap.** The glymphatic finding is foundational and elegant, but the in-vivo demonstrations are
**mouse**, the human result is **one night / surrogate PET / n=20**, and the very existence and quantitative
importance of the glymphatic system *in humans* is an active, partly disputed area. "Sleep prevents
Alzheimer's" is a `mechanism`→`outcome` leap the evidence does not yet license.

## 2. Sleep duration ↔ mortality — the U-shape (and why "more is not better")

- **Cappuccio et al., SLEEP 2010** (`10.1093/sleep/33.5.585`, **meta, 16 cohorts, >1.3M people**): all-cause
  mortality is **U-shaped** — short sleep RR ~1.12 AND **long sleep RR ~1.30** (long sleep often the larger
  association). `meta`.
- **Kripke et al., Arch Gen Psychiatry 2002** (`10.1001/archpsyc.59.2.131`, **~1.1M adults**): lowest mortality
  at **~6.5-7.5h**; both <6.5h and **>=8h elevated**; insomnia added little independent risk. `cohort`.
- **Watson et al. (AASM/SRS consensus) 2015** (`10.5664/jcsm.4758`): consensus floor of **>=7h/night** for
  adults; the panel itself flagged the long-sleep association as harder to interpret. `meta`/guideline.

**The honest reading:** the data support a **floor (~7h) with a U-shape**, not "sleep as much as possible."
Long sleep's association with mortality is most plausibly **reverse causation** (illness, depression and
frailty cause long sleep), which is also the strongest critique of the popular "the shorter your sleep the
shorter your life" framing (see Walker, §6).

## 3. Circadian alignment, light hygiene & meal timing

The **circadian master clock (SCN)** is entrained primarily by **light**, via a non-visual pathway:

- **Brainard et al., J Neurosci 2001** (`10.1523/JNEUROSCI.21-16-06405.2001`): the human melatonin-suppression
  action spectrum **peaks at short wavelengths (~446-477 nm, "blue")** and does NOT match the visual
  photopigments — evidence for a **novel circadian photoreceptor** (later: **melanopsin in ipRGCs**).
  `mechanistic`. UP-link to canon (**non-visual photoreception**). **This is the real mechanism under both
  mainstream "blue light at night" advice AND Kruse's circadian-light thesis (see §7).**
- **Gooley et al., JCEM 2010** (`10.1210/jc.2010-2098`): ordinary **room light (<200 lux)** before bed
  **suppresses melatonin ~50% and shortens its duration ~90 min**. `rct`. Circadian disruption does not require
  bright light.
- **Chang et al., PNAS 2014** (`10.1073/pnas.1418490112`, n=12 crossover): evening **light-emitting e-reader**
  suppressed melatonin ~55%, **delayed circadian phase ~1.5h**, reduced REM, impaired next-morning alertness.
  `rct` (tiny).

Chronotype & meal timing:
- **Roenneberg et al., Curr Biol 2012** (`10.1016/j.cub.2012.03.038`, ~65k MCTQ): **"social jetlag"** — the gap
  between chronotype-preferred and socially-imposed sleep timing — **associates with higher BMI**, independent
  of duration. `cross-sectional`. (Coined the construct; association only.)
- **Hatori/Panda et al., Cell Metab 2012** (`10.1016/j.cmet.2012.04.019`, mice): **time-restricted feeding
  (~8-9h) WITHOUT cutting calories** protects high-fat-diet mice from obesity/steatosis — **timing alone**.
  `animal`. (Cross-links to Domain D.)
- **Wilkinson/Panda et al., Cell Metab 2019** (`10.1016/j.cmet.2019.11.004`, n=19): 10-h TRE improved weight,
  BP, atherogenic lipids in metabolic syndrome — but **single-arm uncontrolled pilot** on background meds.
  `cross-sectional`-equivalent (weakest interventional design). (Cross-links to Domain D.)

## 4. HRV — the autonomic recovery biomarker

- **Shaffer & Ginsberg, Front Public Health 2017** (`10.3389/fpubh.2017.00258`): **HRV indexes vagal/autonomic
  regulation**; higher resting/recovery HRV broadly reflects autonomic flexibility, chronically low HRV
  associates with stress and higher CV/all-cause risk. `mechanistic`/review.

**Watch the gap.** HRV is a **biomarker, not an intervention**. It is noisy, method- and age-dependent, and
only interpretable **within a person over time** — cross-person "my HRV is higher than yours" comparisons are
weak. "Raise your HRV" is not itself a validated health outcome. (Autonomic axis cross-links to Domain G
breath and Domain H cold.)

## 5. Stress, cortisol & allostatic load

- **McEwen, NEJM 1998** (`10.1056/NEJM199801153380307`): **allostatic load** — stress mediators (cortisol,
  catecholamines, cytokines) are **protective acutely, damaging chronically**; cumulative dysregulation
  "weathers" multiple systems. `theoretical`/framework.
- The acute stress–sleep link is concrete: **Spiegel, Leproult & Van Cauter, Lancet 1999**
  (`10.1016/S0140-6736(99)01376-8`, n=11): 4h/night sleep restriction **impaired glucose tolerance ~30-40% and
  raised evening cortisol**. `rct` (tiny, young, healthy, surrogate). The mechanism by which short sleep feeds
  metabolic and stress dysregulation.

**Watch the gap.** Allostatic load is a powerful *framework* (theoretical), operationalized inconsistently;
it explains-after-the-fact more easily than it predicts. Useful connective tissue, not a measured quantity.

## 6. Matthew Walker / "Why We Sleep" — grading the specific claims

Walker is a **communicator** (cf. the brief's rule: a practitioner's name is provenance, not evidence). "Why
We Sleep" (2017) popularized real science but carries **documented factual critiques** (notably Alexei Guzey's
2019 analysis — a web essay, **no DOI**, graded `anecdotal`/critique-tier). Grading his load-bearing claims
against the primary literature above:

| Walker claim | Verdict | Grounds |
|---|---|---|
| "The shorter your sleep, the shorter your life" (short sleep monotonically ↑ mortality) | **Contested / oversimplified** | The mortality relationship is **U-shaped** (Cappuccio `meta`, Kripke `cohort`): long sleep associates with **higher** mortality too, and reverse causation is unexcluded. Monotonic framing is not what the data show. |
| "Routinely sleeping <6-7h demolishes your immune system... doubles your risk of cancer" | **Overstated** | The IARC classification is of **shift work / circadian disruption** as *probable* (Group 2A) carcinogen — NOT "short sleep" per se. Causal cancer claims from sleep duration are not established. |
| "The WHO has declared a sleep-loss epidemic" / specific quote attributions | **Disputed sourcing** | Guzey documents misattributed/unsupported specific statistics; flagged `contested`. |
| Sleep is essential; sleep loss impairs metabolism, memory, mood, immune signaling | **Well supported** | Spiegel `rct`, glymphatic mechanism, broad consensus (AASM `meta`). The *core thesis* is sound even where specific figures are not. |

**Net:** the **direction** of Walker's message (sleep matters, protect it) is well supported; several
**specific quantitative/causal claims are overstated or mis-sourced** and are logged as
`conflict-walker-sleep-claims`. Index the book as influential communication; grade each underlying claim
separately.

## 7. BRIDGE — mainstream circadian science vs Kruse's circadian-light thesis

The existing Bucket corpus carries a heavy **Jack Kruse** circadian/light layer (see
`_intake/concept-circadian-light-environment`, `kruse-blog-corpus`, and the mined references — circadian ×456,
melatonin ×323, UV ×1082, infrared ×557, red light ×474, cortisol ×106). This is the valuable bridge: **where
do mainstream sleep science and Kruse agree, and where do they diverge?** (Cross-referenced, **not re-pulled**.)

**Where they AGREE (mainstream evidence actually backs the Kruse-adjacent claim):**
- **Light is the dominant zeitgeber for the SCN.** Kruse: "sunlight runs the clock." Mainstream: photic
  entrainment via melanopsin/ipRGCs is the master input (Brainard `mechanistic`, Panda's own melanopsin work).
  **Strong agreement on the core mechanism.**
- **Blue/short-wavelength light at night suppresses melatonin and disrupts circadian timing.** Kruse: blue
  light is circadian-destructive. Mainstream: Brainard action spectrum, Gooley room-light, Chang e-reader — all
  `mechanistic`/`rct`. **Agreement.**
- **Morning/daytime outdoor light is beneficial for entrainment and mood; circadian misalignment harms
  metabolism.** Kruse and mainstream (Roenneberg social jetlag, Panda TRE) **agree on direction.**

**Where they DIVERGE (Kruse's claims exceed the mainstream evidence tier):**
- **Causal primacy of sunlight over food.** Kruse: "sunlight beats food," light controls leptin/melanin/
  metabolism near-exclusively. Mainstream: light is master for the *clock*, but food timing is a *separate*
  peripheral-clock zeitgeber (Panda) — they agree food timing matters; Kruse subordinates it to light far
  beyond the evidence. Kruse's metabolic-primacy-of-UV/IR claims grade `speculative`/`theoretical`.
- **UV/IR/red-light as broad therapeutic agents** (beyond melatonin/clock effects). Mainstream support exists
  only narrowly (e.g. Glen Jeffery's 670 nm retinal-mitochondria work, `mechanistic`); Kruse's systemic claims
  outrun it. Grade `speculative` pending primary derivation.
- **"Non-native EMF" (nnEMF) disrupting circadian/mitochondrial biology.** No mainstream evidential support;
  `speculative`.
- **Deuterium / structured-(EZ)-water coupling to circadian biology.** `speculative` (sits in canon
  `05-biophysics` as a *foundation-candidate under review*, not an established outcome).
- **Blue-blocking as essential vs the product evidence.** Kruse (and much of wellness) treats blue-blocking
  glasses as near-mandatory. The Cochrane review (Singh 2023, `10.1002/14651858.CD013244.pub2`, `meta`) found
  **no clear benefit of blue-light-filtering LENSES**. The honest synthesis both sides miss: the **mechanism**
  (evening short-wavelength light suppresses melatonin) is real, but a specific **product** (amber glasses)
  is not validated — *dimming/avoiding* evening light != *wearing the glasses works*. Logged as
  `conflict-blue-blocking-glasses`.

**Bridge verdict:** mainstream chronobiology **validates the spine of the Kruse circadian-light thesis** (light
is the master clock input; blue light at night is disruptive) while **grading the extensions** (sunlight's
metabolic primacy over food, UV/IR systemic therapy, nnEMF, deuterium/water) as `speculative`/`theoretical`.
The agreement on the spine is itself a notable, citeable result for the canon.

---

## Cross-links
- **UP to canon:** non-visual photoreception / melanopsin / ipRGC, cell-water & interstitial-fluid physics
  (glymphatic), redox/HPA-axis signaling → `bucket-canon/05-biophysics/`. Circadian/light is a named
  cross-cutting thread connecting this domain to Kruse-tier biophysics.
- **SIDEWAYS:** meal timing / TRE ↔ Domain D (nutrition/fasting); HRV/autonomic axis ↔ Domain G (breath) &
  Domain H (cold); allostatic load / cortisol ↔ Domain B (inflammaging) & Domain J (Attia/Huberman protocols);
  social jetlag ↔ Domain C (chronotype genetics).
- **CONCEPT-LEVEL:** see `_intake/concept-circadian-light-environment` (canon-target intake) and
  `kruse-blog-corpus` — this domain is the OUTCOME-layer counterpart to that FOUNDATION-layer concept node.

## Gaps flagged for Wave 2
See `_I-SUMMARY.md`. Headline: human glymphatic measurement (does it replicate at scale?); morning-bright-light
RCTs for circadian/mood OUTCOMES (vs the melatonin surrogate); chronotype-aligned scheduling trials; whether
TRE beats calorie-matched controls in humans (the Panda program's open question); HRV-guided training as a
real intervention vs a vanity metric; isolating the contribution of evening light *avoidance* from blue-blocker
*products*; and the primary-derivation chain under the Kruse UV/IR/melanin claims (to decide canon-promotion vs
`speculative` parking).
