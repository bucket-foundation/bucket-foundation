# Visual Design Review — Buildable Graphics Spec

> **Scope:** 10 chapters of the AGFarms / Bucket Foundation health-longevity-fitness manual.
> Reviewer pass: 2026-06-29. This is a **spec list** (what to build, how, and why), not the graphics themselves.
> **Already built (do NOT repeat):** 6 exercise stick-figures in `media/generated-diagrams/` — air-squat,
> hip-hinge, deep-lunge mobility, forearm plank, one-leg-stand, box-breathing.

## Build-tooling legend (tag column = `Type`)
- **(a) PROCEDURAL SVG** (cairosvg) — incl. the proven stick-figure exercise style.
- **(b) DATA CHARTS** (matplotlib) — dose-response curves, bars, scatter, forest plots.
- **(c) FLOWCHARTS** — process / decision diagrams.
- **(d) MATRIX / HEATMAP** — capacity coverage, evidence tiers, verdict tables rendered as grids.
- **(e) TIMELINES** — hours→state, lifespan, historical.
- **(f) REAL MEDIA** — the 212+ demo frames in `media/{video,images}/` + Wikimedia.
- **(g) INFOGRAPHIC** — composed panels (icons + short text + arrows).

**Buildability:** QUICK-SVG · CHART · FLOWCHART · ANATOMICAL · REAL-MEDIA · COMPLEX.
**Priority:** P1 (headline / high-leverage) · P2 (strong) · P3 (nice-to-have).

---

## 02 — Training (`02-training.md`)

| # | Figure title | Type | What it shows | Source (claim-ids / content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 2.1 | **VO₂max → all-cause mortality dose-response** | b | Descending curve: ~13% lower mortality per 1-MET, no observed upper limit; annotate "low-fit ≈ worse than smoking" | `crf-vo2max-strongest-mortality-predictor`, `crf-per-met-mortality-meta` | CHART | **P1** |
| 2.2 | **Strength / grip → mortality J-curve** | b | J-shaped curve; resistance-activity sweet spot ~30–60 min/wk, benefit flattening/reversing past it | `resistance-training-mortality-meta`, `grip-strength-mortality-pure` | CHART | **P1** |
| 2.3 | **The four trainable capacities × evidence tier** | d/g | 4 rows (CRF, Strength, Balance, Mobility) × cols (what it is, evidence tier, can-you-change-it) with honest tier shading | §1 table | QUICK-SVG | **P1** |
| 2.4 | **Five strength patterns — regression→standard→progression ladders** | g/a | One panel per pattern (squat/hinge/push/pull/carry) showing 3 rungs as mini stick-figures | §2 ladders | QUICK-SVG | **P1** |
| 2.5 | **NEW exercise stick-figures (set A)** | a | Push-up ("moving plank"), overhead press, pull-up (dead-hang→chin), farmer's carry, kettlebell swing (ballistic hinge), Bulgarian split squat | §2.3–2.6 cues/faults | QUICK-SVG | **P1** |
| 2.6 | **NEW core stick-figures (McGill Big-3 + anti-rotation)** | a | Dead bug, bird-dog, side plank, Pallof press, suitcase carry | §2.6 | QUICK-SVG | P2 |
| 2.7 | **Polarized cardio model (80/20)** | b/g | Stacked bar: ~80% Zone 2 easy / ~20% hard intervals / thin grey-zone; Zone-2 talk-test cues inset | §3 (`hiit-crf-cardiometabolic-meta`, `conflict-zone2-optimal-mito`) | CHART | P2 |
| 2.8 | **The minimum-effective week (calendar visual)** | g | Mon–Sun grid for Beginner / Intermediate / Advanced templates; pattern tags color-coded | §6.4 | QUICK-SVG | **P1** |
| 2.9 | **RPE / RIR autoregulation scale** | g | 1–10 ladder mapping RPE↔RIR↔feel↔use-case; highlight "productive default 7–8 / 2–3 RIR" | §6.3 table | QUICK-SVG | P2 |

---

## 44 — Exercise Modalities (`44-exercise-modalities.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 44.1 | **Modality → capacity coverage matrix** | d | The §9 grid: ~24 modalities × CRF/STR/PWR/MOB/COO/Bone, dot-fill ●●●/●●/●; cols for skill/risk | §9 master table | CHART (heatmap) | **P1** |
| 44.2 | **"Running destroys your knees" — debunked** | b | Bar chart OA prevalence: recreational 3.5% vs sedentary 10.2% vs elite 13.3% | `running-knee-oa-recreational` | CHART | **P1** |
| 44.3 | **Sport-specific mortality HRs (Oja forest plot)** | b | Forest plot: racquet HR 0.53, swimming 0.72, cycling 0.85, aerobics — all-cause + CVD | `swimming-mortality-oja` | CHART | P2 |
| 44.4 | **Tai chi falls-reduction (the standout mind-body RCT)** | b | Bar: tai chi vs stretching vs multimodal fall-rate reduction (Li 2018) | `taichi-falls-meta` | CHART | P2 |
| 44.5 | **NEW stick-figures (modality set)** | a | Turkish get-up (segmented sequence), rowing erg (legs→hips→arms drive), jump rope, ring/bench dip | §2.3, 5.4, 5.5, 3 | QUICK-SVG | P2 |
| 44.6 | **Machines vs free weights — honest comparison** | g | Two-column panel: stabilizer demand, safety-to-fail, isolation, carryover; verdict "both, for most" | §4 table | QUICK-SVG | P2 |
| 44.7 | **Adherence > optimality** | g | Concept graphic: small gap between sensible modalities vs huge gap sedentary→something | §11, `physical-activity-dose-response-mortality` | QUICK-SVG | P2 |

---

## 45 — Sports, Play & Recreation (`45-sports-play.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 45.1 | **Copenhagen sports life-expectancy bar chart** ⭐ | b | Horizontal bars: tennis +9.7y, badminton +6.2, soccer +4.7, cycling +3.7, swimming +3.4, jogging +3.2, calisthenics +3.1, gym +1.5; "vs sedentary" + observational caveat banner | `10.1016/j.mayocp.2018.06.025` (CCHS) | CHART | **P1** |
| 45.2 | **Why racquet sports win — the 4-dimension bundle** | g | Venn/quadrant: intermittent-HIIT + motor-learning + social partner + lifelong-playability → adherence | §3 "Why racquet sports keep topping" | QUICK-SVG | P2 |
| 45.3 | **Calories vs life-expectancy puzzle** | b | Scatter/2-bar: running burns more kcal/hr yet tennis ≈3× LE gain — calories ≠ explanatory variable | §1, §8 debunk | CHART | P2 |
| 45.4 | **Sport → person/age/goal matcher** | d/g | Matrix: rows = goals/constraints (sedentary-older, joint-pain, brain-benefit, social, lifelong) × recommended sports | §7.3 table | QUICK-SVG | P2 |
| 45.5 | **The head-trauma axis (combat sports)** | g | Spectrum: grappling (BJJ/judo, no head strikes) → striking (boxing/MMA sparring, repetitive impacts → CTE); "keep sport, manage head-impact dose" | §5, `24-disease-neuro-rheum` CTE | QUICK-SVG | P2 |
| 45.6 | **Five-axis sport profile (radar template)** | b | Reusable radar (fitness/longevity-evidence/cognitive-social/injury/barrier) — instantiated for 2–3 exemplar sports | §2 five-axis lens | CHART (radar) | P3 |

---

## 03 — Nutrition & Supplements (`03-nutrition-supplements.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 3.1 | **Supplement evidence traffic-light matrix** | d/g | ~14 supplements × grade (real / context-only / hype) with dose + one-line "what it actually does" | §1 + §5 tables | QUICK-SVG | **P1** |
| 3.2 | **Protein dose-response curve (~1.6 g/kg plateau)** | b | Hypertrophy/strength gain vs g/kg/day, plateau ~1.6 (up to 2.2) | `10.1136/bjsports-2017-097608` (Morton/Phillips) | CHART | **P1** |
| 3.3 | **Protein target by age/goal — and the mid-life↔65+ reversal** | b | Grouped bars (RDA→active→hypertrophy→older); arrow showing mTOR-concern mid-life vs sarcopenia-risk 65+ flip | §2.1, §2.4 (`conflict-protein-mtor-longevity`) | CHART | P2 |
| 3.4 | **Leucine threshold & per-meal distribution** | g | ~2–3 g leucine ≈ 20–40 g protein switches on MPS; even 3–4 meals vs dinner-skewed | §2.2 | QUICK-SVG | P2 |
| 3.5 | **Predictor ≠ lever: the VITAL nulls** | b | Vit-D & omega-3: strong cohort association vs flat RCT outcome (cancer/CVD/fracture) | `10.1056/NEJMoa1809944`, `…1811403` | CHART | P2 |
| 3.6 | **Fiber → all-cause mortality dose-response** | b | Descending risk to ~25–29 g/day and beyond (15–30% lower) | `10.1016/S0140-6736(18)31809-9` | CHART | P2 |
| 3.7 | **The dietary pattern (not a brand diet)** | g | 5-ring convergence: whole/minimally-processed, fiber-rich, protein-adequate, unsaturated fats, low added sugar | §3 | QUICK-SVG | P3 |

---

## 36 — Fasting, Cleanses & Protocols (`36-fasting-cleanses-protocols.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 36.1 | **Fasting physiology timeline (hours → state)** ⭐ | e | 0–12h glycogen → 12–36h glycogen-depletion/ketosis/AMPK↑mTOR↓ → 2–3d+ deep ketosis/GH↑; **honest "autophagy timing = rodent-extrapolated, human flux unmeasured" flag band** | §2.1, §6 | CHART/SVG | **P1** |
| 36.2 | **Protocol verdict matrix (tiered)** | d | The §8 table: ~17 protocols × claim / best-evidence-tier / verdict / safety, color-coded (MODERATE→PSEUDOSCIENCE+HARMFUL) | §8 table | QUICK-SVG | **P1** |
| 36.3 | **Refeeding syndrome mechanism** | c | Flow: prolonged fast → refeed carbs → insulin spike → cells pull PO₄/K/Mg → hypophosphatemia → arrhythmia/seizure/death; mitigation node (slow + thiamine + monitor) | §2.4 | FLOWCHART | P2 |
| 36.4 | **TRE vs calorie-restriction (calorie-matched)** | b | Bars: late 16:8 (TREAT) ≈ control; early eTRE (Sutton) = weight-independent metabolic gain | `10.1001/jamainternmed.2020.4153`, `10.1016/j.cmet.2018.04.010` | CHART | P2 |
| 36.5 | **Who should NOT fast — exclusion panel** | g | Icon grid: T1/T2 diabetes on meds, pregnancy, ED history, underweight/frail, children, narrow-window meds, kidney/liver/gout | §7 box | QUICK-SVG | P2 |
| 36.6 | **Liver flush "stones" debunk** | g | Before/after: ingested olive oil + citrus → saponified soap pellets (not gallstones) | §4.4 | QUICK-SVG | P3 |

---

## 05 — Recovery, Sleep, Stress (`05-recovery-sleep-stress.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 5.1 | **Sleep duration → mortality U-shape** ⭐ | b | U-curve, minimum ~6.5–7.5h; both short AND long elevated (long often larger; reverse-causation note) | `sleep-duration-mortality-ushape`, `kripke-7h-optimal-mortality` | CHART | **P1** |
| 5.2 | **Psychosocial levers vs biohacks — effect-size bar chart** | b | Bars: social connection OR≈1.5 (≈quitting smoking), isolation/loneliness, purpose HR≈2.43, SES gradient, religious attendance — contrasted with mechanistic-tier supplement claims | §5.3 (`social-relationships-mortality-meta` etc.) | CHART | **P1** |
| 5.3 | **Circadian light-timing diagram** | g | 24h dial: bright AM outdoor light → SCN anchor; dim/avoid short-wavelength PM; melanopsin→ipRGC→SCN inset | §2.1–2.2 | QUICK-SVG | **P1** |
| 5.4 | **Sauna frequency → mortality dose-response** | b | Bars/curve: 1× vs 2–3× vs 4–7×/wk → all-cause HR~0.60, SCD~0.37; "traditional not infrared; healthy-user caveat" | `sauna-frequency-mortality-kihd` | CHART | P2 |
| 5.5 | **NEW breathwork SVGs (physiological sigh + coherent)** | a | Physiological sigh (double nasal inhale, long mouth exhale) + coherent/resonance 6/min waveform; complements existing box-breathing | §4.2 | QUICK-SVG | P2 |
| 5.6 | **The recovery pillar — one-page lever map** | d/g | §6 grid: lever × fundamental moved × highest-leverage move × honest ceiling | §6 table | QUICK-SVG | P2 |
| 5.7 | **Cold: dose-sold ≠ dose-studied** | g | Split panel: long mild acclimation (insulin-sensitivity data) vs 3-min plunge (mood/discipline only) | §3.2 | QUICK-SVG | P3 |
| 5.8 | **HRV — within-person trend, not a leaderboard** | g | Personal trend-line good / cross-person comparison crossed-out | §5.1 | QUICK-SVG | P3 |

---

## 29 — Behavior Change & Adherence (`29-behavior-change.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 29.1 | **The intention → behavior gap** ⭐ | b | Two bars: intention change d≈0.66 → behavior change d≈0.36; "~half who intend, fail to act" | `intention-behavior-gap-experimental` (Webb & Sheeran) | CHART | **P1** |
| 29.2 | **Habit-formation curve (Lally 66-day)** | b | Automaticity rising-asymptote curve; median 66 days, shaded range 18–254; "21 days = myth" callout | `habit-formation-66-days` | CHART | **P1** |
| 29.3 | **COM-B diagram** | c/g | Capability + Opportunity + Motivation → Behaviour; "diagnose the missing one first" | `com-b-behaviour-change-wheel` | FLOWCHART | **P1** |
| 29.4 | **Technique map: leverage × evidence (2×2)** | d | Scatter/quadrant placing ~14 techniques (impl. intentions, choice-architecture, self-monitoring … ego-depletion, manifestation) | §7 table | CHART | P2 |
| 29.5 | **Implementation intention (if–then) template** | c/g | "IF [cue: 7am coffee poured] THEN [running shoes on]" welded to environmental cue | §2.2 | QUICK-SVG | P2 |
| 29.6 | **The practical system (8 steps)** | c | Linear flow: one small behavior → if–then → engineer environment → self-monitor → social layer → expect 2–8mo → diagnose with COM-B | §9 | FLOWCHART | P3 |
| 29.7 | **Pop-psych debunks panel** | g | Crossed-out: 21-day habit, willpower-as-muscle/ego-depletion, dopamine-detox, learning styles, manifestation | §8 | QUICK-SVG | P3 |

---

## 19 — Life Stages (`19-life-stages.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 19.1 | **Lifespan timeline (DOHaD → geriatrics → end-of-life)** ⭐ | e | Horizontal life axis: in-utero/first-1000-days → childhood (build peak) → adulthood (defend) → midlife inflections → geriatrics/frailty → palliative; what-matters tag per stage | §10 one-screen summary | TIMELINE | **P1** |
| 19.2 | **Physiological capacity arc (build-plateau-decline)** | b | VO₂max / bone / muscle curve: steep climb to 20s–30s peak, plateau, long decline; "peak you build = asset you spend"; fracture threshold line | §1, §5.1 (`crf-vo2max…`, peak bone mass) | CHART | **P1** |
| 19.3 | **Fertility decline by age (both sexes)** | b | Two curves: female (steep after 35, sharp after 40, fixed oocyte pool) + male (later/gradual, DNA-fragmentation rise) | `10.1093/humrep/17.5.1399` + paternal-age series | CHART | P2 |
| 19.4 | **Fried frailty phenotype (5 criteria)** | g | Pentagon: weight loss, exhaustion, weakness/grip, slow gait, low activity; ≥3 frail / 1–2 pre-frail / 0 robust | `10.1093/gerona/56.3.m146` | QUICK-SVG | P2 |
| 19.5 | **Compression of morbidity (squaring the curve)** | b | Two survival/disability curves: extended morbidity vs compressed — push disability onset later than death | `10.1056/NEJM198007173030304` (Fries) | CHART | P2 |
| 19.6 | **Prenatal: load-bearing vs marketing** | d/g | Folate + iodine (RCT-strong) vs the rest of the supplement aisle; "eat for two / rest / detox" myth ledger | §3.1, §3.4 | QUICK-SVG | P3 |
| 19.7 | **Geriatric lever = subtraction (deprescribing)** | g | Prescribing cascade vs deprescribing; STOPP/START + Beers flag | §7.3 | QUICK-SVG | P3 |

---

## 09 — Modifiable Exposures & Environment (`09-exposures-environment.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 9.1 | **Alcohol: J-curve vs MR/GBD monotonic** ⭐ | b | Overlay: old J-shaped cohort curve vs bias-corrected/MR monotonic line; "no safe level for cancer"; age-dependent minimum-risk note | `conflict-alcohol-jcurve`, `10.1001/jamanetworkopen.2022.3849`, `…2023.6185` | CHART | **P1** |
| 9.2 | **Air pollution PM2.5 → mortality dose-response** | b | Rising risk per 10 µg/m³: all-cause +4%, cardiopulmonary +6%, lung cancer +8%; no safe threshold | `10.1001/jama.287.9.1132` (Pope) | CHART | **P1** |
| 9.3 | **Exposures in proportion (ranked impact)** | b/g | Ranked bars by mortality magnitude: tobacco ~10y ≫ air pollution > alcohol > lead > ambient temp > sun > PFAS/BPA > microplastics | §7 (`10.1016/S0140-6736(16)32380-7`) | CHART | **P1** |
| 9.4 | **Smoking: years lost + cessation-by-age recovery** | b | Bar/line: ~10y lost; quit at 30/40/50/60 recovers ~10/9/6/3y; "quit before 40 → avoid ~90%" | `10.1056/NEJMsa1211128`, `10.1136/bmj.38142.554479.AE` | CHART | P2 |
| 9.5 | **Environmental "toxins" — evidence tiering** | d | Lead (established/large) → PFAS (regulatory) → BPA/phthalates (plausible EDC) → microplastics (emerging); shared lever: filter water | §4 tiering summary | QUICK-SVG | P2 |
| 9.6 | **Sun — the two-sided ledger** | g | Left: UV skin-cancer/photoaging cost (dermatology). Right: sun-avoidance ≈ smoking-level mortality (MISS cohort) + confounding caveats; verdict "avoid burns, not daylight" | §5 (`10.1111/joim.12496`) | QUICK-SVG | P2 |
| 9.7 | **Cold > heat (ambient temperature mortality)** | b | Bar: 7.29% of deaths from cold vs 0.42% from heat (Gasparrini); climate-shift caveat | `10.1016/S0140-6736(14)62114-0` | CHART | P3 |

---

## 33 — Public Health, Systems & Access (`33-public-health-systems.md`)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 33.1 | **What actually doubled lifespan** ⭐ | b/g | Stacked/ranked attribution: clean water (Cutler-Miller ~half total, ~74% infant), food security, refrigeration, vaccines, antibiotics, tobacco/road safety — medicine only ~10–20% | §1.2–1.3 (Cutler & Miller 2005) | CHART | **P1** |
| 33.2 | **Frieden Health Impact Pyramid (5 tiers)** | g | Pyramid: socioeconomic (base, largest impact) → context-change → protective interventions → clinical → counseling/education (apex, smallest); "the longevity industry sells the apex" | §3.3 | QUICK-SVG | **P1** |
| 33.3 | **Determinants of health allocation** | b | Bar/pie: behavior ~40%, genetics ~30%, social ~15%, medical care ~10%, environment ~5% | §4.4 (McGinnis/Schroeder) | CHART | **P1** |
| 33.4 | **US vs peers: spend more, get less** | b | Scatter or paired bars: health spend (%GDP / per-capita) vs outcome rank — US 10/10, highest cost | §4.2 (Mirror Mirror 2024) | CHART | P2 |
| 33.5 | **Prevention levels + Rose population-vs-high-risk** | g | Primary/secondary/tertiary leverage ladder + Rose: many at small risk generate more cases than few at high risk | §3.1–3.2 | QUICK-SVG | P2 |
| 33.6 | **Cost per life-year saved (global)** | b | Log-scale bars: bednets/vaccines/ORS (pennies–$thousands) vs marginal rich-world clinical ($100k+/QALY) | §7.4 | CHART | P2 |
| 33.7 | **Epidemiologic transition (Omran)** | b/e | Crossing curves: infectious mortality falls as chronic/degenerative rises; "the diseases longevity targets are post-transition luxuries" | §1.4 | CHART | P3 |
| 33.8 | **Life-expectancy doubling (200-yr line)** | b | Global LE ~30→73; rich-world ~79–84; annotated with intervention eras | §1.1 | CHART | P3 |

---

## Roll-up

- **Total figures proposed:** 72 (across 10 chapters; 6.6–9 per chapter, within the 4–9 brief).
- **By priority:** P1 = 22 · P2 = 33 · P3 = 17.
- **By type/tooling:** CHART (matplotlib) ≈ 33 · QUICK-SVG/infographic/matrix (cairosvg) ≈ 30 · stick-figure SVG sets = 4 figure-entries (≈ 22 individual new poses) · FLOWCHART = 3 · TIMELINE = 2.
- **New exercise stick-figures proposed (beyond the existing 6):** ~22 individual poses bundled into 4 figure-entries — Set A (push-up, overhead press, pull-up, farmer's carry, KB swing, Bulgarian split squat), core Big-3+ (dead bug, bird-dog, side plank, Pallof press, suitcase carry), plus modality set (Turkish get-up sequence, rowing-erg drive, jump rope, dip). Reuses the proven stick-figure style; lowest build risk.

### Top 5 highest-leverage (build first)
1. **45.1 — Copenhagen sports life-expectancy bar chart** ⭐ (tennis +9.7y … gym +1.5y; the flagged P1, the spine of ch.45 and one of the most actionable findings in the corpus).
2. **2.1 — VO₂max → mortality dose-response curve** ⭐ (the single strongest longevity association; flagged).
3. **36.1 — Fasting physiology timeline** with the honest "autophagy timing unproven in humans" flag (flagged; high abuse-correction value).
4. **5.1 — Sleep duration → mortality U-shape** + **5.2 — psychosocial-levers-vs-biohacks effect-size bars** (the recovery pillar's two load-bearing, under-sold charts).
5. **33.1 — "What actually doubled lifespan" ledger** + **33.2 — Frieden pyramid** (the manual reading itself against the supplement/biohack frame).

> All charts must carry the manual's honesty conventions visibly: cohort-vs-RCT tier badges, reverse-causation / healthy-user / self-selection caveats on observational curves (alcohol J-curve, sauna, sun, Copenhagen), and predictor-≠-lever flags where the association ≠ intervention (VITAL nulls, grip strength, frailty score, omega-3 index).
