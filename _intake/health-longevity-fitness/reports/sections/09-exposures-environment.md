# 09 — Modifiable Exposures & Environment

> **Manual section, v1.0 — 2026-06-28.** Companion graded claims in `02-domains/R-exposures-claims.json`.
> Fills a real gap in the manual: the behavioral and environmental **exposures** that move mortality but
> aren't sold as "biohacks." No supplement, no protocol, no gadget — just the things you breathe, drink,
> smoke, and stand in. These are often the *largest* modifiable effects in the whole manual, and they get
> the least airtime because nobody monetizes "don't smoke" or "filter your air."

*Graded per the manual's evidence tiers; the three honesty rules — predictor ≠ lever, cohort ≠ RCT, something beats nothing — are defined up front in "Start Here."*

**The one-line verdict up front:** the exposures with the biggest, best-established mortality effects are, in
order, **tobacco** (catastrophic, causal, ~10 years of life), **air pollution** (a top-10 *global* killer, causal
for CVD), and **alcohol** (smaller, genuinely contested, and *not* the health tonic the old J-curve implied).
Everything after that — microplastics, PFAS, BPA, sun, heat/cold — ranges from "regulatory-grade real" to
"emerging and over-hyped," and the honest move is to *tier* them rather than lump them as "toxins."

---

## 1. Alcohol — the J-curve is (mostly) dead

This is the central modern debate in lifestyle epidemiology, and it is worth getting exactly right because the
popular understanding is a decade behind the evidence.

### 1.1 The old story (the J-curve)

For ~30 years the dominant finding was a **J-shaped** (or U-shaped) curve: light-to-moderate drinkers had
*lower* all-cause and cardiovascular mortality than both abstainers and heavy drinkers. The canonical synthesis
is **Ronksley 2011** (BMJ meta-analysis, `10.1136/bmj.d671`): moderate drinking associated with ~25% lower CVD
mortality. This is where "a glass of red wine is good for your heart" comes from. The proposed mechanism was
real-ish — ethanol raises HDL and lowers fibrinogen — and so the protective signal was taken at face value.

**Why it's now believed to be largely an artifact:**

- **Abstainer / "sick-quitter" bias.** The reference group ("non-drinkers") is contaminated with people who
  *quit* drinking because they were already ill, plus lifelong abstainers who differ systematically (more
  illness, lower SES, sometimes former heavy drinkers). Comparing drinkers to this sick reference group makes
  light drinking *look* protective.
- **Confounding by health and wealth.** Moderate drinkers are, on average, richer, thinner, more educated, more
  socially connected, and more physically active — all independent predictors of lower mortality.
- **Occasional-drinker misclassification.** Lumping never-drinkers with very-occasional drinkers further
  distorts the reference.

@@FIG:24-alcohol-jcurve@@

### 1.2 The new story (MR + bias-corrected meta + GBD)

Three lines of evidence dismantle the protective claim:

- **Mendelian randomization (Biddinger 2022, JAMA Netw Open, `10.1001/jamanetworkopen.2022.3849`).** Using
  genetic variants that proxy alcohol intake in the UK Biobank (~370k people), the relationship between alcohol
  and cardiovascular disease is **monotonic and steep**, not J-shaped. The light-drinking "benefit" seen in
  observational data largely reflects confounding: light drinkers share favorable lifestyle traits. Genetically
  predicted higher intake raised CVD risk substantially, with risk accelerating at higher intakes. MR is the
  closest thing to a randomized design here because genotype is assigned at conception, breaking reverse
  causation. **Tier: MR (genetic-instrument; treated as quasi-experimental, above cohort, below RCT).**
- **Bias-corrected meta-analysis (Zhao 2023, JAMA Netw Open, `10.1001/jamanetworkopen.2023.6185`).** A
  systematic review of **107 cohort studies / ~4.8M participants**: once studies correctly handle the
  abstainer-reference and occasional-drinker biases, the apparent mortality benefit of low-volume drinking
  **disappears** (no significant risk reduction). Risk rises clearly at higher intakes, and the rise is steeper
  in women.
- **Threshold analysis (Wood 2018, Lancet, `10.1016/S0140-6736(18)30134-X`).** 599,912 current drinkers across
  83 studies: lowest all-cause mortality risk sits at **~100 g of pure alcohol per week (≈5–6 standard
  drinks)**, and above that mortality rises roughly **monotonically**. Note the *direction-specific* nuance:
  alcohol lowered non-fatal myocardial infarction risk but **raised** stroke, fatal aortic aneurysm, heart
  failure, and fatal hypertensive disease — so even the "cardioprotective" piece is a trade between conditions,
  not a free lunch.

### 1.3 Cancer: there is no safe level

For **cancer**, the curve has no protective dip at all. Ethanol and its metabolite **acetaldehyde** (a Group 1
IARC carcinogen) are directly genotoxic; risk for breast, colorectal, liver, esophageal, and head-and-neck
cancers rises essentially **from the first drink**, with no threshold. The **GBD 2016 Alcohol Collaborators
(Griswold 2018, Lancet, `10.1016/S0140-6736(18)31310-2`)** concluded, across 195 countries, that the level of
consumption that **minimizes total health loss is zero** — the small CV offset is overwhelmed by cancer and
injury once you sum all outcomes.

### 1.4 The honest nuance (GBD 2022) — age matters

The follow-up **GBD 2020 Alcohol Collaborators (Bryazka 2022, Lancet, `10.1016/S0140-6736(22)00847-9`)** added a
genuine wrinkle: the **theoretical minimum-risk exposure level is age-dependent.** For younger adults
(roughly <40), where injury/violence dominate alcohol harm, the safe level is effectively **zero**. For older
adults, a *small* amount (around one standard drink/day) sits near the risk minimum because the modest CV/
diabetes offset is more relevant at ages where those diseases dominate. This is not a green light — it's a
statement that the *worst* harm is concentrated in the young, and that for an older adult, light drinking is
closer to neutral than to beneficial.

### 1.5 Practical bottom line

| Endpoint | Honest grade | Practical reading |
|---|---|---|
| **Cancer** | "No safe level" — direct carcinogen, monotonic | Less is better, all the way to zero. The breast-cancer signal in women starts low. |
| **Cardiovascular** | Small, real, *condition-specific* offset; net protective claim **refuted** by MR | Don't start drinking "for your heart." If you have a glass, fine — it's not medicine. |
| **All-cause mortality** | Risk minimum ≈ ≤100 g/week; protective dip largely confounding | Up to ~1 drink/day in older adults ≈ near-neutral; more is monotonic harm. |
| **Younger adults** | Safe level ≈ 0 (injury-dominated) | The young have the most to lose and the least to gain. |

The conflict between the J-curve and the MR/GBD view is registered as a first-class object in
`06-evidence/CONFLICTS.md` (`conflict-alcohol-jcurve`). Status: **partially-resolved** — the *protective claim*
is refuted by the strongest designs; the *exact safe threshold* and the *small CV offset in older adults* remain
genuinely open.

---

## 2. Tobacco & Nicotine — the largest single modifiable killer

If alcohol is contested, tobacco is the opposite: the effect is enormous, causal, and one of the best-quantified
in all of epidemiology. It is the benchmark against which every other exposure should be sized.

### 2.1 Combustible tobacco — the magnitude

- **~10 years of life.** Both the 50-year British Doctors Study (**Doll 2004**, BMJ, `10.1136/bmj.38142.554479.AE`)
  and the U.S. analysis (**Jha 2013**, NEJM, `10.1056/NEJMsa1211128`) converge: lifelong smokers lose **about a
  decade** of life expectancy versus never-smokers.
- **Risk magnitude.** In a mature low-prevalence epidemic (**Banks 2015**, BMC Medicine,
  `10.1186/s12916-015-0281-z`), current smokers had roughly **3× the all-cause mortality** of never-smokers, and
  **up to two-thirds of deaths in current smokers** were attributable to smoking. There is no other consumer
  exposure with a hazard ratio remotely like this.
- **Quitting works, and timing is everything.** Jha 2013: quitting **before age 40 avoids ~90%** of the excess
  mortality from continued smoking. Doll 2004: cessation at ages 30/40/50/60 recovers roughly 10/9/6/3 years.
  This is one of the few places in the manual where the intervention is *proven* to reverse most of the damage.
  **Tier: cohort, but as close to causal as observational data gets** (massive effect size, dose-response,
  biological plausibility, reversibility on cessation — Bradford Hill criteria fully satisfied).

@@FIG:96-smoking-quit@@

### 2.2 Vaping / e-cigarettes — the honest take

This is where nuance is mandatory and both camps oversimplify.

- **Less bad ≠ safe.** E-cigarettes deliver nicotine without combustion, eliminating the tar and most of the
  ~7,000 combustion products that drive smoking's cancer and CVD risk. For an *adult who already smokes*,
  switching completely is very likely a large harm reduction. The Cochrane review (**Hartmann-Boyce 2021**,
  `10.1002/14651858.CD010216.pub5`) finds e-cigarettes help smoking cessation with **moderate-certainty**
  evidence — more effective than nicotine-replacement therapy. So as a *cessation tool for smokers*, the
  evidence is real.
- **But "harm reduction vs. cigarettes" is not "safe."** Vaping is not benign: aerosol contains carbonyls,
  fine particulates, and flavorant breakdown products; the long-term (decadal) outcome data simply don't exist
  yet because the products are too new. "Safer than the most dangerous consumer product ever made" is a low bar.
- **Youth uptake is the real cost.** The population-level concern is **nicotine initiation in adolescents** who
  would never have smoked — recruiting a new generation to nicotine dependence, with plausible effects on the
  developing brain. The risk/benefit flips entirely by population: net-positive for smokers switching,
  net-negative for never-smoking youth starting.

### 2.3 Nicotine itself vs. combustion

Separating the molecule from the delivery is useful. **Combustion** (tar, CO, particulates, nitrosamines) drives
the cancer and most of the cardiopulmonary mortality. **Nicotine** is the addictive agent and is not benign —
it's a vasoconstrictor, raises heart rate/BP acutely, is harmful in pregnancy and adolescence, and sustains
dependence — but it is **not the primary carcinogen.** This is why the harm ordering runs roughly: combustible
cigarettes ≫ heated tobacco / vaping > nicotine pouches/gum ≈ NRT. None of this makes nicotine a nootropic to be
casually adopted; it makes the combustion the thing to flee first.

---

## 3. Air Pollution — a top-10 global killer hiding in plain sight

Air pollution is the most underrated entry in this manual relative to its mortality burden. It is invisible,
unmonetized, and one of the largest environmental risk factors on Earth.

### 3.1 The burden

- **Top-tier global risk factor.** In the **GBD 2019 risk-factor analysis (Murray 2020, Lancet,
  `10.1016/S0140-6736(20)30752-2`)**, particulate-matter air pollution (ambient PM2.5 + household) ranks among
  the **leading global risk factors for death and DALYs**, on the order of millions of attributable deaths per
  year — comparable in magnitude to high blood pressure and tobacco at the population level. The fossil-fuel
  share alone is enormous (**Lelieveld 2023**, BMJ, `10.1136/bmj-2023-077784`).
- **PM2.5 is the actor.** Fine particulate matter <2.5 µm penetrates deep into the lung and crosses into
  circulation, driving systemic inflammation, oxidative stress, endothelial dysfunction, and atherosclerosis.

@@FIG:100-air-pollution@@

### 3.2 What it causes

- **Cardiovascular (causal).** The American Heart Association scientific statement (**Brook 2010**, Circulation,
  `10.1161/CIR.0b013e3181dbece1`) concluded that PM2.5 exposure is a **causal** contributor to cardiovascular
  morbidity and mortality. The landmark cohort (**Pope 2002**, JAMA, `10.1001/jama.287.9.1132`) found each
  **10 µg/m³ increase in long-term PM2.5 raised all-cause mortality ~4%, cardiopulmonary ~6%, and lung cancer
  ~8%.** The dose-response extends below current regulatory limits — there is **no clear threshold of safety.**
- **Dementia / cognition (emerging-to-strong).** PM2.5 is now a recognized modifiable risk factor for dementia
  (**Peters 2019** systematic review, `10.3233/jad-180631`; included as a modifiable factor in the **Lancet
  Commission on Dementia, Livingston 2020, `10.1016/S0140-6736(20)30367-6`**). Tier is cohort/association, but
  the consistency and biological plausibility are growing.
- **All-cause mortality.** Follows from the above; PM2.5 shortens life mainly through cardiovascular and
  respiratory pathways.

### 3.3 Practical mitigation (this one has actionable levers)

Unlike most exposures, you can measurably lower your personal PM2.5 dose:

| Lever | What to do | Evidence |
|---|---|---|
| **Indoor HEPA filtration** | Run a correctly-sized HEPA purifier in the room you sleep/work in. Portable purifiers reliably cut indoor PM2.5. | Intervention studies show real indoor-PM2.5 reduction; surrogate cardiovascular markers improve in small RCTs |
| **AQI-aware behavior** | Check AQI; close windows and run filtration on bad-air / wildfire-smoke days; mask (N95) outdoors during smoke events | Behavioral; grounded in the dose-response — less exposure, less risk |
| **Avoid high-traffic exercise** | Do not run/cycle along busy roads at rush hour — exertion multiplies inhaled dose. Move workouts to parks, off-peak, or indoors with filtration | Mechanistic + exposure-science; exertion raises minute ventilation 5–15× |
| **Cooking/combustion at home** | Vent gas stoves; avoid indoor burning; range hood to outside | Household PM is a major indoor source |

This is one of the highest-leverage, lowest-cost interventions in the entire manual, and it's nearly absent from
the supplement-and-protocol discourse precisely because no one sells it.

---

## 4. Environmental Toxins — honest tiering (the part everyone overclaims)

"Toxins" is where wellness marketing and genuine regulatory science blur. The honest move is to **tier by
evidence**, not to lump. Below, established → precautionary → emerging.

@@FIG:N03-toxin-tiering@@

### 4.1 Heavy metals — established (and historically huge): lead

Lead is the cautionary tale that should calibrate everyone's intuitions about "low-dose" exposures.

- **There is no safe blood-lead level** for cognition in children — the dose-response is steepest at the *lowest*
  exposures.
- **Cardiovascular mortality in adults.** **Lanphear 2018** (Lancet Public Health, `10.1016/S2468-2667(18)30025-2`)
  estimated that **low-level lead exposure was associated with ~256,000 cardiovascular deaths/year in the U.S.** —
  a burden comparable to tobacco-attributable CVD, and *an order of magnitude larger than prior estimates*
  because the harm extends to "normal" exposure levels. **Tier: cohort.**
- **The legacy.** A century of leaded gasoline, paint, and pipes left a body burden in everyone born before the
  1980s phase-out; lead stored in bone re-mobilizes during pregnancy and aging. The leaded-gasoline phase-out is
  arguably one of the largest public-health wins in history — and the historical IQ/violence cost is a live area
  of research. Practical: test water if you have old plumbing; remediate old paint properly.

### 4.2 PFAS — regulatory / epidemiological (real, but not "detox-able")

"Forever chemicals" — per- and polyfluoroalkyl substances — are persistent, bioaccumulative, and near-universal
in human serum.

- **Evidence.** The authoritative review (**Fenton 2020**, Environ Toxicol Chem, `10.1002/etc.4890`) and the
  large C8 occupational/community studies link PFAS (esp. PFOA/PFOS) to **elevated cholesterol, altered immune
  response (reduced vaccine antibody response), thyroid disruption, kidney and testicular cancer, and
  pregnancy-induced hypertension.** This is *regulatory-grade* evidence — strong enough that the U.S. EPA set
  near-zero drinking-water advisory levels.
- **Honest framing.** Most of the human evidence is **association/epidemiological**, not RCT (you can't randomize
  PFAS), and effect sizes for individuals are modest relative to the population-regulatory concern. There is **no
  validated "detox"** — the lever is *avoiding intake* (filtered water, fewer stain/grease-proof coatings), not
  chelation or cleanses.

### 4.3 BPA & phthalates — endocrine disruptors (plausible, partly established)

- **What.** Bisphenol-A (plastics, can linings, receipts) and phthalates (flexible plastics, fragrances, PVC)
  are **endocrine-disrupting chemicals (EDCs)** — they interact with hormone receptors.
- **Evidence.** Mechanistic and animal data are strong for endocrine disruption; human data link phthalate
  exposure to cardiovascular and metabolic outcomes (**Mariana 2020**, `10.3390/jcdd7030026`) and the EU burden
  analysis (**Trasande 2015**, JCEM, `10.1210/jc.2014-4324`) estimated substantial attributable disease cost. A
  newer prospective analysis ties prenatal phthalate exposure to adverse birth outcomes (**Trasande 2024**,
  Lancet Planet Health). **Tier: mechanistic + association; some cohort.** The individual effect size is uncertain;
  the precautionary case (especially in pregnancy and early childhood) is reasonable.
- **Lever.** Reduce, don't panic: avoid microwaving food in plastic, prefer glass/stainless for hot/fatty foods,
  ventilate, choose fragrance-free where easy. Don't pay for "EDC detox."

### 4.4 Microplastics — emerging (mostly mechanistic/association — do NOT overclaim)

This is the one to be most disciplined about.

- **What's real.** Microplastics and nanoplastics are now detectable in human **blood** (**Leslie 2022**,
  Environ Int, `10.1016/j.envint.2022.107199`), placenta, lung, and other tissues. Ubiquity is established.
- **What's NOT established.** That this measurable *presence* causes measurable *harm* in humans. The evidence is
  overwhelmingly **mechanistic (cell/animal: inflammation, oxidative stress) and cross-sectional association.**
  A widely-cited 2024 study associated carotid-plaque microplastics with cardiovascular events — *hypothesis-
  generating*, not proof, and heavily confounded. **Tier: mechanistic + early association.** Treat any
  "microplastics are killing you" claim as **emerging**, not settled. The precautionary lever (filter water,
  reduce single-use plastic, don't heat food in plastic) overlaps entirely with the BPA/phthalate advice and
  costs nothing — so it's reasonable *as low-regret hygiene*, not as a proven mortality intervention.

### 4.5 Water quality — the practical convergence point

Notice that lead, PFAS, BPA, and microplastics all share **one cheap lever: filter your drinking water.** A
certified activated-carbon + (ideally) reverse-osmosis filter addresses lead, many PFAS, and particulate
microplastics simultaneously. Know your local water report; if you're on a private well or old municipal pipes,
test. This is the single highest-leverage move across the entire "toxins" category, and it's the one with
**actual regulatory standards** behind it (EPA contaminant limits).

> **Tiering summary:** Lead = established (cohort, large). PFAS = regulatory/epidemiological (strong association).
> BPA/phthalates = plausible EDCs (mechanistic + some cohort). Microplastics = emerging (mostly mechanistic).
> The shared lever — filtered water + less plastic contact with hot/fatty food — is low-regret regardless of where
> the science lands.

---

## 5. UV / Sun — the two-sided ledger

Sun exposure is the manual's clearest case of a genuine trade-off, and it's a place where dermatology and
mortality epidemiology give honestly different advice. Resist dogma in either direction.

@@FIG:N09-sun-ledger@@

### 5.1 The cost side (dermatology is right)

UV radiation is a **proven, complete carcinogen** for skin: it causes basal cell carcinoma, squamous cell
carcinoma, and melanoma, and drives essentially all **photoaging** (wrinkles, elastosis, pigmentation). For skin
cancer there is no controversy — cumulative and intense intermittent UV both raise risk, and sunburns
(especially in childhood) are a strong melanoma risk factor. Sunscreen, shade, and avoiding burns are sound.

### 5.2 The benefit side (mortality epidemiology complicates it)

Here's the uncomfortable cohort finding. The **Melanoma in Southern Sweden (MISS) cohort** followed ~29,000 women
for 20 years:

- **Lindqvist 2014** (J Intern Med, `10.1111/joim.12251`): **avoidance of sun exposure was a risk factor for
  all-cause mortality** — sun-avoiders had roughly **2× the mortality** of the highest sun-exposure group.
- **Lindqvist 2016** (J Intern Med, `10.1111/joim.12496`, competing-risk analysis): the mortality benefit of sun
  exposure came mainly from **lower cardiovascular and non-cancer/non-CVD death**, and was striking enough that
  the authors framed it provocatively — **nonsmokers who avoided sun had a life expectancy similar to smokers in
  the highest sun-exposure group**, i.e., sun avoidance carried a risk on the order of smoking.

**The honest caveats (this is cohort, not RCT, and confounding is severe):**

- Sun exposure is a **marker** of being outdoors, active, affluent, and able to travel — classic healthy-user
  confounding.
- Reverse causation: sick people stay indoors.
- It is **observational and largely in fair-skinned Northern Europeans** at low UV latitude — it does **not**
  generalize to high-UV settings or darker skin, where the skin-cancer side of the ledger weighs more.
- Whether the benefit is **UV per se** (vitamin D, nitric-oxide-mediated blood-pressure lowering, circadian
  light entrainment) or just **"outdoorsiness"** is unresolved — and the vitamin-D *supplement* RCTs (VITAL,
  Domain D) were **null**, which argues the benefit is **not** simply vitamin D in a pill.

### 5.3 The plausible mechanisms on the benefit side

- **Vitamin D status** (a *predictor*, not a proven *lever* — supplementation didn't replicate the cohort benefit).
- **Nitric oxide release** from skin on UVA exposure → modest blood-pressure lowering (mechanistic).
- **Circadian / mood:** daytime bright-light exposure entrains the circadian clock and supports mood/sleep
  (cross-link Domain I, sleep-circadian) — this is arguably the most robust non-skin benefit.

### 5.4 Practical synthesis (not dogmatic)

| Goal | Reasonable practice |
|---|---|
| Skin-cancer / photoaging | Avoid **burns**; sunscreen for prolonged/intense exposure; more caution with fair skin, high UV, midday |
| Circadian / mood / "outdoorsiness" benefit | Get **regular, non-burning** daylight exposure (morning light especially); be outdoors |
| The honest middle | **Sensible, sunburn-free sun exposure** beats both extremes — total avoidance carries its own cohort-level mortality signal; chronic burning causes cancer |

The conflict (skin-cancer "avoid UV" vs. mortality "sun-avoidance is a risk factor") is real and is captured in
the claims file as a `mixed`-direction case. The resolution is *dose and context*: avoid burns, don't avoid
daylight.

---

## 6. Temperature — environmental heat and cold mortality

Ambient temperature is a large, under-appreciated environmental mortality factor — distinct from the *deliberate*
sauna/cold-plunge protocols in Domain H (thermal). This is about the temperature you passively live in.

- **Cold kills more than heat (at the population level).** The landmark multi-country study (**Gasparrini 2015**,
  Lancet, `10.1016/S0140-6736(14)62114-0`) analyzed **384 locations across 13 countries**: **7.71% of all deaths
  were attributable to non-optimal ambient temperature**, and the overwhelming majority — **7.29% — was due to
  cold**, versus only **0.42% from heat.** Moderate (not extreme) cold did most of the damage, through
  cardiovascular and respiratory pathways. **Tier: cohort (multi-country, time-series).**

@@FIG:L18-cold-heat@@

- **The climate-change caveat.** This historical ledger is shifting: heat-attributable mortality is rising with
  warming and with aging populations, and extreme-heat events (which the time-series "moderate temperature"
  framing underweights) are an increasing acute risk. Both tails matter.
- **Practical levers:** adequate **home heating in winter** is a genuine, under-recognized mortality lever
  (cold-home mortality is real, especially for the elderly and cardiovascular patients); **heat preparedness**
  (cooling, hydration, avoiding midday exertion) during heatwaves for the vulnerable. Note this is the *opposite*
  framing from hormetic sauna/cold protocols — passive chronic cold/heat stress on a frail body is harmful;
  acute *controlled* thermal exposure in a healthy body is the Domain-H hormesis story. Don't confuse the two.

---

## 7. Putting exposures in proportion

A closing calibration, because the manual's supplement and protocol sections can make readers lose the plot on
*magnitude*. The **Stringhini 2017** multicohort analysis (Lancet, `10.1016/S0140-6736(16)32380-7`, ~1.7M people)
quantified how much different risk factors shorten life — and **smoking and the socioeconomic/behavioral
exposures dwarf most of what gets optimized in longevity culture.**

@@FIG:L13-exposures@@

**Rough ordering of modifiable-exposure mortality impact (largest first):**

1. **Tobacco (combustible)** — ~10 years; causal; the single biggest lever. *(If you do one thing in this entire
   manual: don't smoke, and if you do, quit before 40.)*
2. **Air pollution (PM2.5)** — top-10 *global* risk factor; causal for CVD; partly within personal control via
   filtration and behavior.
3. **Alcohol** — real but smaller and contested; "no safe level" for cancer, near-neutral (not protective) for
   all-cause in older adults; harmful from the first drink in the young.
4. **Lead / heavy metals** — large historical and ongoing CVD burden; lever = water/old-paint remediation.
5. **Ambient cold/heat** — population-large (7.7% of deaths) but mostly about housing and vulnerability, not
   individual "biohacking."
6. **Sun** — a genuine two-sided ledger; avoid burns, don't avoid daylight.
7. **PFAS / BPA / phthalates** — regulatory-to-plausible; lever = filtered water + less plastic; modest
   individual effect.
8. **Microplastics** — emerging; do not overclaim; low-regret hygiene only.

The unifying point: the highest-leverage longevity moves are not in a supplement bottle. They're **not smoking,
clean air, sane drinking, clean water, and sensible sun.** None of them are sold to you, which is exactly why
they're underweighted.

---

## Cross-references

- **Domain H (thermal)** — *deliberate* sauna/cold hormesis vs. this section's *passive* ambient-temperature
  mortality. Opposite framings; don't conflate.
- **Domain D (metabolic-nutrition)** — vitamin D supplement RCTs (VITAL) were null, which bears directly on the
  sun-exposure mechanism debate (§5.2).
- **Domain I (sleep-circadian)** — daytime bright-light exposure is the most robust non-skin benefit of sun.
- **Section 03 (nutrition-supplements)** — water filtration and "detox" claims; no validated detox for any of
  the persistent toxins here.

---

## Go deeper — primary sources

1. **Biddinger KJ et al. (2022).** "Association of Habitual Alcohol Intake With Risk of Cardiovascular Disease."
   *JAMA Network Open.* `10.1001/jamanetworkopen.2022.3849`. — The Mendelian-randomization paper that breaks the
   alcohol J-curve; read this first on alcohol.
2. **Bryazka D / GBD 2020 Alcohol Collaborators (2022).** "Population-level risks of alcohol consumption by amount,
   geography, age, sex, and year." *The Lancet.* `10.1016/S0140-6736(22)00847-9`. — The "safe level depends on age"
   nuance, from the Global Burden of Disease group.
3. **Jha P et al. (2013).** "21st-Century Hazards of Smoking and Benefits of Cessation in the United States." *NEJM.*
   `10.1056/NEJMsa1211128`. — The ~10-years-lost and "quit before 40 → avoid 90%" reference.
4. **Pope CA III et al. (2002).** "Lung Cancer, Cardiopulmonary Mortality, and Long-term Exposure to Fine
   Particulate Air Pollution." *JAMA.* `10.1001/jama.287.9.1132`. — The landmark PM2.5 mortality dose-response;
   pair with **Brook 2010** (AHA causal statement, `10.1161/CIR.0b013e3181dbece1`).
5. **Lindqvist PG, Epstein E et al. (2016).** "Avoidance of sun exposure as a risk factor for major causes of
   death." *J Intern Med.* `10.1111/joim.12496`. — The provocative MISS-cohort sun/mortality finding (read with its
   confounding caveats; see also Lindqvist 2014, `10.1111/joim.12251`).
6. **Gasparrini A et al. (2015).** "Mortality risk attributable to high and low ambient temperature: a multicountry
   observational study." *The Lancet.* `10.1016/S0140-6736(14)62114-0`. — Cold >> heat at the population level
   (7.71% of deaths attributable to non-optimal temperature).
7. **Lanphear BP et al. (2018).** "Low-level lead exposure and mortality in US adults." *Lancet Public Health.*
   `10.1016/S2468-2667(18)30025-2`. — Lead's still-large cardiovascular mortality burden; calibrates "low-dose"
   intuitions. (For PFAS, **Fenton 2020**, `10.1002/etc.4890`.)
