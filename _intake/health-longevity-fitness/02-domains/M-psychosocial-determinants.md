# Domain M — Psychosocial Determinants of Mortality & Healthspan

> **Status:** v0.1 (Wave 5) — 2026-06-27. Graded claim set; companion data in `M-claims.json` (11 claims).
> **Discipline:** social epidemiology + health psychology. The **outcome/application layer**.
> **Why this domain exists (the unbiased-completeness argument):** the longevity/biohacking world
> spends its attention on supplements, cold plunges, peptides, NAD+, and CGM curves — interventions
> whose hard-outcome effect sizes are mostly `mechanistic`/`surrogate` or small. Meanwhile the
> **largest, most replicated all-cause-mortality effects in the entire corpus are social and
> psychological**: social connection, sense of purpose, and socioeconomic position. This is not a
> soft-science footnote — by effect size it dominates most of what gets sold. A map that under-weights
> it is biased. This domain corrects that.

## The headline asymmetry (read this first)
- **Social connection — meta-analytic, n>300,000:** stronger social relationships raise survival odds
  **~50% (OR ≈ 1.50)** — an effect Holt-Lunstad explicitly benchmarks as **comparable to quitting
  smoking and greater than obesity or physical inactivity** (Holt-Lunstad 2010, `meta`). Almost no
  supplement or device in this corpus has a hard-endpoint effect of that magnitude or that evidence tier.
- That single fact is the reason this domain is graded *up*, not down. The honest move is to say so
  plainly: **the supplement aisle is mostly `mechanistic`; loneliness is `meta`-tier `outcome`.**

## How to read the tiers
Several of these claims sit at `meta`/`cohort` — the **top of the observational ladder, larger samples
than most of the corpus** — but they remain **observational**: confounding and reverse causation are the
governing caveat (sick/poor/isolated states cause and are caused by each other). The honest grade is
"large, replicated, observational, causally tangled" — not "proven lever." We never upgrade a `cohort`
association to a demonstrated intervention effect (that's the same rule applied to sauna in Domain H).

---

## 1. Social connection ↔ mortality (the flagship)

- **Holt-Lunstad, Smith & Layton, PLoS Med 2010** (`10.1371/journal.pmed.1000316`, meta of **148 studies,
  n≈308,849, mean 7.5y**): stronger social relationships → **OR 1.50 (95% CI 1.42–1.59) increased odds of
  survival**. Effect held across age, sex, cause of death. The paper's framing — connection rivals smoking,
  exceeds obesity/inactivity — is the load-bearing comparison for this whole domain. `meta` / outcome.
- **Holt-Lunstad et al., Perspect Psychol Sci 2015** (`10.1177/1745691614568352`, meta of **70 studies,
  n≈3.4M**): **social isolation OR ≈ 1.29, loneliness ≈ 1.26, living alone ≈ 1.32** for mortality — all
  significant after adjustment. Establishes that **objective isolation and subjective loneliness are
  partly distinct risk factors.** `meta` / outcome.
- **Steptoe et al., PNAS 2013** (`10.1073/pnas.1219686110`, ELSA, **n≈6,500 older adults**): when modeled
  together, **objective social isolation predicted mortality (HR ≈ 1.26) but the loneliness association
  attenuated to non-significance after demographic/health adjustment.** A genuine within-field conflict
  (see `conflict-loneliness-vs-isolation`): *which* matters more is unresolved, and they likely act through
  different pathways (isolation = practical/biological; loneliness = psychological/behavioral). `cohort` / mixed.

**Watch the gap:** these are associations. Loneliness/isolation cluster with poverty, illness, depression,
and bereavement; some of the signal is reverse-causal. But the effect survives heavy adjustment and is
replicated at meta scale — which is *more* than can be said for most biohacks. Grade it honestly in **both**
directions: do not dismiss it as confounded, do not launder it into "calling your mother adds 7 years."

## 2. Sense of purpose / ikigai ↔ mortality & cognition

- **Alimujiang et al., JAMA Netw Open 2019** (`10.1001/jamanetworkopen.2019.4270`, HRS, **n≈6,985, age >50**):
  lowest vs highest life-purpose → **HR ≈ 2.43 for all-cause mortality** over ~4y. `cohort` / outcome.
- **Boyle et al., Psychosom Med 2009** (`10.1097/PSY.0b013e3181a5a7c0`, Rush MAP/MAP, older adults):
  greater purpose in life → **~HR 0.57 mortality** (high vs low). `cohort` / outcome.
- **Boyle et al., Arch Gen Psychiatry 2010** (`10.1001/archgenpsychiatry.2009.208`): greater purpose →
  **~2.4× lower risk of incident Alzheimer disease and MCI**, and slower cognitive decline. `cohort` / outcome.

**The mechanism vs outcome line:** purpose plausibly works through behavior (the purposeful exercise, eat,
adhere, seek care, stay socially engaged) and through stress/HPA pathways — but the *outcome* (lower
mortality/dementia) is a robust cohort association, **not** a demonstrated effect of "installing purpose."
Ikigai (the Okinawa/Blue-Zones framing) is the popular face of the same construct; cross-link Domain C2
(population-longevity) and note the Blue-Zones data-quality caveat (Newman) applies to the *counting*, not
to the purpose→health association, which stands on independent cohorts.

## 3. Socioeconomic status — the Marmot gradient

- **Marmot et al., Whitehall I — J Epidemiol Community Health 1978** (`10.1136/jech.32.4.244`,
  ~18,000 male civil servants): a **stepwise inverse social gradient** — lowest employment grade had
  **~3× the CHD mortality** of the highest. Crucially, this is **not poverty vs not-poverty**: even
  comfortable mid-grade civil servants had higher mortality than the grade above them. `cohort` / outcome.
- **Marmot et al., Whitehall II — Lancet 1991** (`10.1016/0140-6736(91)93068-K`): replicated the gradient
  in a newer cohort (incl. women), pointing to **low job control/autonomy and chronic psychosocial stress**
  as mediators more than classic risk factors alone. `cohort` / outcome (+ mechanism hypothesis).

**Why this belongs in a longevity corpus:** the social gradient in mortality is one of the most robust
findings in all of epidemiology, and it **dwarfs the effect of nearly every consumer longevity
intervention**. The biohacking frame ("optimize *your* inputs") systematically ignores that **position in
the social hierarchy** — control, status, security — is itself a dominant input. Honest grade: `cohort`,
strong, partly mediated by behavior/access but with a residual that points at autonomy/stress biology.

## 4. Chronic stress & allostatic load (the proposed mechanism layer)

- **McEwen, NEJM 1998** (`10.1056/NEJM199801153380307`): **allostatic load** — the cumulative physiological
  cost of chronic stress-mediator activation (HPA/cortisol, sympathetic, inflammatory, metabolic). The
  framework that *connects* §1–§3 to biology: isolation, low status, and lack of purpose plausibly converge
  on chronic stress-axis dysregulation → cardiometabolic and immune aging. `theoretical`/`mechanistic`.

**The hazard (same as hormesis in Domain H):** allostatic load is **inconsistently operationalized** and
risks becoming an unfalsifiable post-hoc explanation. It explains more than it predicts. Tagged
`theoretical` — it is the *bridge hypothesis*, not an outcome, and not a settled mechanism. Cross-link
Domain I (cortisol/HRV) and UP to canon (HPA-axis, redox stress signaling).

## 5. Religious/community participation ↔ mortality

- **Li, VanderWeele et al., JAMA Intern Med 2016** (`10.1001/jamainternmed.2016.1615`, Nurses' Health Study,
  **n≈74,000 women, 20y**): frequent (≥1×/week) religious-service attendance → **HR ≈ 0.67 all-cause
  mortality** vs never, with mediation through **social support, optimism, lower depression, less smoking**.
  `cohort` / outcome.

**Read it correctly:** the active ingredient is most plausibly **community / regular social ritual / shared
meaning**, not metaphysics — which is why it sits alongside §1 (connection) and §2 (purpose) as another
route to the same psychosocial substrate. Heavy healthy-adherer confounding; all-female cohort. `cohort`,
not `rct`.

---

## The honest summary of this domain
1. **The effect sizes here are real and large** — `meta`/`cohort`, samples in the hundreds of thousands to
   millions — and by the corpus's own grading rules they **outrank most supplement and device claims**,
   which sit at `mechanistic`/`surrogate`. Saying otherwise would be the bias this domain exists to remove.
2. **They are also observational and causally tangled.** None is an RCT (you cannot randomize loneliness,
   status, or purpose). The defensible claim is "large replicated association with a plausible stress-axis
   mechanism," not "proven intervention."
3. **They are systematically under-sold** precisely because they are **not monetizable** — there is no SKU
   for friendship, job autonomy, or meaning. That market gap is *why* the biohacking map under-weights them,
   and is the cleanest illustration of why "unbiased" requires deliberately indexing what nobody is selling.

## Cross-links
- **UP to canon:** HPA-axis / glucocorticoid signaling, chronic inflammation, redox stress → `bucket-canon/05-biophysics/` (allostatic-load mechanism layer).
- **SIDEWAYS:** stress/cortisol/HRV ↔ Domain I (sleep & recovery); purpose/ikigai ↔ Domain C2 (Blue Zones, with the Newman counting caveat); behavior-mediation ↔ Domains D/E (the purposeful actually adhere).
- **CONFLICTS:** `conflict-loneliness-vs-isolation` (subjective vs objective — Steptoe).

## Gaps flagged for Wave 6
Women- and non-Western-specific social-gradient data; whether *intervening* on loneliness (befriending
programs, social prescribing) actually moves mortality (the few RCTs are small/surrogate); disentangling
purpose from baseline health/personality; allostatic-load operationalization standardization; the
behavior-vs-biology share of each association; and the uncomfortable policy implication that the biggest
longevity lever (social position) is structural, not personal.
