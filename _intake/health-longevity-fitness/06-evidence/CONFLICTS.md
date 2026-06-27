# Conflicts — disagreement is data (first-class objects)

> Per `SCHEMA.md`: conflicts stay `open` unless a `meta`-tier source resolves them. A practitioner's
> name is provenance, not evidence. Each conflict records BOTH sides with their best evidence tier.
> JSON mirror lives inline below each entry for machine ingestion.

Seeded 2026-06-27 from Domain B (aging mechanisms). Append, don't overwrite.

---

## conflict-cr-primate-survival — Does caloric restriction extend survival in primates?
- **side_a (yes):** Wisconsin (WNPRC) rhesus study — CR delayed disease onset and reduced age-related &
  all-cause mortality. Champions: Colman, Anderson, Weindruch. Tier: `animal` (primate). Papers:
  Colman 2009 `10.1126/science.1173635`; Colman 2014 `10.1038/ncomms4557`.
- **side_b (no/neutral):** NIA rhesus study — CR improved metabolic markers but did NOT significantly
  extend survival overall. Champions: Mattison, Roth, de Cabo. Tier: `animal` (primate). Paper:
  Mattison 2012 `10.1038/nature11432`.
- **status:** `partially-resolved`. Joint re-analysis (Mattison/Colman 2017 `10.1038/ncomms14063`)
  attributes the gap to **age of onset, diet composition, sex, and how control monkeys were fed**
  (NIA controls ate less/healthier). CR's primate survival benefit is **context-dependent**, not universal.
- **resolution_notes:** No `meta`-tier resolution; no human survival RCT exists or is feasible.

```json
{"id":"conflict-cr-primate-survival","question":"Does caloric restriction extend survival in primates?","side_a":{"claim":"CR reduces age-related and all-cause mortality (Wisconsin)","champions":["Colman","Anderson","Weindruch"],"tier":"animal-primate"},"side_b":{"claim":"CR improves healthspan but not overall survival (NIA)","champions":["Mattison","Roth","de Cabo"],"tier":"animal-primate"},"status":"partially-resolved","resolution_notes":"Mattison 2017 attributes divergence to onset age, diet, sex, control feeding. Context-dependent."}
```

---

## conflict-nad-precursor-efficacy — Do NAD+ precursors (NR/NMN) produce health/longevity outcomes in humans?
- **side_a (efficacy):** NR/NMN reliably raise blood NAD+ and improve metabolic/vascular surrogates;
  proponents argue benefit follows. Champions: Sinclair, Brenner (on NR safety/PK), Imai (NMN). Tier:
  `rct` but **surrogate** endpoints only. Paper: Martens 2018 `10.1038/s41467-018-03421-7`.
- **side_b (no proven outcome):** raising NAD+ is a surrogate; no human trial has moved a disease or
  longevity endpoint, effect sizes are small, and marketing far outruns the data. Tier: absence of
  hard-endpoint `rct`/`meta`.
- **status:** `open`. The *mechanism* (NAD+ ↑) is real; the *outcome* is unproven.
- **resolution_notes:** Needs adequately powered hard-endpoint RCTs. Distinct sub-debate: NR vs NMN
  bioavailability, and whether oral NMN even reaches tissues intact.

```json
{"id":"conflict-nad-precursor-efficacy","question":"Do NAD+ precursors produce human health/longevity outcomes (not just raise NAD+)?","side_a":{"claim":"NR/NMN raise NAD+ and improve surrogates → benefit","champions":["Sinclair","Brenner","Imai"],"tier":"rct-surrogate"},"side_b":{"claim":"Only surrogate moved; no hard-endpoint trial; hype exceeds data","champions":["skeptics/replication"],"tier":"absence-of-hard-endpoint"},"status":"open","resolution_notes":"Mechanism real, outcome unproven; needs powered hard-endpoint RCTs."}
```

---

## conflict-resveratrol-sirtuin — Does resveratrol activate SIRT1 directly, and does it extend mammalian lifespan?
- **side_a (yes):** resveratrol is a direct SIRT1 activator that mimics CR and extends lifespan.
  Champions: Sinclair, Auwerx (early). Tier: `animal`/`invitro` (extends lifespan in obese/high-fat-fed
  mice, not lean; worm/fly results disputed).
- **side_b (artifact/no):** the in-vitro SIRT1 activation was a **fluorophore assay artifact**; resveratrol
  does not robustly extend lifespan in normal-diet mammals; effects (if any) are indirect (AMPK).
  Champions: Pacholec et al. (2010, Pfizer), Baur. Tier: `invitro`/`animal` refutation.
- **status:** `open` (leaning side_b on the *direct-activator* mechanism). Resveratrol's lean-animal
  lifespan claim is largely **not replicated**; it improved healthspan markers in high-fat-fed mice only.
- **resolution_notes:** The STAC/sirtuin-activator program shifted to synthetic STACs; clinical longevity
  benefit of resveratrol remains unproven.

```json
{"id":"conflict-resveratrol-sirtuin","question":"Does resveratrol directly activate SIRT1 and extend mammalian lifespan?","side_a":{"claim":"Direct SIRT1 activator, CR mimetic, extends lifespan","champions":["Sinclair","Auwerx"],"tier":"animal+invitro"},"side_b":{"claim":"In-vitro activation was a fluorophore artifact; no lifespan extension in lean mammals","champions":["Pacholec","Baur"],"tier":"invitro+animal-refutation"},"status":"open","resolution_notes":"Lean-animal lifespan claim not replicated; effects (if any) indirect via AMPK."}
```

---

## conflict-rapamycin-dosing — What rapamycin dose/schedule is geroprotective without immunosuppression?
- **side_a (intermittent/low-dose):** pulsed or low-dose rapamycin (or rapalogs) can deliver
  geroprotective mTORC1 inhibition while sparing the immunosuppressive/metabolic side effects of chronic
  high-dose dosing; Mannick's intermittent everolimus *improved* elderly immune function. Champions:
  Mannick, Blagosklonny, Kaeberlein. Tier: mouse `animal` + human surrogate `rct` (`10.1126/scitranslmed.3009892`).
- **side_b (caution):** daily rapamycin is immunosuppressive, raises glucose/lipids and risks insulin
  resistance (mTORC2 inhibition); optimal human geroprotective dose is unknown and self-dosing is
  premature. Tier: clinical pharmacology / `mechanistic`.
- **status:** `open`. No human RCT has established a geroprotective rapamycin dose against hard endpoints
  (PEARL and dog-aging trials are read-outs to watch).
- **resolution_notes:** Mouse lifespan benefit is robust (Harrison 2009); the *human dose-response window*
  separating geroprotection from immunosuppression is unresolved.

```json
{"id":"conflict-rapamycin-dosing","question":"What rapamycin dose/schedule is geroprotective in humans without immunosuppression?","side_a":{"claim":"Intermittent/low-dose gives geroprotection while sparing side effects","champions":["Mannick","Blagosklonny","Kaeberlein"],"tier":"animal+rct-surrogate"},"side_b":{"claim":"Daily dosing immunosuppresses & worsens metabolism; optimal human dose unknown","champions":["clinical pharmacology"],"tier":"mechanistic"},"status":"open","resolution_notes":"Mouse benefit robust; human dose-response window unresolved (PEARL, dog-aging to watch)."}
```

---

## conflict-free-radical-theory — Is oxidative damage (ROS) a primary cause of aging?
- **side_a (yes, classic):** Harman's free-radical / mitochondrial theory — ROS accumulate and damage
  macromolecules, driving aging; antioxidants should help. Tier: `mechanistic`/historical.
- **side_b (no/mitohormesis):** antioxidant supplementation does not extend lifespan (and high doses can
  blunt exercise/CR benefits); **low ROS act as beneficial signals** (mitohormesis); some long-lived
  mutants have *higher* ROS. Champions: Ristow (mitohormesis), Gems, Doonan. Tier: `animal` + human
  antioxidant-RCT `meta` (null/harm).
- **status:** `mostly-resolved against the naive version`. ROS are a signaling axis, not a simple poison;
  antioxidant supplements have repeatedly failed to extend healthy lifespan.
- **resolution_notes:** Strongest near-`meta` evidence here (antioxidant RCT meta-analyses null/harmful),
  so this conflict is the closest to closed — but redox biology remains a live canon-level (biophysics) question.

```json
{"id":"conflict-free-radical-theory","question":"Is oxidative damage (ROS) a primary cause of aging?","side_a":{"claim":"ROS accumulate and drive aging; antioxidants should help","champions":["Harman"],"tier":"mechanistic-historical"},"side_b":{"claim":"Mitohormesis: low ROS are beneficial signals; antioxidants don't extend lifespan","champions":["Ristow","Gems","Doonan"],"tier":"animal+meta-null"},"status":"mostly-resolved-against-naive-version","resolution_notes":"Antioxidant RCT meta-analyses null/harmful; redox remains a live biophysics-canon question."}
```

---

## conflict-metformin-geroprotection — Does metformin slow aging in non-diabetics?
- **side_a (geroprotector):** diabetics on metformin outlived matched non-diabetics (Bannister 2014
  `10.1111/dom.12354`); plausible AMPK/mTOR mechanism → basis for the TAME trial. Champions: Barzilai. Tier:
  `cohort` (observational) + `mechanistic`.
- **side_b (skeptic):** the cohort signal is confounded (immortal-time/prevalent-user bias); metformin
  **blunted** some exercise adaptations (e.g., MASTERS-type findings) and may reduce VO2max gains; no
  hard-endpoint RCT in non-diabetics exists. Tier: `rct` (exercise-interference) + epidemiologic critique.
- **status:** `open`. TAME (`10.1016/j.cmet.2016.05.011`) is designed to test it but is a *protocol*, not a result.
- **resolution_notes:** Real target of TAME is regulatory (making "aging" an endpoint), not proving this one drug.

```json
{"id":"conflict-metformin-geroprotection","question":"Does metformin slow aging in non-diabetics?","side_a":{"claim":"Metformin users outlive non-diabetics; AMPK/mTOR mechanism","champions":["Barzilai"],"tier":"cohort+mechanistic"},"side_b":{"claim":"Cohort confounded; blunts exercise adaptation; no hard-endpoint RCT","champions":["exercise-physiology","epi-critique"],"tier":"rct+epi-critique"},"status":"open","resolution_notes":"TAME is a trial design, not a result; real aim is regulatory precedent."}
```

---

> Appended 2026-06-27 from Domains E (exercise), H (thermal), G (breath). Append, don't overwrite.

## conflict-cold-after-resistance — Does post-exercise cold immersion blunt strength/hypertrophy gains?
- **side_a (cold blunts adaptation):** Post-exercise cold-water immersion attenuates acute anabolic
  signalling (mTOR pathway, satellite-cell activity) and **reduced long-term muscle hypertrophy and
  strength gains** vs active recovery in a controlled training study. Champions: Roberts, Peake. Tier:
  `rct` (human training study). Paper: Roberts et al., J Physiol 2015 `10.1113/JP270570`.
- **side_b (cold useful for recovery/other goals):** cold immersion reduces perceived soreness/fatigue
  and may aid recovery between same-day bouts or in endurance/heat contexts; the hypertrophy penalty is
  irrelevant if strength gain isn't the session's goal. Tier: `rct`/`mechanistic` (recovery endpoints).
- **status:** `mostly-resolved (context-dependent)`. The *timing* is the resolver: **do not ice right
  after resistance training if hypertrophy/strength is the goal**; cold for recovery on non-lifting or
  endurance days is fine. Mechanism = cold dampens the very anabolic signalling that drives muscle growth.
- **resolution_notes:** A clean mechanism→outcome chain in humans (rare here). Separate the goal: recovery vs adaptation.

```json
{"id":"conflict-cold-after-resistance","question":"Does post-exercise cold immersion blunt strength/hypertrophy gains?","side_a":{"claim":"Cold immersion after lifting attenuates anabolic signalling and reduces long-term hypertrophy/strength","champions":["Roberts","Peake"],"tier":"rct-human-training"},"side_b":{"claim":"Cold aids perceived recovery/soreness; penalty irrelevant if hypertrophy isn't the goal","champions":["recovery-physiology"],"tier":"rct-recovery-endpoints"},"status":"mostly-resolved-context-dependent","resolution_notes":"Timing resolves it: avoid cold right after resistance training when growth/strength is the goal; fine for recovery on other days."}
```

---

## conflict-static-stretch-performance — Does pre-exercise static stretching impair strength/power?
- **side_a (impairs):** Acute pre-exercise static stretching (esp. long holds >60s) transiently reduces
  maximal strength, power and sprint/jump performance ("stretch-induced force deficit"). Tier:
  `meta`/`rct`. Reviewed in Chaabène et al., Front Physiol 2019 `10.3389/fphys.2019.01468`.
- **side_b (negligible in practice):** the deficit is **small, short-lived, and largely abolished by
  short holds (<60s) followed by a dynamic warm-up / sport-specific activity**; for flexibility-dependent
  or injury-prevention goals static stretching remains useful, and the real-world performance effect is
  often trivial. Champions: Chaabène, Behm. Tier: `meta` (effect-size qualification).
- **status:** `mostly-resolved (dose/timing qualified)`. **Long static holds immediately before power
  output: avoid.** Short holds + dynamic warm-up: negligible penalty. The early "never static-stretch
  before sport" panic was an overcorrection.
- **resolution_notes:** Not a true open disagreement so much as a dose/timing nuance the popular framing flattened.

```json
{"id":"conflict-static-stretch-performance","question":"Does pre-exercise static stretching impair strength/power?","side_a":{"claim":"Acute static stretching (long holds) transiently reduces strength/power/sprint","champions":["force-deficit literature"],"tier":"meta+rct"},"side_b":{"claim":"Deficit small/short-lived; abolished by short holds + dynamic warm-up; stretching still useful for ROM","champions":["Chaabene","Behm"],"tier":"meta-qualification"},"status":"mostly-resolved-dose-timing","resolution_notes":"Avoid long static holds immediately before power; short holds + dynamic warm-up = negligible penalty."}
```

---

## conflict-zone2-optimal-mito — Is Zone 2 the uniquely optimal intensity for mitochondrial biogenesis?
- **side_a (Zone 2 special):** training near the first lactate threshold maximizes fat oxidation and
  mitochondrial-density adaptations and is the "base" that should dominate endurance volume. Champions:
  San-Millán, Attia, endurance-coaching tradition. Tier: `mechanistic`/cross-sectional
  (San-Millán & Brooks 2018 `10.1007/s40279-017-0751-x`).
- **side_b (intensity is not uniquely optimal):** HIIT and higher intensities also strongly drive
  mitochondrial biogenesis (PGC-1α), sometimes faster per-session; the "Zone 2 is THE mitochondrial
  zone" claim extrapolates beyond the cross-sectional athlete data, and total volume/energy may matter
  more than the specific zone. Tier: `meta`/`rct` (HIIT mitochondrial adaptation).
- **status:** `open`. Zone 2 is *a* well-supported, sustainable way to build aerobic base; that it is
  *uniquely optimal* for mitochondria is not established. Both low-intensity-high-volume and HIIT work.
- **resolution_notes:** Likely a polarized-training answer (mostly easy + some hard), not a single magic zone.

```json
{"id":"conflict-zone2-optimal-mito","question":"Is Zone 2 the uniquely optimal intensity for mitochondrial biogenesis?","side_a":{"claim":"Training at the first lactate threshold maximizes mitochondrial/fat-oxidation adaptation; should dominate volume","champions":["San-Millan","Attia"],"tier":"mechanistic+cross-sectional"},"side_b":{"claim":"HIIT/higher intensity also drives strong mitochondrial biogenesis; 'optimal zone' over-extrapolated; volume matters","champions":["HIIT physiology"],"tier":"meta+rct"},"status":"open","resolution_notes":"Probably polarized training (mostly easy + some hard), not a single magic zone."}
```

---

## conflict-concurrent-interference — How much does endurance training interfere with strength/hypertrophy?
- **side_a (real interference):** combining endurance with resistance training attenuates strength,
  power and hypertrophy gains vs resistance-only, especially for power and with high-frequency/long-
  duration running; proposed AMPK-vs-mTOR molecular antagonism. Champions: Wilson, Hawley. Tier: `meta`
  (Wilson et al. 2012 `10.1519/JSC.0b013e31823a3e2d`).
- **side_b (programmable / overstated):** the effect is modality- and dose-dependent and small when
  sessions are separated, cycling is used instead of running, and endurance volume is moderate; aerobic
  adaptations are preserved and concurrent training is appropriate for most health goals. Tier:
  `meta`/programming practice.
- **status:** `mostly-resolved (dose/modality-dependent)`. Interference is real for power/hypertrophy at
  high running volume; **manageable** by sequencing (separate sessions/days) and modality choice.
- **resolution_notes:** Matters for athletes optimizing one quality; largely irrelevant for general health.

```json
{"id":"conflict-concurrent-interference","question":"How much does endurance training interfere with strength/hypertrophy?","side_a":{"claim":"Concurrent endurance attenuates strength/power/hypertrophy (AMPK vs mTOR); worst for power + high running volume","champions":["Wilson","Hawley"],"tier":"meta"},"side_b":{"claim":"Effect small/programmable: separate sessions, cycle>run, moderate volume; aerobic gains preserved","champions":["programming-practice"],"tier":"meta+practice"},"status":"mostly-resolved-dose-modality","resolution_notes":"Real for power/hypertrophy at high running volume; manageable by sequencing/modality; irrelevant for general health."}
```

---

## conflict-sauna-healthy-user — Does frequent sauna use itself lower mortality, or is it a marker of who can afford to sauna?
- **side_a (causal benefit):** dose-dependent reductions in CVD/all-cause mortality and dementia across
  the KIHD cohort, with a plausible cardiovascular/HSP mechanism, argue for a real protective effect.
  Champions: Laukkanen, Kunutsor. Tier: `cohort` (Laukkanen 2015 `10.1001/jamainternmed.2014.8187`).
- **side_b (confounded association):** the data are observational in one cohort of Finnish men; **healthy-
  user bias and reverse causation** (healthier/wealthier/less-sick men sauna more and longer) are not
  excluded; no RCT exists. Tier: epidemiologic critique / absence of RCT.
- **status:** `open`. The association is strong, dose-dependent and biologically plausible — but
  *unconfirmed as causal*. The honest read: promising, plausibly beneficial, **not proven**.
- **resolution_notes:** An RCT is feasible in principle (unlike CR/fitness) but none has been run; women
  and non-Finnish populations are unstudied.

```json
{"id":"conflict-sauna-healthy-user","question":"Does frequent sauna use itself lower mortality, or is it a marker of underlying health?","side_a":{"claim":"Dose-dependent mortality/dementia reductions + plausible CV/HSP mechanism = real benefit","champions":["Laukkanen","Kunutsor"],"tier":"cohort"},"side_b":{"claim":"Observational single male cohort; healthy-user bias & reverse causation unexcluded; no RCT","champions":["epi-critique"],"tier":"epi-critique+absence-of-rct"},"status":"open","resolution_notes":"Strong, dose-dependent, plausible but unconfirmed-causal; RCT feasible but unrun; women/non-Finns unstudied."}
```

---

## conflict-wim-hof-mechanism — Is the Wim Hof method a genuine health intervention or an acute adrenaline stress response (and is the breathing even the active part)?
- **side_a (genuine intervention):** a randomized trial showed trained practitioners can voluntarily
  suppress the innate immune response to endotoxin, with disease-activity benefit in a spondyloarthritis
  proof-of-concept — evidence of real, trainable immune control. Champions: Kox, Pickkers, Buijze. Tier:
  `rct` (Kox 2014 `10.1073/pnas.1322174111`).
- **side_b (acute stress response, bundled, low-quality):** the effect is driven by an **adrenaline surge**
  (an acute sympathetic stress response, not a durable upgrade); studies are small, healthy, short; the
  protocol **bundles breathing + cold + meditation** so breathing can't be isolated; a systematic review
  found mostly low-quality evidence. Champions: Almahayni review. Tier: `meta` (2024 `10.1371/journal.pone.0286933`).
- **status:** `open / partially-resolved`. The **acute anti-inflammatory effect is real and replicated**;
  the **broader/durable health claims and the specific contribution of breathing are not established.**
- **resolution_notes:** Needs component-isolation trials (breathing vs cold vs meditation) and clinical-
  population, longer-duration outcomes. Safety: cyclic hyperventilation must not be done in water.

```json
{"id":"conflict-wim-hof-mechanism","question":"Is the Wim Hof method a genuine health intervention or an acute adrenaline response, and is the breathing the active part?","side_a":{"claim":"RCT shows trainable voluntary immune suppression + disease-activity benefit","champions":["Kox","Pickkers","Buijze"],"tier":"rct"},"side_b":{"claim":"Driven by acute adrenaline; small/healthy/short studies; bundled (breath+cold+meditation), can't isolate breathing; review finds low-quality evidence","champions":["Almahayni"],"tier":"meta"},"status":"open-partially-resolved","resolution_notes":"Acute anti-inflammatory effect real/replicated; durable claims + breathing's specific contribution unestablished; needs component-isolation trials. Safety: never hyperventilate in water."}
```

---

## conflict-walker-sleep-claims — Are Matthew Walker's specific "Why We Sleep" claims accurate, or overstated/mis-sourced?
- **side_a (core thesis sound):** sleep is essential; sleep loss impairs metabolism, memory, mood and immune
  signaling — well supported (Spiegel 1999 `rct` `10.1016/S0140-6736(99)01376-8`; glymphatic mechanism;
  AASM consensus `10.5664/jcsm.4758`). Champions: Walker, mainstream sleep medicine. Tier: `rct`+`meta`.
- **side_b (specific claims overstated/mis-sourced):** the "shorter sleep = shorter life" framing is
  **monotonic where the data are U-shaped** (Cappuccio 2010 `meta` `10.1093/sleep/33.5.585`, Kripke 2002
  `cohort` `10.1001/archpsyc.59.2.131`: long sleep associates with HIGHER mortality, reverse causation
  unexcluded); the "doubles cancer risk" / WHO-quote attributions are documented as overstated/misattributed.
  Champions: Guzey (2019 critique, web essay, no DOI, `anecdotal`/critique-tier). Tier: `meta`+critique.
- **status:** `partially-resolved`. **Direction of the message is right; several specific quantitative/causal
  claims are overstated or mis-sourced.** Index the book as influential communication; grade each underlying
  claim against primary literature, not against the book.
- **resolution_notes:** The U-shape and reverse-causation are the load-bearing corrections. IARC classifies
  shift work / circadian disruption (Group 2A), NOT "short sleep," as a probable carcinogen — a frequent
  conflation.

```json
{"id":"conflict-walker-sleep-claims","question":"Are Matthew Walker's specific Why We Sleep claims accurate or overstated/mis-sourced?","side_a":{"claim":"Core thesis sound: sleep essential; sleep loss harms metabolism/memory/mood/immunity","champions":["Walker","mainstream sleep medicine"],"tier":"rct+meta"},"side_b":{"claim":"Specific claims overstated: 'shorter=shorter life' is monotonic but data are U-shaped (long sleep also ↑mortality, reverse causation); cancer/WHO attributions misstated","champions":["Guzey (2019 critique, no DOI)"],"tier":"meta+critique"},"status":"partially-resolved","resolution_notes":"Message direction right; specific quantitative/causal claims overstated/mis-sourced. IARC classifies shift work/circadian disruption (2A), not short sleep per se. Grade each claim, not the book."}
```

---

## conflict-sleep-duration-causality — Does short sleep CAUSE higher mortality, or is the association reverse causation/confounding?
- **side_a (causal):** experimental sleep restriction produces real metabolic/endocrine/immune harm
  (Spiegel `rct`), plausibly cumulative; the dose-response in cohorts is consistent. Tier: `rct`(acute)+`cohort`.
- **side_b (reverse causation/confounding):** the mortality relationship is **U-shaped** — long sleep
  associates with mortality at least as strongly as short sleep, which points to **illness/frailty/depression
  causing abnormal sleep** rather than sleep duration causing death; self-reported duration is error-prone.
  Tier: `meta`(Cappuccio)+`cohort`(Kripke).
- **status:** `open`. Acute experimental harm is real (mechanism); the chronic duration↔mortality association
  is **partly causal, partly reverse-causal**, and the U-shape's long-sleep arm is mostly reverse causation.
- **resolution_notes:** Mendelian-randomization and objective-actigraphy cohorts are the way to disentangle;
  not yet decisive. "Sleep 7h" is a defensible floor; "sleep more is always better" is refuted by the long-sleep arm.

```json
{"id":"conflict-sleep-duration-causality","question":"Does short sleep cause higher mortality or is the association reverse causation/confounding?","side_a":{"claim":"Experimental restriction causes real metabolic/endocrine harm; cohort dose-response consistent","champions":["Spiegel","Van Cauter"],"tier":"rct+cohort"},"side_b":{"claim":"U-shape: long sleep associates ≥ short sleep with mortality → illness/frailty drives abnormal sleep (reverse causation); self-report error","champions":["Cappuccio","Kripke"],"tier":"meta+cohort"},"status":"open","resolution_notes":"Acute harm real; chronic duration↔mortality partly causal/partly reverse-causal; long-sleep arm mostly reverse causation. MR/actigraphy needed."}
```

---

## conflict-blue-blocking-glasses — Do blue-light-blocking glasses improve sleep, or only evening-light AVOIDANCE does?
- **side_a (mechanism supports blocking blue):** evening short-wavelength light suppresses melatonin and
  delays circadian phase (Brainard `10.1523/JNEUROSCI.21-16-06405.2001`, Gooley `10.1210/jc.2010-2098`, Chang
  `10.1073/pnas.1418490112`) — so cutting evening blue light should help. Champions: chronobiology mechanism;
  Kruse/wellness amplify. Tier: `mechanistic`+`rct`.
- **side_b (the product lacks evidence):** a Cochrane review of blue-light-filtering **spectacle lenses**
  found **no clear benefit** for sleep, visual performance, or macular health (Singh 2023
  `10.1002/14651858.CD013244.pub2`). Tier: `meta`.
- **status:** `partially-resolved / definitional`. **Both are right about different things:** the *mechanism*
  (evening blue light is disruptive) is real, but a specific *product* (amber lenses) is not validated.
  Dimming/avoiding evening light is the supported lever; the glasses are not.
- **resolution_notes:** Industry hype and some critics both conflate "avoid evening light" with "wear blue-
  blockers." Behavioral light reduction > product. Needs RCTs of glasses with objective circadian endpoints.

```json
{"id":"conflict-blue-blocking-glasses","question":"Do blue-blocking glasses improve sleep, or only evening-light avoidance does?","side_a":{"claim":"Evening short-wavelength light suppresses melatonin/delays phase — cutting it should help","champions":["chronobiology mechanism","Kruse/wellness"],"tier":"mechanistic+rct"},"side_b":{"claim":"Cochrane review of blue-filtering lenses found no clear benefit for sleep/vision/macular health","champions":["Singh/Cochrane 2023"],"tier":"meta"},"status":"partially-resolved-definitional","resolution_notes":"Mechanism real (evening blue light disruptive) but the glasses PRODUCT unvalidated; behavioral light avoidance is the supported lever. Both sides conflate the two."}
```

---

> Appended 2026-06-27 from Domain D (metabolic health & nutrition). Append, don't overwrite.
> The protein/mTOR conflict existed only as a one-line example in `SCHEMA.md`; this is its first full,
> primary-sourced, both-sides entry — DEEPENED, not duplicated.

## conflict-protein-mtor-longevity — Does high protein intake shorten or lengthen healthy lifespan?
The single most-cited nutrition-longevity disagreement. Read with age-stratification and it largely
*dissolves into a tradeoff* rather than a contradiction.
- **side_a (protein/IGF-1/mTOR accelerates aging):** high protein drives IGF-1 and mTORC1, the
  growth-vs-maintenance switch; restricting it extends lifespan and lowers cancer risk. Primary evidence:
  **Levine & Longo, Cell Metab 2014** (`10.1016/j.cmet.2014.02.006`) — NHANES, ages **50-65** high protein
  → ~75% ↑ all-cause, ~4x cancer mortality; **Solon-Biet et al., Cell Metab 2014**
  (`10.1016/j.cmet.2014.02.009`) — mouse lifespan maximized on low-protein/high-carb via mTOR/FGF21;
  **Guevara-Aguirre & Longo, Sci Transl Med 2011** (`10.1126/scitranslmed.3001845`) — Laron (low-IGF-1)
  near-absence of cancer/diabetes. Champions: Longo, Simpson, Le Couteur, Fontana. Tier: `cohort`+`animal`.
- **side_b (protein protects, especially older adults):** anabolic resistance with age means *more* protein
  is needed to defend muscle, strength and survival; sarcopenia/frailty are major mortality drivers. Primary
  evidence: **Bauer et al. PROT-AGE, JAMDA 2013** (`10.1016/j.jamda.2013.05.021`) — older adults need
  ~1.0-1.2 g/kg/d (up to 1.5); **Morton & Phillips, BJSM 2018** (`10.1136/bjsports-2017-097608`) — protein
  builds functional muscle, optimum ~1.6 g/kg/d. Champions: Attia, Phillips, Galpin, Bauer. Tier: `meta`+consensus.
- **status:** `open` — but **age- and context-dependent, not a flat contradiction.** The resolver is the
  **age axis**: Levine's *own* data REVERSES at 65 (protein protective in the elderly), exactly where PROT-AGE
  governs. Mid-life: the IGF-1/cancer cost is real (side_a). Late-life: the sarcopenia/all-cause cost dominates
  (side_b). Further modifiers: **protein source** (animal/leucine/BCAA vs plant), and **resistance training**,
  which re-partitions protein toward muscle and changes the risk calculus.
- **resolution_notes:** No `meta`-tier mortality RCT exists (infeasible). The honest synthesis: mid-life adults
  with cancer-risk concerns may benefit from moderate protein + periodic IGF-1 lowering (fasting/FMD); older
  adults almost certainly need MORE protein + resistance training to avoid frailty. The popular "protein is bad
  / protein is king" framings each cite half of one age-stratified literature.

```json
{"id":"conflict-protein-mtor-longevity","question":"Does high protein intake shorten or lengthen healthy lifespan?","side_a":{"claim":"High protein → IGF-1/mTOR → faster aging & cancer; restriction extends lifespan","champions":["Longo","Simpson","Le Couteur","Fontana"],"tier":"cohort+animal","papers":["10.1016/j.cmet.2014.02.006","10.1016/j.cmet.2014.02.009","10.1126/scitranslmed.3001845"]},"side_b":{"claim":"Protein protects muscle/strength/survival, esp. elderly; anabolic resistance needs MORE protein","champions":["Attia","Phillips","Galpin","Bauer"],"tier":"meta+consensus","papers":["10.1016/j.jamda.2013.05.021","10.1136/bjsports-2017-097608"]},"status":"open","resolution_notes":"Age-dependent, not contradictory: Levine 2014 itself reverses at 65. Mid-life IGF-1/cancer cost vs late-life sarcopenia/all-cause cost; modified by protein source, leucine/BCAA, and resistance training. No mortality RCT feasible."}
```

---

## conflict-tre-efficacy-vs-cr — Does time-restricted eating help beyond the calorie restriction it causes?
- **side_a (TRE has weight-independent metabolic benefit via circadian alignment):** eating in an early,
  compressed window improves insulin sensitivity, β-cell function and BP *without* weight loss. Primary:
  **Sutton et al., Cell Metab 2018** (`10.1016/j.cmet.2018.04.010`, isocaloric eTRF); mechanism in
  **de Cabo & Mattson, NEJM 2019** (`10.1056/NEJMra1905136`). Champions: Panda, Peterson, Mattson. Tier: `rct`
  (small/surrogate) + `mechanistic`.
- **side_b (TRE = calorie restriction by another route; little added benefit):** once calories are matched,
  the window adds nothing; prescriptive late 16:8 barely moves weight and may cost lean mass. Primary:
  **Liu et al., NEJM 2022** (`10.1056/NEJMoa2114833`, CR+TRE = CR); **Lowe/TREAT, JAMA Intern Med 2020**
  (`10.1001/jamainternmed.2020.4153`, null + lean-mass loss); **Trepanowski, JAMA Intern Med 2017**
  (`10.1001/jamainternmed.2017.0936`, ADF = daily CR, worse adherence). Champions: Lowe, Varady (own null),
  Ravussin. Tier: `rct`.
- **status:** `mostly-resolved (timing-window-dependent)`. **Most real-world TRE benefit IS calorie
  restriction.** The surviving signal is narrow: an *early* window (circadian alignment) has a small,
  weight-independent metabolic effect, but the *late* skip-breakfast 16:8 that dominates practice does not.
- **resolution_notes:** Separate "fasting" from "eating earlier" from "eating less." Adherence collapses with
  protocol severity (Trepanowski). Needs larger early-vs-late isocaloric trials with hard-ish endpoints.

```json
{"id":"conflict-tre-efficacy-vs-cr","question":"Does time-restricted eating help beyond the calorie restriction it causes?","side_a":{"claim":"Early/compressed window improves insulin sensitivity & BP independent of weight (circadian)","champions":["Panda","Peterson","Mattson"],"tier":"rct-small+mechanistic","papers":["10.1016/j.cmet.2018.04.010","10.1056/NEJMra1905136"]},"side_b":{"claim":"Matched calories erase the window's edge; late 16:8 null + lean-mass loss; ADF=CR","champions":["Lowe","Varady","Ravussin"],"tier":"rct","papers":["10.1056/NEJMoa2114833","10.1001/jamainternmed.2020.4153","10.1001/jamainternmed.2017.0936"]},"status":"mostly-resolved-timing-window-dependent","resolution_notes":"Most TRE benefit is CR; early-window circadian effect small/weight-independent; late 16:8 ineffective. Adherence falls with severity."}
```

---

## conflict-seed-oils-linoleic-acid — Are omega-6 seed oils (linoleic acid) a driver of chronic disease?
Polarized, low-rigor on the popular side; the higher-tier evidence runs *against* the toxicity claim, but no
camp has hard-endpoint proof.
- **side_a (seed oils harmful):** linoleic acid → oxidized metabolites (OXLAMs), LDL oxidation, inflammation;
  the modern intake rise tracks chronic disease. Primary: **Ramsden et al., BMJ 2016** (`10.1136/bmj.i1246`,
  recovered Minnesota Coronary Experiment: cholesterol fell, no CHD/mortality benefit, possible elderly harm);
  **DiNicolantonio & O'Keefe, Open Heart 2018** (`10.1136/openhrt-2018-000898`, OXLAM hypothesis). Champions:
  DiNicolantonio, O'Keefe, wellness/ancestral-diet movement. Tier: `rct`(old/low-rigor) + `hypothesis`.
- **side_b (seed oils neutral-to-beneficial):** replacing saturated fat with PUFA lowers CHD; biomarker-measured
  linoleic acid tracks LOWER CVD/mortality. Primary: **Mozaffarian, PLoS Med 2010**
  (`10.1371/journal.pmed.1000252`, meta, ~19% CHD ↓); **Marklund, Circulation 2019**
  (`10.1161/CIRCULATIONAHA.118.038908`, biomarker cohorts, lower mortality). Champions: mainstream cardiology.
  Tier: `meta`+`cohort`.
- **status:** `open` but **weight of evidence against the strong toxicity claim**. The honest top-tier read is
  **Hooper/Cochrane 2018** (`10.1002/14651858.CD011094.pub4`): increasing omega-6 makes *little or no
  difference* to CVD/mortality, low-moderate quality. Neither camp's strong claim survives the better data.
- **resolution_notes:** The Ramsden RCT is a 1968-73 trans-fat-era trial with incomplete recovered data — weak
  despite the `rct` label. Mechanism-only narratives (OXLAM) are presented as outcome proof by the seed-oil
  movement; they are not. The certainty on both sides exceeds the evidence.

```json
{"id":"conflict-seed-oils-linoleic-acid","question":"Are omega-6 seed oils (linoleic acid) a driver of chronic disease?","side_a":{"claim":"Linoleic acid → OXLAMs/LDL oxidation/inflammation → CHD; intake rise tracks disease","champions":["DiNicolantonio","O'Keefe","ancestral-diet movement"],"tier":"rct-old-low-rigor+hypothesis","papers":["10.1136/bmj.i1246","10.1136/openhrt-2018-000898"]},"side_b":{"claim":"PUFA replacing saturated fat lowers CHD; LA biomarker tracks lower CVD/mortality","champions":["mainstream cardiology"],"tier":"meta+cohort","papers":["10.1371/journal.pmed.1000252","10.1161/CIRCULATIONAHA.118.038908"]},"status":"open-weight-against-toxicity-claim","resolution_notes":"Cochrane 2018 (10.1002/14651858.CD011094.pub4): little/no effect either way, low-moderate quality. Ramsden RCT weak (trans-fat era, incomplete data). Mechanism narratives sold as outcome proof. Certainty exceeds evidence on both sides."}
```

---

## conflict-cgm-healthy-utility — Does continuous glucose monitoring benefit metabolically healthy (non-diabetic) people?
- **side_a (useful):** glycemic responses are highly individual (so generic advice fails) and many
  'non-diabetics' have hidden dysglycemia a CGM reveals; personalizing diet to the trace lowers spikes. Primary:
  **Zeevi/Segal, Cell 2015** (`10.1016/j.cell.2015.11.001`); **Hall/Snyder, PLoS Biol 2018**
  (`10.1371/journal.pbio.2005143`). Champions: Segal, Snyder, ZOE/Levels/wellness-CGM industry. Tier: `cohort`+
  `cross-sectional` (variability/prediction).
- **side_b (no proven outcome in healthy people):** all of side_a is *mechanism and surrogate variability*; no
  RCT shows CGM use in non-diabetics improves any hard health or longevity endpoint. Glucose excursions in
  healthy people are largely normal physiology; the wellness case is engagement- and marketing-driven. Tier:
  absence of outcome `rct`.
- **status:** `open`. The diagnostic reality (variability exists; CGM is invaluable IN diabetes) is not in
  dispute. The *wellness claim for healthy people* is unproven.
- **resolution_notes:** Needs outcome RCTs in non-diabetics (behavior change, cardiometabolic endpoints) — the
  large ZOE/PREDICT program is the read-out to watch. Until then: real diagnostic tool, unproven wellness gadget.

```json
{"id":"conflict-cgm-healthy-utility","question":"Does CGM benefit metabolically healthy (non-diabetic) people?","side_a":{"claim":"Glycemic response is individual; hidden dysglycemia is common; personalization lowers spikes","champions":["Segal","Snyder","wellness-CGM industry"],"tier":"cohort+cross-sectional","papers":["10.1016/j.cell.2015.11.001","10.1371/journal.pbio.2005143"]},"side_b":{"claim":"Only mechanism/surrogate moved; no outcome RCT in non-diabetics; excursions largely normal physiology","champions":["evidence-skeptics"],"tier":"absence-of-outcome-rct"},"status":"open","resolution_notes":"Invaluable in diabetes; wellness use in healthy people unproven. Needs outcome RCTs (ZOE/PREDICT to watch)."}
```

---

## conflict-longevity-gwas-reproducibility — Are there discoverable "longevity genes" beyond APOE, and can centenarian GWAS be trusted?
- **side_a (real, replicable signal):** APOE/TOMM40 (and FOXO3) replicate across most longevity GWAS; a
  longevity meta-GWAS finds genome-wide-significant loci (APOE + 5q33.3); candidate genes (CETP, IGF1R, KLOTHO)
  recur in specific populations. Champions: Deelen, Barzilai, Willcox. Tier: `meta`/`case-control`.
- **side_b (mostly noise / non-replication):** beyond APOE almost nothing replicates; lifespan heritability is
  only ~10-25%; the Sebastiani 2010 *Science* centenarian-signature paper was **RETRACTED** for a genotyping-
  array artifact (re-published 2012 with reduced accuracy); candidate-gene hits are population-specific.
  Champions: reproducibility critique, Timmers (lifespan ≈ disease genes). Tier: `cohort`+retraction-record.
- **status:** `partially-resolved`. APOE/FOXO3 are real; the broader "longevity gene" program is largely
  deflated. Human longevity is mostly environmental/stochastic + common-disease genetics.
- **resolution_notes:** Treat any non-APOE/FOXO3 longevity locus as provisional until replicated across
  ancestries. The Sebastiani retraction is the canonical reproducibility object for this domain.

```json
{"id":"conflict-longevity-gwas-reproducibility","question":"Are there discoverable longevity genes beyond APOE, and can centenarian GWAS be trusted?","side_a":{"claim":"APOE/FOXO3 replicate; meta-GWAS finds significant loci; CETP/IGF1R/KLOTHO recur in populations","champions":["Deelen","Barzilai","Willcox"],"tier":"meta+case-control"},"side_b":{"claim":"Beyond APOE little replicates; heritability ~10-25%; Sebastiani 2010 retracted (genotyping artifact); lifespan ≈ disease genes","champions":["Timmers","reproducibility-critique"],"tier":"cohort+retraction-record"},"status":"partially-resolved","resolution_notes":"APOE/FOXO3 real; broader longevity-gene program deflated; longevity mostly environmental/stochastic. Treat non-APOE/FOXO3 hits as provisional pending cross-ancestry replication."}
```

---

## conflict-cetp-longevity-vs-drug — If a CETP variant marks centenarians, why do CETP-inhibitor drugs fail?
- **side_a (genotype signal real):** Ashkenazi centenarians and offspring carry a CETP variant linked to large
  lipoprotein particles, lower CVD and dementia. Champions: Barzilai, Atzmon. Tier: `case-control`.
- **side_b (target not druggable for longevity):** pharmacological CETP inhibition (torcetrapib, dalcetrapib,
  evacetrapib) **failed** in large CVD outcome RCTs (some harmed); a genetic association over a lifetime does
  not equal a drug benefit started late. Champions: CETP-inhibitor trialists. Tier: `rct`.
- **status:** `open`. Both can be true: lifelong genotype ≠ late pharmacological mimicry.
- **resolution_notes:** Classic genotype-vs-drug gap (cf. Mendelian-randomization caveats). Don't read the
  centenarian CETP association as drug-target validation. (anacetrapib showed modest CVD benefit but no
  longevity claim.)

```json
{"id":"conflict-cetp-longevity-vs-drug","question":"If a CETP variant marks centenarians, why do CETP-inhibitor drugs fail?","side_a":{"claim":"Centenarian CETP variant ↔ large lipoproteins, lower CVD/dementia","champions":["Barzilai","Atzmon"],"tier":"case-control"},"side_b":{"claim":"CETP-inhibitor drugs failed/harmed in CVD RCTs; lifelong genotype ≠ late drug mimicry","champions":["CETP-trialists"],"tier":"rct"},"status":"open","resolution_notes":"Genotype-vs-drug gap; centenarian CETP association is not drug-target validation."}
```

---

## conflict-which-clock-is-valid — Which biological-age clock is "the" clock, and do age-reversal results mean anything?
- **side_a (clocks are usable now):** second-generation clocks (GrimAge, DunedinPACE, PhenoAge) strongly
  predict mortality/disease; a meta-analysis confirms DNAm age acceleration forecasts death; clocks are
  being used as trial endpoints. Champions: Horvath, Levine, Belsky, Lu. Tier: `cohort`/`meta`.
- **side_b (correlative, noisy, unvalidated):** clocks are correlates, not causes (Bell 2019); they correlate
  imperfectly with each other; original clocks have poor test-retest reliability so many "age reversal"
  effects (incl. TRIIM) are within measurement noise (Higgins-Chen 2022); no clock is a validated surrogate
  that moves with interventions AND predicts clinical benefit (Moqri 2023). Champions: Bell, Higgins-Chen,
  Moqri/Gladyshev. Tier: `mechanistic`/consensus.
- **status:** `open`. Clocks are the best mortality biomarkers we have AND not yet validated surrogates; both true.
- **resolution_notes:** Use PC-clocks for longitudinal/trial work; never read a single clock's "age reversal"
  as proven without reliability accounting and a hard endpoint. Different clocks answer different questions
  (chronological-age vs mortality vs pace).

```json
{"id":"conflict-which-clock-is-valid","question":"Which biological-age clock is THE clock, and do age-reversal results mean anything?","side_a":{"claim":"Second-gen clocks (GrimAge/DunedinPACE/PhenoAge) strongly predict mortality; meta confirms; used as trial endpoints","champions":["Horvath","Levine","Belsky","Lu"],"tier":"cohort+meta"},"side_b":{"claim":"Correlative not causal; clocks disagree; poor reliability makes many age-reversal results noise; no validated surrogate","champions":["Bell","Higgins-Chen","Moqri","Gladyshev"],"tier":"mechanistic+consensus"},"status":"open","resolution_notes":"Best mortality biomarkers yet AND not validated surrogates. Use PC-clocks; require reliability accounting + hard endpoint before believing age-reversal."}
```

---

## conflict-microbiome-cause-or-consequence — Does age-related gut dysbiosis CAUSE aging/inflammaging or REFLECT it?
- **side_a (causal driver):** dysbiosis precedes/produces inflammaging via loss of SCFA producers, weakened
  barrier ("leaky gut"), endotoxemia; FMT from young→old animals improves healthspan in short-lived models
  (killifish, mice); centenarian bile-acid producers confer infection resistance. Champions: Cryan, Honda,
  Smith, (killifish: Valenzano). Tier: `animal`+`mechanistic`.
- **side_b (downstream readout):** microbiome composition is heavily shaped by diet, polypharmacy, reduced
  motility, and host health; the "uniqueness predicts survival" signal exists only in the *already-healthy*;
  human evidence is cross-sectional and confounded. Champions: Wilmanski/Gibbons (uniqueness is health-state-
  dependent), epi-critique. Tier: `cohort`+`cross-sectional`.
- **status:** `open`. Likely bidirectional; animal FMT is the strongest causal hint but doesn't establish a
  contribution to *normal human* aging.
- **resolution_notes:** Needs human FMT/dietary-fiber RCTs with aging endpoints. Don't read microbiome
  aging-clocks or composition correlations as causal.

```json
{"id":"conflict-microbiome-cause-or-consequence","question":"Does age-related gut dysbiosis cause aging/inflammaging or reflect it?","side_a":{"claim":"Dysbiosis drives inflammaging (SCFA loss, barrier/endotoxemia); young→old FMT improves healthspan in killifish/mice; centenarian bile acids confer resistance","champions":["Cryan","Honda","Valenzano"],"tier":"animal+mechanistic"},"side_b":{"claim":"Composition shaped by diet/drugs/motility/host health; uniqueness-survival signal only in the already-healthy; human data cross-sectional/confounded","champions":["Wilmanski","Gibbons","epi-critique"],"tier":"cohort+cross-sectional"},"status":"open","resolution_notes":"Likely bidirectional; animal FMT strongest causal hint but doesn't prove contribution to normal human aging. Needs human FMT/fiber RCTs with aging endpoints."}
```

---

## conflict-mtdna-mutation-causality — Do somatic mtDNA mutations CAUSE normal aging?
- **side_a (causal):** the POLG "mutator mouse" accumulates mtDNA mutations and ages prematurely with reduced
  lifespan (two independent lines); somatic mtDNA mutations/heteroplasmy demonstrably accumulate clonally with
  age in human brain, muscle, colon. Champions: Trifunovic, Larsson, Kujoth, Prolla. Tier: `animal`+`cohort`.
- **side_b (correlate / supraphysiological model):** the mutator mouse carries mutation loads FAR above those
  seen in normal human aging; the phenotype is driven by apoptosis, **not** ROS (so it doesn't rescue the
  free-radical theory); human somatic loads usually sit below the dysfunction threshold. Champions: Kujoth
  (apoptosis finding), critics of the mutation-accumulation theory. Tier: `animal`+`mechanistic`.
- **status:** `open`. mtDNA mutations can cause aging *features* at high load; their contribution to *normal*
  human aging is unproven. Cross-links to the free-radical/mitohormesis conflict (Domain B).
- **resolution_notes:** Threshold + clonal-expansion dynamics are the crux. Don't conflate "mutation load can
  cause aging in a mouse" with "mtDNA mutations cause human aging."

```json
{"id":"conflict-mtdna-mutation-causality","question":"Do somatic mtDNA mutations cause normal aging?","side_a":{"claim":"POLG mutator mice age prematurely (2 lines); somatic mtDNA mutations/heteroplasmy accumulate clonally with age in human tissues","champions":["Trifunovic","Larsson","Kujoth","Prolla"],"tier":"animal+cohort"},"side_b":{"claim":"Mutator-mouse loads far exceed normal human aging; phenotype via apoptosis not ROS; human loads usually below dysfunction threshold","champions":["Kujoth","mutation-accumulation-critics"],"tier":"animal+mechanistic"},"status":"open","resolution_notes":"Mutations cause aging features at high load; contribution to normal human aging unproven. Threshold + clonal expansion are the crux. Links to free-radical/mitohormesis conflict."}
```
