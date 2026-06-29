# VISUALS PLAN — every graphic & diagram worth building, across all 50 chapters

> A full visual-design review of the manual (bead bkt-bg6). Six reviewers spec'd buildable graphics
> section by section. Each entry: **Section · Figure · Type · What it shows · Source (claim-ids) ·
> Buildability · Priority**. This is the build backlog for the manual's visual layer — the 6 existing
> exercise diagrams (`media/generated-diagrams/`) are the proven style precedent.

## Grand total: ~352 figures across 50 chapters + 9 cross-cutting design-system templates

| Cluster | Figures | P1 | File |
|---|---|---|---|
| Foundations (start-here, atlas, foundations, mechanism, mitochondria, state-of-field) | 47 | 20 | `visuals-foundations.md` |
| The Body (anatomy, endocrine, nervous, immune, telomeres, body-systems, organ-atlas, reproductive) | 65 | 18 | `visuals-body.md` |
| Clinical Diseases (prevention, the disease atlases, brain, mental, addiction, pain, surface, peds, emergency) | 87 | 31 | `visuals-clinical.md` |
| Practice & Drugs (surgery, anesthesia, imaging, pathology, pharmacology, regenerative, CAM, biohacking) | 49 | 15 | `visuals-practice-drugs.md` |
| Levers & Life (training, modalities, sports, nutrition, fasting, recovery, behavior, life-stages, exposures, public-health) | 72 | 22 | `visuals-levers.md` |
| Personalization & Meta (variation, what-to-track, conflicts, practitioner, go-deeper) | 32 | ~14 | `visuals-meta.md` |
| **TOTAL** | **~352** | **~120** | + 9 templates |

## By build type (most are deterministic & cheap)
- **Data charts (matplotlib)** ≈ 118 — effect-size/forest bars, dose-response curves, survival, PAFs, U-shapes
- **Procedural SVG (cairosvg)** ≈ 98 — schematics, action cards, stick-figures, concept maps (our proven pipeline)
- **Matrix / heatmap** ≈ 60 — verdict grids, comparison matrices, risk heat-maps
- **Infographic composites** ≈ 40 — the Start-Here levers, What-to-Track panel, prevention roadmaps
- **Flowcharts / algorithms** ≈ 29 — screening flows, treatment ladders, emergency action sequences
- **Timelines** ≈ 14 — fasting physiology, stroke windows, AMR, life-stages
- **Real media (Wikimedia open-license)** ≈ 6 — only a few anatomical bases genuinely need photos; almost everything is buildable in-house with no external dependency

## BUILD FIRST — the cross-cutting design system (the manual's visual grammar)
Build these 9 templates once; ~40 figures consume them, so they unify the whole book:
**evidence-tier badge · verdict scale (AGREES/OVERSTATED/CONTRADICTS + False/Debunked) · predictor-vs-lever icon
pair · mechanism-vs-outcome icon pair · evidence-posture people badge · per-chapter key-levers sidebar ·
conflict-card template · dose-match ⚠ flag · the three-rules motif.**

## THE FIRST FIGURE BATCH — the ~18 signature P1s (highest leverage per build hour)
1. **Bayes "PPV collapses at low prevalence" icon-array** (§41) — the single most leverage-dense graphic in the manual
2. **Copenhagen sports life-expectancy bars** (§45) — tennis +9.7y … gym +1.5y
3. **VO₂max → mortality dose-response curve** (§02) — the strongest longevity association
4. **The energy stack: chemiosmosis / ETC / ATP-synthase schematic** (§01) — the most-referenced foundation
5. **Nutrient-sensing switchboard** mTOR/AMPK/sirtuins/IGF-FOXO/NRF2 (§01)
6. **Claims-by-evidence-tier chart** (State of the Field) — the corpus's own headline
7. **Practitioner Calibration Spectrum** (§46) — Galpin/Kaeberlein → Sinclair; position = calibration not direction
8. **"What to Track" tiered panel infographic** (What-to-track) — pairs with Start Here
9. **Lancet-2024 14-factor dementia PAF bar chart** (§08) — sums to ~45%
10. **Hallmarks of Cancer wheel** (§25) — 2000→2022, 14 spokes
11. **Hands-Only CPR action card** (§34) — life-saving
12. **BE-FAST stroke recognition card** (§34) — tied to the treatment windows
13. **Anaphylaxis epinephrine-first sequence** (§34)
14. **12-organ-systems navigation map** (§18) — the master index figure
15. **Fasting physiology timeline** (§36) — with the honest autophagy-timing flag band
16. **Mitochondria "three dials" + cross-section** (§37)
17. **Emergency "recognize → act" master wallet card** (§34)
18. **Mechanism-bridge convergence map** (§12) — many practices → six fundamental layers

## Notes for the builder
- **Reuse / de-dup:** build-once-cross-reference assets flagged across clusters — predictor-vs-lever icon, the six-layers legend, PGC-1α cascade, the laundering-gap diagram, BE-FAST & sepsis (each specced in 2 chapters).
- **Honesty conventions on every chart:** observational charts (alcohol J-curve, sauna, sun, grip/frailty, Copenhagen) must visibly carry the tier badge + a reverse-causation / predictor-≠-lever flag — the visuals must not launder what the prose grades.
- **Doc-sync fix needed:** the conflicts *register* says 29 but `CONFLICTS.md` now holds 38 — regenerate the register before building the conflicts visual (E1).
- **Style:** parchment + gold-rule + tier-badge + claim-id footer (the `media/generated-diagrams` precedent). All cairosvg/matplotlib = reproducible, version-controlled, regenerable.

---
# Visual Design Review — Foundations Cluster

> **Scope.** Graphics spec for the foundations / mechanism / mitochondria / map cluster:
> `00-start-here.md`, `00-atlas.md`, `01-foundations.md`, `12-mechanism-bridge.md`,
> `37-mitochondrial-health.md`, `00-map/01-STATE-OF-THE-FIELD.md`.
> **Output is a buildable spec list, not the graphics.** Each row: where it goes, what it shows,
> the chapter content / claim-ids it visualizes, build path, and priority.

**Build tooling tags (feasibility):** QUICK-SVG (procedural cairosvg schematic, the
`media/generated-diagrams/*.svg` style precedent — parchment `#faf7ef`, gold rule, tier badges,
claim-id footer) · CHART (matplotlib/SVG data chart) · FLOWCHART (decision/pathway boxes+arrows) ·
ANATOMICAL (Wikimedia open-license real art or traced schematic) · REAL-MEDIA (the 212 demo frames) ·
COMPLEX (multi-panel infographic composite — most expensive).

**Type key (a–g):** (a) procedural SVG schematic · (b) data chart · (c) decision flowchart /
pathway · (d) matrix/heatmap grid · (e) timeline · (f) real media (Wikimedia/demo frames) ·
(g) infographic composite.

**Design principle applied:** proposed only where a picture genuinely beats the prose — the
*structural* claims (anatomy, networks, chains, convergence), the *quantitative* claims (tier
distribution, dose-response, hazard ratios), and the *conceptual axes* (predictor vs lever,
mechanism vs outcome) that the text spends paragraphs disambiguating. Pure prose argument is left
as prose.

---

## §00 — Start Here

| Section | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 00-start-here | **The Five Levers (if you change only five things)** | g | A clean 5-tile infographic: don't smoke · VO₂max+strength · sleep 7h regular · check & lower apoB · stay connected — each tile with a one-line payoff. | "If you change only five things" §; DO list items 1,2,3,5,6,8 | COMPLEX | P1 |
| 00-start-here | **Predictor ≠ Lever (the core concept)** | a | Two-box concept diagram: a "predictor" (grip strength / HRV / age-clock) vs a "lever" (apoB, fitness), with the dotted arrow that does NOT automatically connect them. | The three rules §, rule (1); echoed in §01 foundation/outcome table | QUICK-SVG | P1 |
| 00-start-here | **The Minimum-Effective Week** | d | 7-day calendar grid, each day color-coded by what it trains (strength / aerobic base / ceiling / capacity / recovery). | MINIMUM-EFFECTIVE WEEK table | QUICK-SVG | P1 |
| 00-start-here | **DO / MEASURE / SKIP — the one-screen triage** | d | Three-column matrix: high-certainty levers (green) · functional+blood measures (blue) · mostly-skip sold items (amber), each a short chip. | DO §, MEASURE §, MOSTLY SKIP § | QUICK-SVG | P1 |
| 00-start-here | **Something-beats-nothing dose-response** | b | Generic dose-response curve annotated: steepest gains at the start, diminishing returns where "optimization is sold." | Rule (3) "steepest gains at the start"; mirrors STATE-OF-FIELD rule 3 | CHART | P2 |
| 00-start-here | **The book's structure (Parts I–XII map)** | e | Linear/stacked spine of the 12 parts from map → machinery → evidence → systems → levers → frontier. | "How to use the rest of this book" § | QUICK-SVG | P3 |

---

## §00 — Atlas (The Full Map)

| Section | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 00-atlas | **The Layered Stack (Layer 0 → Layer 5)** | a | The signature atlas image: a vertical stack from Foundations (physics) up through Aging biology → Body systems → Clinical medicine → Levers → Context → Meta, showing "everything above is downstream of Layer 0." | Layer 0–5 headers + "The substrate. Everything above is downstream of this." | QUICK-SVG | P1 |
| 00-atlas | **Coverage heatmap — every node graded** | d | Grid of all atlas nodes colored by coverage key ✅ covered / 🟡 partial / ⚪ deferred — the "honest edge of the map" at a glance. | Coverage key + all layer tables + "honest edge of the map" § | CHART | P1 |
| 00-atlas | **The 12 organ systems wheel** | a | Radial wheel of Layer 2's 12 systems (cardiovascular … hematologic), each spoke linking to its chapter §. | Layer 2 table (12 systems) | QUICK-SVG | P2 |
| 00-atlas | **Corpus at a glance (the numbers)** | g | Stat-block infographic: 49 chapters · 265k words · 1007 claims · 660 figures · 37 conflicts · 24 labs · 15 trials. | "Corpus at a glance" paragraph | QUICK-SVG | P2 |
| 00-atlas | **Foundation → Outcome dependency arrow** | a | One-arrow concept: Layer 0 foundations (canon-tier) feed UP into outcomes; outcomes consume, never replace. | Layer 0 note "the layer the Bucket canon treats as foundation-tier; the rest consumes it" | QUICK-SVG | P3 |

---

## §01 — Foundations (the richest chapter; highest graphic density)

| Section | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 01 §2.1–2.3 | **The Energy Stack — chemiosmosis schematic** | a | The marquee diagram: inner mitochondrial membrane with ETC Complexes I–IV pumping H⁺ into the intermembrane space, the proton gradient, and ATP synthase as the turbine spinning ADP+Pᵢ→ATP. | §2.1–2.3 ETC + chemiosmosis + ATP synthase; canon `chemiosmosis-proton-motive-force` | COMPLEX | P1 |
| 01 §4.3 | **The Nutrient-Sensing Switchboard** | c | Network diagram of mTOR ⟷ AMPK (reciprocal), Sirtuins(NAD⁺), Insulin/IGF-1→FOXO, NRF2 — each labeled "grow/store" vs "repair/maintain" pole, with the interventions that push each. | §4.3 table (the 4+1 switches) + "mTOR and AMPK are reciprocal" | COMPLEX | P1 |
| 01 §5.1 | **The Hallmarks of Aging wheel, mapped to foundations** | d | Radial/grouped wheel of the 12 hallmarks, color-coded primary/antagonistic/integrative, each annotated with the foundation layer it degrades (energy/structure/information). | §5.1 hallmark→foundation table + 2023 grouping | COMPLEX | P1 |
| 01 §6.1 | **Hormesis — the biphasic dose-response curve** | b | The inverted-U/J curve: sub-damaging dose → adaptive overcompensation → harm zone; overlaid markers for exercise, heat, cold, fasting, hypoxia, polyphenols. | §6.1 hormesis + stressor table; `thread-hormesis` | CHART | P1 |
| 01 §2.5 | **Substrate metabolism — three fuels into one hub** | c | Glucose / fat / ketones each routing to acetyl-CoA → Krebs → ETC; metabolic-flexibility as the clean switch between them. | §2.4–2.5 fuel table + Krebs as "central hub" | QUICK-SVG | P2 |
| 01 §2.7 | **Bioenergetic capacity = the master variable (convergence)** | c | Spokes from 5 domains (Exercise, Metabolism, Aging, Genetics, Thermal) all converging on the proton-motive force at the center. | §2.7 master-variable table; `thread-mitochondria` | QUICK-SVG | P1 |
| 01 §3.1–3.4 | **Structure layer — membrane / protein / water / cytoskeleton** | a | Four-panel cell-structure schematic: lipid bilayer (ion-impermeable), protein fold + proteostasis, contested cell-water (graded), cytoskeleton/mechanotransduction. | §3 STRUCTURE & MATTER subsections | COMPLEX | P3 |
| 01 §3.3 | **Cell-water claims, graded honestly** | d | 3-row grade table rendered as a status strip: EZ water exists = Replicated · intracellular≠bulk = Solid · "master energy system" = Contested/speculative. | §3.3 grade table (Ling/Pollack) | QUICK-SVG | P2 |
| 01 §4.2 | **Epigenetic clocks — what they read vs what they prove** | d | Two-row matrix: Horvath (reads CpGs → chronological age, correlate) vs PhenoAge/GrimAge/DunedinPACE (trained on outcomes → mortality, still observational). | §4.2 clock table | QUICK-SVG | P2 |
| 01 §6.5 | **Light → SCN → clock-gene loop** | c | Melanopsin/ipRGC → retinohypothalamic tract → SCN → BMAL1/CLOCK↔PER/CRY feedback loop → melatonin/cortisol timing. | §6.5 circadian; `thread-circadian-light` | QUICK-SVG | P2 |
| 01 §1 | **Foundation vs Outcome (the organizing distinction)** | d | The chapter's load-bearing 2-column table as a clean visual: what it is / example / how it fails / where it lives / direction of dependence. | §1 foundation/outcome table | QUICK-SVG | P2 |

---

## §12 — The Mechanism Bridge

| Section | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 12 §12.0 | **Anatomy of a mechanism chain (the 5-rung ladder)** | c | The template diagram: PRACTICE → proximate signal → cellular/molecular pathway → FUNDAMENTAL LAYER → outcome, with the honesty-tag legend (established/partial/hypothesized). | §12.0 the five-rung schema + honesty tags | QUICK-SVG | P1 |
| 12 §12.2 | **Convergence map — many practices, six layers** | c | ~24 practices on the left fanning into the 6 fundamental layers (energy/redox/proteostasis/membrane/epigenetic/signaling) — visually proving "levers many, layers few." | §12.2 convergence map + master table | COMPLEX | P1 |
| 12 §12.1 | **Mechanism-tier vs Outcome-tier — the two-axis grid** | d | Scatter/grid plotting each of the 24 practices on x=mechanism certainty, y=human-outcome tier; the empty top-right vs the laundering diagonal. | §12.1 master table tags + §12.4 "two different axes" | CHART | P1 |
| 12 §12.4 | **The laundering gap — marketing volume vs outcome tier** | b | Inverse-correlation chart: 9 oversold items (NAD⁺, resveratrol, antioxidants, cold plunge, sauna, HRV, CGM, senolytics/metformin/rapamycin, hormesis-frame) plotted loud-but-weak vs the 3 quiet-but-proven (statins, GLP-1, CRF). | §12.4 oversold list + "inverse correlation" closer | CHART | P1 |
| 12 §12.3.9 | **The cleanest chain — apoB/statins → fewer events** | c | Fully-solid 5-rung chain rendered all-green: HMG-CoA inhibition → LDL-receptor up → ↓apoB → less arterial deposition → ↓ASCVD (dose-dependent). | §12.3.9; `ldl-apob-causal-ascvd`, `statin-ldl-event-dose-response` | QUICK-SVG | P2 |
| 12 §12.3.1 | **Aerobic → PGC-1α → biogenesis (the clean interventional chain)** | c | Three proximate signals (Ca²⁺, ↑AMP:ATP, transient ROS) → PGC-1α → NRF1/2+TFAM → more cristae → ↑VO₂max, with the dotted "→mortality" honesty seam. | §12.3.1; `exercise-mitochondrial-biogenesis-holloszy` | QUICK-SVG | P2 |
| 12 §12.3.3 | **One node, two directions — the mTOR protein/longevity tradeoff** | b | Age-stratified flip: high protein → ↑mortality at 50–65, protective at 65+ (mid-life cancer/IGF-1 risk ↔ late-life sarcopenia). | §12.3.3; `conflict-protein-mtor-longevity` | CHART | P2 |
| 12 §12.1 | **The six fundamental layers (legend card)** | a | Reference card defining energy/redox/proteostasis/membrane/epigenetic/signaling with one example each — reusable across §01/§12/§37. | §12.0 six-layer list | QUICK-SVG | P3 |

---

## §37 — Mitochondrial Health (deep dive)

| Section | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| 37 §37.2.1 | **Mitochondrion anatomy — labeled cross-section** | a/f | Two membranes + two spaces: OMM (VDAC), IMS (proton reservoir), IMM with cardiolipin + cristae junctions (MICOS), ATP-synthase dimers on cristae rims, matrix (mtDNA, Krebs). | §37.2.1 architecture; Wikimedia mito cross-section as base | ANATOMICAL | P1 |
| 37 §37.4 / §37.4.3 | **The Three Dials — Build / Remodel / Remove** | c | The chapter's central organizing image: Biogenesis (PGC-1α→NRF1/2,TFAM) · Dynamics (MFN/OPA1 fuse ↔ DRP1 divide) · Mitophagy (PINK1/Parkin), each with its strongest natural trigger. | §37.4 + the "Dial" table §37.4.3 | COMPLEX | P1 |
| 37 §37.4.3 | **Four good-stress signals converge on PGC-1α** | c | AMP:ATP(AMPK), Ca²⁺(CaMK), transient ROS, NAD⁺(SIRT1) all funnel into PGC-1α → biogenesis — why exercise/fasting/cold/CR share one pathway. | §37.4.3 cascade + convergence note | QUICK-SVG | P1 |
| 37 §37.4.2 | **Mitophagy — membrane potential as the honesty signal** | c | PINK1 degraded in a polarized mito; on Δψ collapse PINK1 accumulates → Parkin ubiquitinates → autophagosome → lysosome. | §37.4.2 PINK1/Parkin steps 1–4 | QUICK-SVG | P1 |
| 37 §37.7 / §37.8 | **The Mitochondrial Levers & Supplements ladder** | b | Ranked horizontal bar by *outcome* tier: exercise at top (meta/cohort), down through fasting/cold (rct-surrogate), to CoQ10(HF-only), urolithin-A/MitoQ/PQQ/NAD⁺ (surrogate→unproven), antioxidants as a NEGATIVE bar (counter-lever). | §37.7 levers table + §37.8 supplement table | CHART | P1 |
| 37 §37.5 | **ROS as signal — the inverted free-radical theory** | c | Old model (ROS=damage→antioxidants) struck through; mitohormesis: transient ROS → NRF2+PGC-1α → net-stronger; antioxidants blunt the signal. | §37.5.1–5.2; `conflict-free-radical-theory` | QUICK-SVG | P1 |
| 37 §37.2.2 | **The ETC, complex by complex (with ROS + drug sites)** | a | Complexes I–V table-as-schematic: which pump H⁺, the ROS sites (I RET, III Q-cycle), and where metformin/cyanide/methylene-blue/NIR act. | §37.2.2 ETC table | QUICK-SVG | P2 |
| 37 §37.3.2 | **mtDNA — heteroplasmy & the threshold effect** | b | The threshold curve: oxidative capacity stays flat until mutant-mtDNA fraction crosses ~60–80%, then fails; energy-hungry tissues (brain/heart/muscle/retina) fail first. | §37.3.2; `wallace-2013-heteroplasmy-threshold` | CHART | P2 |
| 37 §37.10 | **Δp at four positions — the master-variable proof** | c | One central quantity (proton-motive force) shown as: energy currency · quality-control gauge · adaptive-signal source · what aging/disease degrades. | §37.10 four-bullet synthesis | QUICK-SVG | P2 |
| 37 §37.9 | **Primary mito disease — high-current tissues fail first** | f/a | Body silhouette highlighting brain/heart/skeletal-muscle/retina/cochlea/pancreas — the tissues that "go dark first" when Δp fails genetically. | §37.9 MELAS/Leigh/LHON tissue-selectivity | ANATOMICAL | P3 |

---

## §00-map — State of the Field

| Section | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| STATE §intro | **Claims-by-evidence-tier distribution** | b | The headline bar/stacked chart: 27 RCT · 29 meta · 53 observational · 42 mechanistic — "the tier distribution IS the headline." | Intro paragraph ("197 graded claims … tier distribution") | CHART | P1 |
| STATE §1–3 | **The Three Tiers — Strong / Promising / Hype** | d | Three-column triage matrix: high-confidence levers (green) · promising-unproven (amber) · hype/overclaimed (red), each populated with its items. | §1 strong levers · §2 promising · §3 hype | COMPLEX | P1 |
| STATE §1 | **VO₂max → mortality dose-response (no ceiling)** | b | The signature curve: ~13%/MET, ~5× elite-vs-low, no observed upper limit — the strongest exercise-mortality signal. | §1 item 2; `crf-per-met-mortality-meta`, `crf-vo2max-strongest-mortality-predictor` | CHART | P1 |
| STATE §1 | **The 8 high-confidence levers — ranked board** | d | Clean ranked tiles of the boring-but-powerful list (don't smoke → social connection) with effect-size notes; mirrors Start-Here but evidence-framed. | §1 list 1–8 + capstone paragraph | QUICK-SVG | P2 |
| STATE §3 | **The laundering gap — mechanism/mouse → human outcome** | c | The recurring failure mode as a diagram: real mechanism OR mouse result on the left, the dotted (unearned) jump, "marketed human outcome" on the right, with the 9 hype examples tagged. | §3 hype list + "laundering gap" framing | QUICK-SVG | P2 |
| STATE §1 | **Predictor vs lever + cohort vs RCT (the two bias rules)** | a | Concept pair: predictor↛lever, and cohort≠RCT (healthy-user + reverse-causation inflating the strong-looking numbers). | Three honesty rules header | QUICK-SVG | P2 |
| STATE §4 | **The open conflicts that move the picture** | d | Compact register card of the ~8 highest-leverage conflicts (protein↔mTOR, NAD⁺ endpoint, mtDNA causality, which-clock, sleep causality, CR translation, free-radical, sauna bias) with open/partial status chips. | §4 conflicts list; `06-evidence/CONFLICTS-REGISTER.md` | QUICK-SVG | P3 |
| STATE §measurement | **Functional-first measurement panel** | d | What to track, ranked: functional (VO₂max, grip, gait, chair-rise, balance — free/high-signal) vs the few causal blood markers (apoB, Lp(a), HbA1c, fasting insulin). | Capstone measurement paragraph | QUICK-SVG | P2 |

---

## Roll-up

**Total proposed: 47 graphics** across the 6 chapters (00-start-here 6 · 00-atlas 5 · 01-foundations 11 · 12-mechanism-bridge 8 · 37-mitochondrial-health 10 · state-of-the-field 8).

**Priority split:** P1 = 20 · P2 = 19 · P3 = 8.

**Type breakdown (a–g):**
- (a) procedural SVG schematic: 14
- (b) data chart: 12
- (c) flowchart / pathway: 13
- (d) matrix / heatmap grid: 12
- (e) timeline: 1
- (f) real media / anatomical: 3 (often a/f or f/a hybrids)
- (g) infographic composite: 3
*(several rows are dual-tagged, e.g. anatomy = a/f, so counts exceed 47.)*

**Buildability split:** QUICK-SVG 22 · CHART 12 · COMPLEX 8 · ANATOMICAL 3 · FLOWCHART (folded into the pathway QUICK-SVGs).

**The 9 marquee / highest-leverage figures (build these first):**
1. **§01 Energy Stack — chemiosmosis/ETC/ATP-synthase schematic** (COMPLEX) — the manual's single most-referenced foundation; every chapter points to it.
2. **§01 Nutrient-Sensing Switchboard** (mTOR/AMPK/sirtuins/IGF-FOXO/NRF2 network, COMPLEX) — "the most actionable foundation"; recurs in §12 and §37.
3. **§37 The Three Dials — Build/Remodel/Remove** (COMPLEX) — the organizing image of the mitochondria chapter; nothing in prose conveys the three-dials separation as fast.
4. **§12 Convergence Map — many practices, six layers** (COMPLEX) — visually proves the chapter's thesis "levers many, layers few."
5. **STATE Claims-by-evidence-tier chart** (CHART) — the corpus's self-described headline; one bar chart reframes the whole field.
6. **§01 Hallmarks-of-Aging wheel mapped to foundations** (COMPLEX) — the field's organizing taxonomy + the manual's foundation mapping in one figure.
7. **§37 Mitochondrion anatomy — labeled cross-section** (ANATOMICAL) — the readers' anchor object; Wikimedia base keeps it cheap.
8. **§12 Mechanism-tier vs Outcome-tier two-axis grid** (CHART) — operationalizes the manual's single most-repeated discipline (the two axes are not the same).
9. **§01/STATE Hormesis biphasic curve + VO₂max no-ceiling dose-response** (CHART pair) — the two dose-response shapes that govern "more isn't better" and "no observed ceiling."

**Cross-chapter reuse note:** four concepts recur and should be built **once** as canonical assets, then referenced — *predictor-vs-lever* (Start-Here + State), *the six fundamental layers legend* (§12 + §37), *the PGC-1α biogenesis cascade* (§12.3.1 + §37.4.3), and *the laundering-gap diagram* (§12.4 + State §3). Building each once avoids 4 redundant figures.
# Visual Design Spec — BODY cluster

> Reviewer pass for the AGFarms / Bucket Foundation health manual.
> Chapters reviewed: **18** (genetics + anatomy primer), **13** (endocrine), **14** (nervous),
> **15** (immune), **16** (telomeres/cellular aging), **11** (lived-in body systems),
> **17** (organ-systems atlas), **42** (reproductive/sexual health).
> This is a **buildable spec list**, not the graphics. Each row tagged by build tooling + priority.
>
> **Type legend:** (a) PROCEDURAL SVG · (b) DATA CHART (matplotlib) · (c) DECISION FLOWCHART/pathway ·
> (d) MATRIX/HEATMAP · (e) TIMELINE · (f) REAL MEDIA (open-license Wikimedia / demo frames) · (g) INFOGRAPHIC composite.
> **Buildability:** QUICK-SVG · CHART · FLOWCHART · ANATOMICAL · REAL-MEDIA · COMPLEX.
> **Priority:** P1 (build first / headline) · P2 (strong support) · P3 (nice-to-have).
>
> **Asset note:** the 29 on-hand Wikimedia images are musculoskeletal (ankle/hip/knee/shoulder/spine/muscle/brown-fat/
> diaphragm) — they serve the training sections, **not** this cluster. Body-cluster anatomicals (neuron, nephron,
> endocrine-gland map, reproductive anatomy) need **new** open-license Wikimedia pulls; tagged REAL-MEDIA where a clean
> CC/PD source is known to exist, else QUICK-SVG schematic.

---

## Chapter 18 — Genetics (Practical) & Anatomy/Physiology Primer

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| B.3 | **The 12 organ systems — navigation map** | g | One-screen atlas: 11–12 classical organ systems, each with its core homeostatic variable + "where the manual covers it." The book's master index figure. | §B.3 navigation table | COMPLEX | **P1** |
| B.1 | Levels of organization — nested hierarchy | a | Atoms → molecules → organelles → cells → tissues → organs → organ systems → organism, as nested/stacked bands. | §B.1 levels table | QUICK-SVG | P1 |
| B.4.1 | The VO₂max oxygen chain | a/c | Lungs → blood (Hb) → heart (cardiac output) → capillaries → mitochondria, with the trainable link flagged at each step. | §B.4.1 | QUICK-SVG | P1 |
| B.4.2 | How food becomes ATP — the fuel chain | a/c | Digestive → cardiovascular → glycolysis/β-oxidation → Krebs → ETC → ATP synthase (chemiosmosis). | §B.4.2 | QUICK-SVG | P2 |
| A.1 | Common vs rare variants — effect-size vs frequency | b | Scatter: large-effect rare variants (BRCA/LDLR) vs tiny-effect common SNPs (ACTN3); shows why chips miss the actionable ones. | §A.1 common/rare distinction | CHART | P2 |
| A.2 | The few variants that actually matter | d | Matrix of the 7 actionable categories (APOE, Lp(a), pharmacogenes, BRCA, HFE, FOXO3, MTHFR) × what it is / why it matters / honest grade. | §A.2 table | MATRIX | P2 |
| A.2.1 | APOE gene-dose risk for Alzheimer's | b | Bar/step chart: ε3/ε3 baseline → 1×ε4 (~2–3×) → ε4/ε4 (~8–12×), with "risk ≠ destiny" caption. | §A.2.1 | CHART | P2 |
| B.1 | The four basic tissue types | f/a | Epithelial / connective / muscle / nervous panel — histology thumbnails (Wikimedia PD) + one-line function. | §B.1 | REAL-MEDIA | P3 |

---

## Chapter 13 — Endocrine System & Hormones

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3–§7 | **The endocrine axes — feedback diagram (HPA · HPG · HPT)** | a/g | Side-by-side three-tier loops: hypothalamus → pituitary → gland → effector hormone → negative feedback, the three canonical axes drawn identically to show the shared control primitive. | §3 (HPA), §4 (HPG), §5 (HPT) | COMPLEX | **P1** |
| §1 | The generic three-tier axis + negative feedback | a | Single annotated loop teaching the control law (releasing → stimulating → effector → inhibits-above); the schematic the master diagram is built from. | §1 "fundamental control law" | QUICK-SVG | P1 |
| §1/§2 | Hormone change with age | b | Multi-line: testosterone (~1%/yr slope), estrogen (menopause cliff), DHEA (steep), GH/IGF-1 (somatopause), melatonin (decline) vs insulin-resistance & evening-cortisol (rise). | §2 table "change with age"; §1 set-point drift | CHART | **P1** |
| §3 | Cortisol circadian rhythm | b | 24-h cortisol curve: pre-waking surge, cortisol-awakening-response peak (+30–45 min), daily decline to night trough; "healthy ≠ flat." | §3 "the rhythm is the point" | CHART | P1 |
| §7 | IGF-1 U-shaped mortality curve | b | Mortality (y) vs IGF-1 (x) U-shape; arrow showing "boost your GH" pushes the wrong way; Laron/daf-2 longevity-favorable region marked. | §7 growth–longevity tradeoff; `igf1-u-shaped-mortality` | CHART | P1 |
| §1 | Reading the axis by the lab-pair | d | 2×2 interpretation matrix: stimulating signal (high/low) × effector (high/low) → locates lesion (primary vs central), applied to TSH/T4, LH·FSH/steroid, ACTH/cortisol. | §1 "it explains the lab pairs" | MATRIX | P2 |
| §1/§2 | Endocrine gland body map | f/a | Anatomical body outline locating hypothalamus, pituitary, thyroid/parathyroid, adrenals, pancreas, gonads, pineal (+ fat/gut/heart as endocrine tissue). | §1 gland list | REAL-MEDIA | P2 |
| §2 | The axis-by-axis lever table | d | The §2 master table as a graphic: axis × effector × age-change × honest lever × evidence tier (color-coded by tier). | §2 master table | MATRIX | P2 |
| §6 | Insulin-resistance early-warning ordering | b/e | Timeline/staggered chart: fasting insulin / HOMA-IR rises first → HbA1c → fasting glucose; "breaks years before a glucose test flags it." | §6 early-warning ordering | CHART | P2 |

---

## Chapter 14 — The Nervous System

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.2 | **Neuron + action potential schematic** | a | Labeled neuron (dendrites→soma→axon→terminals) joined to the AP mechanism: Na⁺/K⁺ pump, voltage-gated Na⁺/K⁺ channels, threshold/upstroke/downstroke. | §1.2 | QUICK-SVG | **P1** |
| §1.2 | Action-potential voltage trace | b | Membrane potential (mV) vs time: −70 rest → threshold → +40 spike → repolarize → hyperpolarize, phases annotated to channel states (Hodgkin–Huxley). | §1.2; HH 1952 | CHART | P1 |
| §2.1 | Autonomic nervous system — sympathetic vs parasympathetic | a/g | Body diagram, two columns: fight/flight vs rest/digest organ effects, transmitters (NE vs ACh), thoracolumbar vs craniosacral/vagus outflow. | §2.1 table | COMPLEX | **P1** |
| §3 | Neurotransmitters — function vs the pop error | d | Matrix: glutamate / GABA / dopamine / serotonin / ACh / NE × "what it actually does" vs "the pop error" (the §3 table as graphic). | §3 table | MATRIX | **P1** |
| §1.3 | The tripartite synapse + glia | a | Synapse (vesicles, Ca²⁺ influx, receptors) plus astrocyte, microglia (pruning), oligodendrocyte/myelin (saltatory conduction). | §1.3 | QUICK-SVG | P2 |
| §6.1 | Nociception ≠ pain | a/c | Peripheral nociceptor → spinal cord → brain *constructs* pain, with descending modulation (PAG→cord) amplify/suppress; placebo/naloxone callout. | §6.1 | QUICK-SVG | P2 |
| §1.1 | CNS vs PNS two-compartment map | a | Simple body map splitting CNS (brain+cord, no regrowth) vs PNS (regrows ~1 mm/day); the regenerative-asymmetry fact. | §1.1 | QUICK-SVG | P3 |
| §4.2 | Plasticity across the lifespan | b | Schematic curve: high childhood plasticity with critical-period windows (language, binocular vision) → smaller/slower adult plasticity. | §4.2 critical periods | CHART | P3 |

---

## Chapter 15 — Immune System & Inflammation

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.1–1.2 | **Innate vs adaptive immunity — the map** | g/d | Two-arm diagram: innate (fast/fixed/no-memory: barriers, neutrophils, macrophages, NK, complement) vs adaptive (slow/specific/remembers: T cells, B cells/antibodies, memory), with the dendritic-cell bridge. | §1.1, §1.2 | COMPLEX | **P1** |
| §2 | Immunosenescence timeline | e/b | Lifespan timeline: thymic involution from puberty, TREC/naïve-T decline, naïve→memory/exhausted shift, CMV "memory inflation," rising baseline inflammation. | §2.1–2.4 | TIMELINE | **P1** |
| §1.3 | Acute-resolving vs chronic non-resolving inflammation | c/a | Two parallel process tracks: injury→recruit→clear→**active resolution** (SPMs) vs program-that-never-ends (sterile, smoldering = inflammaging). | §1.3 | QUICK-SVG | P1 |
| §4.1/§7 | Immune-modulator evidence ladder | d | Ranked matrix: vaccines/sleep/exercise/deficiency-correction (proven) → zinc/vitC (narrow) → echinacea/blends (null) → cleanses/IV drips (no evidence). "Regulate, don't boost." | §4 tables, §7 synthesis | MATRIX | **P1** |
| §3.1 | Inflammaging hub | c/g | Sources (SASP/senescent cells, gut leak, visceral fat, DAMPs, failed resolution) → inflammaging → downstream diseases; IL-6/hsCRP marked predictor-not-lever. | §3.1, §3.2 | FLOWCHART | P2 |
| §4.2 | The exercise immune J-curve (honestly corrected) | b | Infection risk vs exercise load: moderate dips below sedentary; the contested "open window" at extreme load drawn dashed (Campbell & Turner correction). | §4.2 | CHART | P2 |
| §1.1 | Innate components × "ages how" | d | The §1.1 table as graphic: barriers/neutrophils/macrophages/DC/NK/complement × function × age-change. | §1.1 table | MATRIX | P3 |
| Framing | "Boost vs regulate" concept | a/g | One-panel contrast: a "boosted" immune system = autoimmunity/allergy/cytokine-storm vs a regulated/resolving one = health. | §0 framing box | QUICK-SVG | P3 |

---

## Chapter 16 — Telomeres & Cellular Aging

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §16.1.2 | **The end-replication problem** | a | Lagging-strand replication: Okazaki fragments + RNA primers, the terminal primer that can't be replaced → sliver lost each division. The "why telomeres shorten" schematic. | §16.1.2 | QUICK-SVG | **P1** |
| §16.1.4 | Telomere clock → Hayflick limit | a/b | Telomere shortening per division → uncapped end → DNA-damage response → p53/p21 → replicative senescence at ~40–60 doublings. | §16.1.4 | QUICK-SVG | P1 |
| §16.3 | **The cancer paradox** | d/c | Two-column: telomeres too short (senescence, stem-cell exhaustion, dyskeratosis/IPF) vs too long / telomerase on (**cancer**), with the arrow the market sells; MR evidence callout. | §16.3; Haycock 2017 MR | MATRIX | **P1** |
| §16.1.1/.3 | Telomere cap + telomerase | a | Chromosome end: TTAGGG repeats, shelterin, single-strand overhang t-loop; telomerase (TERT + TERC RNA template) re-extending the end. | §16.1.1, §16.1.3 | QUICK-SVG | P2 |
| §16.3 | Mendelian randomization: longer telomeres trade off | b | Forest-style chart: genetically longer telomeres → ↑ several cancers, ↓ coronary heart disease (the bidirectional, not-a-free-lunch result). | §16.3; Haycock 2017 | CHART | P2 |
| §16.4 | "Lengthening" evidence grading | d | Matrix of TA-65 / meditation / lifestyle studies × design × what it actually showed × tier — every row surrogate-only/conflicted, none an outcome. | §16.4.1, §16.4.2 | MATRIX | P3 |
| §16.6 | Consumer telomere test — 5 failure modes | g | Infographic: noise / wrong tissue / weak prediction / no action / conflict-of-interest — "a predictor mis-sold as a lever." | §16.6 | QUICK-SVG | P3 |
| §16.5 | Senescence triggers — telomere-dependent vs not | c | Pathway: telomere attrition is *one* entrance; oncogene/DNA-damage/oxidative/proteotoxic stress also → p16/p53 arrest → SASP. | §16.5.2 | FLOWCHART | P3 |

---

## Chapter 11 — Lived-In Body Systems (skin · teeth · bone · eyes · ears · feet · floor)

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.5 | **The honest skincare hierarchy** | d | Tier matrix: sunscreen + retinoid (RCT, do-this) → moisturizer/collagen (helps a bit) → peptide/"stem-cell" serums (hype) → tanning beds (net-harm). | §1.5 table | MATRIX | **P1** |
| Verdict | Lived-in systems — best lever per system | g | Composite: 7 systems (skin/teeth/bone/eyes/ears/feet/floor) each with its single best-evidenced, most-skipped lever. | §0 one-line verdict + synthesis | COMPLEX | P1 |
| §3.2 | Bone responds to load, not cardio | b | Bar chart: BMD change from heavy resistance + impact (LIFTMOR) vs walking/swimming (~none). | §3.2; Watson 2018 LIFTMOR | CHART | P2 |
| §3.1 | Hip fracture is a mortality event | b | Excess-mortality chart: ~2–3× vs age-matched peers, highest in first 3–6 months, men worse. | §3.1; Haentjens 2010 | CHART | P2 |
| §2 | Oral–systemic disease links | c/d | Periodontitis → CVD (assoc, lever unproven) / diabetes (lever **proven**, HbA1c↓) / dementia (emerging), edges weighted by evidence strength. | §2.1–2.4 | FLOWCHART | P2 |
| §3.5 | Osteosarcopenia — bone + muscle fail together | a | Overlapping-loop diagram: shared drivers (inactivity, low protein, vit-D, inflammation, hormones) → compounded falls/fracture/mortality; one shared lever. | §3.5 | QUICK-SVG | P3 |
| §5 | Noise dose — every +3 dB halves safe time | b | Log chart of safe exposure time vs intensity from ~85 dB; concerts/tools/earbuds-at-max plotted; 60/60 rule callout. | §5 practical hearing protection | CHART | P3 |

---

## Chapter 17 — Organ Systems Atlas (respiratory · renal · hepatic · digestive · hematologic · reproductive · lymphatic)

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| Map | **The 7-system atlas — ages how / lever / tier** | d/g | The system-by-system table as a graphic master map for the atlas (respiratory…lymphatic × ageing × best lever × evidence tier). | "System-by-system map" table | MATRIX | **P1** |
| §1.2 | **Lung-function (FEV₁) decline — Fletcher–Peto** | b | The classic diagram: FEV₁ vs age for never-smoker vs smoker (steeper) vs quitter (slope resets, loss not recovered). | §1.2; Fletcher & Peto 1977 | CHART | **P1** |
| §1.5 | VO₂max → mortality dose-response | b | Monotonic mortality fall with fitness, no upper limit; lowest quintile rivals smoking/diabetes (Mandsager 122k tests). | §1.5; Mandsager 2018 | CHART | P1 |
| §2.1 | Nephron / kidney schematic | f/a | Labeled nephron (glomerulus, tubule) + the "silent organ" framing — lose half before symptoms. | §2.1 | REAL-MEDIA | P2 |
| §2.2 | eGFR decline with age | b | eGFR ~0.8–1 mL/min/1.73m²/yr fall after ~40; CKD-stage threshold line; "predictor, lever is upstream." | §2.2 | CHART | P2 |
| §3.2 | MASLD progression spectrum + reversal | c/a | Steatosis → MASH → fibrosis → cirrhosis → HCC arrow, with the ≥7–10% weight-loss reversal point marked (Vilar-Gomez dose-response). | §3.2, §3.4 | QUICK-SVG | P2 |
| §5.2 | Iron — the two-sided element | a/d | Split diagram: deficiency (anemia → hunt occult bleed) vs overload (HFE → phlebotomy is the cure); dose-makes-the-poison. | §5.2 | QUICK-SVG | P3 |
| §8 | Detox/cleanse debunk | g | Infographic: liver + kidney detoxify continuously, lymph self-drains, movement is the pump — juices/MLD-on-healthy do nothing. | §3.5, §7.3, §8.4 | QUICK-SVG | P3 |
| §4.4 | Fiber — hard-endpoint dose-response | b | Higher fiber → 15–30% lower all-cause/CVD mortality (Reynolds 2019 Lancet). | §4.4 | CHART | P3 |

---

## Chapter 42 — Sexual & Reproductive Health

| Section | Figure title | Type | What it shows | Source (chapter / claim) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §2.1 | **Menstrual-cycle hormone curve** | b | The canonical 28-day figure: FSH/LH (with ovulatory LH surge), estrogen, progesterone; ovarian (follicular/ovulation/luteal) + uterine (menstrual/proliferative/secretory) phase bands. | §2.1 | CHART | **P1** |
| §3 | **Contraception effectiveness — typical vs perfect use** | b | Sorted bar chart of 1st-year failure: implant/IUD (~0.05–0.8%) … pill/patch/ring (~7%) … condom (~13%) … withdrawal (~20%); typical-vs-perfect gap shown. LARC 20–50× the pill. | §3 table; Trussell 2011, Winner 2012 | CHART | **P1** |
| §4.2 | IVF live-birth success by maternal age | b | Bar chart: <35 (~40–50%) → >42 (<5%) live birth per own-egg cycle; donor-egg line flat at donor's age. | §4.2 table | CHART | P2 |
| §1 | HPG axis — male steady set-point vs female oscillator | a | Two control diagrams: male GnRH→LH/FSH→T steady band vs female ~28-day oscillator with engineered positive-feedback LH surge. | §1 hormonal cycles | QUICK-SVG | P2 |
| §1 | Ovarian reserve over the lifespan | b | Egg count vs age: ~6–7M fetal → ~1–2M birth → ~400k puberty → ~0 menopause; quality falls steeply after mid-30s. | §1 female system | CHART | P2 |
| §6.1 | STIs at a glance | d | Matrix: chlamydia/gonorrhea/syphilis/HIV/HPV/HSV/trich × agent × symptomatic? × curable/manageable/vaccine-preventable; HPV-vaccine headline. | §6.1 table | MATRIX | P2 |
| §6.2 | ED as a cardiovascular warning light | c | Pathway: small penile arteries clog first → ED precedes coronary events by years → work-up trigger, not just a pill. (Canonical here; cross-ref §17 §6.3.) | §6.2; Inman 2009 | FLOWCHART | P2 |
| §1 | Shared embryonic origin — reproductive homology | a | Bipotential gonad + SRY switch → male/female; homology map (ovary↔testis, clitoris↔penis, labia↔scrotum). | §1 common embryonic plan | QUICK-SVG | P3 |
| §2.2 | Gynecologic disorders matrix | d | PCOS / endometriosis / fibroids / PMDD / AUB / adenomyosis × what it is × honest framing × first-line lever. | §2.2 table | MATRIX | P3 |

---

## Summary

- **Total figures proposed: 65** across 8 chapters (7–9 each).
- **By priority:** P1 = 18, P2 = 26, P3 = 21.

### Top 5 (highest leverage, build first)
1. **12-organ-systems navigation map** (Ch 18 §B.3) — the book's master index figure; COMPLEX infographic.
2. **Menstrual-cycle hormone curve** (Ch 42 §2.1) — canonical, expected, and currently missing; CHART.
3. **Endocrine axes feedback diagram — HPA/HPG/HPT** (Ch 13) — teaches the control law the whole chapter hangs on; COMPLEX SVG.
4. **Contraception effectiveness chart** (Ch 42 §3) — carries the single most counter-intuitive fact (LARC 20–50× the pill); CHART.
5. **Neuron + action-potential schematic** (Ch 14 §1.2) — a canon `05-biophysics` foundation; QUICK-SVG (+ paired voltage-trace CHART).

Runners-up that nearly made it: innate-vs-adaptive immunity map (15), immunosenescence timeline (15), telomere cancer-paradox (16), FEV₁ Fletcher–Peto decline (17), hormone-change-with-age chart (13).

### Type breakdown (primary tag)
- **(a) Procedural SVG:** ~17 (neuron, axes loops, end-replication, synapse, fuel/oxygen chains, etc.)
- **(b) Data chart (matplotlib):** ~21 (menstrual curve, contraception, FEV₁, IGF-1 U-shape, cortisol rhythm, IVF, eGFR, J-curve…) — the largest bucket.
- **(c) Flowchart / pathway:** ~7 (inflammaging hub, oral-systemic, ED→CVD, MASLD spectrum, nociception, senescence triggers).
- **(d) Matrix / heatmap:** ~12 (variant table, neurotransmitter table, evidence ladders, STI/gyn matrices, skincare hierarchy, cancer-paradox).
- **(e) Timeline:** ~1 primary (immunosenescence) + 1 hybrid (insulin early-warning).
- **(f) Real media (Wikimedia/PD):** ~3 primary (endocrine gland map, nephron, tissue-types) — all need **new** open-license pulls; on-hand 29 are musculoskeletal and don't cover this cluster.
- **(g) Infographic composite:** ~4 (organ-systems nav map, lived-in-systems verdict, detox debunk, immune boost-vs-regulate) — typically COMPLEX builds.

**Buildability skew:** mostly QUICK-SVG + CHART (fast, deterministic, cairosvg/matplotlib). 4 COMPLEX composites (the two nav/atlas maps + the two multi-axis diagrams) are the only heavy lifts. 3 REAL-MEDIA items are the only external-dependency rows (need Wikimedia sourcing pass).
# Visual Design Spec — Clinical & Disease Cluster

> **Reviewer scope:** 13 chapters of the AGFarms / Bucket Foundation health manual — the
> disease + clinical + emergency cluster. This is a **buildable spec list**, not the graphics.
> Each row is a candidate figure with its build-tool tag, source anchor, buildability, and priority.
>
> **Build tooling legend**
> | Tag | Tool |
> |---|---|
> | **(a)** | PROCEDURAL SVG (cairosvg) |
> | **(b)** | DATA CHARTS (matplotlib) |
> | **(c)** | DECISION FLOWCHARTS / algorithms |
> | **(d)** | MATRIX / HEATMAP |
> | **(e)** | TIMELINES |
> | **(f)** | REAL MEDIA (Wikimedia open-license) |
> | **(g)** | INFOGRAPHIC |
>
> **Buildability:** QUICK-SVG · CHART · FLOWCHART · ANATOMICAL · REAL-MEDIA · COMPLEX
> **Priority:** P1 (build first — life-saving / spine-of-chapter / high-leverage) · P2 · P3
>
> Highest-leverage class in this cluster = **decision flowcharts / action algorithms** (esp.
> emergency first-aid) and **risk-stratification charts**. The emergency action cards (CPR,
> BE-FAST, anaphylaxis, choking, bleeding, naloxone, sepsis) are the literal life-saving figures
> and are all **P1**.

---

## 34 — Emergency, Acute Care & First Aid  *(the life-saving cluster — every recognition→action card is P1)*

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §2.1 Hands-only CPR | **Hands-Only CPR Action Card** | a / g | Center-of-chest, **rate 100–120/min**, **depth ~2 in / 5–6 cm**, full recoil, *Stayin' Alive* tempo, switch every ~2 min, don't stop except for AED | Hasselqvist-Ax NEJM 2015 `10.1056/NEJMoa1405796` (10.5% vs 4.0% survival) | QUICK-SVG | **P1** |
| §3.2 Stroke | **BE-FAST Stroke Recognition Card** | a / g | 6 panels: **B**alance, **E**yes, **F**ace droop, **A**rm drift, **S**peech, **T**ime (note onset; call 911) — ties to 4.5 h thrombolysis / 24 h thrombectomy windows | §3.2; cross-ref `24 §3` | QUICK-SVG | **P1** |
| §3.3 Anaphylaxis | **Anaphylaxis: Epinephrine-First Sequence** | a / c | Ordered steps: epinephrine to outer thigh FIRST → 911 → lie flat/legs up → repeat in 5–15 min → ER regardless (biphasic risk). Recognition signs strip (hives + lip/tongue/throat swelling, wheeze, collapse) | JTF 2020 `10.1016/j.jaci.2020.01.017` | QUICK-SVG | **P1** |
| §3.6 Choking | **Choking Response: 5 Back Blows + 5 Heimlich** | a / c | Alternate **5 back blows / 5 abdominal thrusts**; collapse → CPR, no blind sweeps; infant variant (5 back + 5 chest, never abdominal); pregnant/obese = chest thrusts | §3.6 | QUICK-SVG (ANATOMICAL body outline) | **P1** |
| §3.5 Severe bleeding | **Stop-the-Bleed: Pressure → Tourniquet** | a / c | Direct firm pressure first; life-threatening limb bleed → tourniquet **2–3 in above wound, high & tight, NOT over a joint**, tighten until stops, **note time** | Kragh Ann Surg 2009 `10.1097/SLA.0b013e31818842ba` | QUICK-SVG (ANATOMICAL limb) | **P1** |
| §3.7 Opioid overdose | **Opioid Overdose: Naloxone-First Protocol** | a / c | Recognize (unresponsive + slow/absent breathing + pinpoint pupils + blue lips) → naloxone nasal → 911 → support breathing → repeat q2–3 min → stay (naloxone wears off 30–90 min) | Walley BMJ 2013 `10.1136/bmj.f174` | QUICK-SVG | **P1** |
| §3.4 Sepsis | **Sepsis Red-Flag Checklist ("say SEPSIS")** | a / g | Infection PLUS: confusion/slurred speech, extreme shivering OR abnormally low temp, no urine all day, severe breathlessness, "I feel I might die," mottled/blue skin → ER, say the word | Surviving Sepsis 2021 `10.1097/CCM.0000000000005337`; Rudd Lancet 2020 (48.9M cases / 11M deaths) | QUICK-SVG | **P1** |
| §1.1 / §0.x | **Emergency "Recognize → Act" Master Wallet Card** | g / a | Single one-page grid: each emergency (cardiac arrest, stroke, anaphylaxis, choking, bleed, overdose, sepsis) × recognize / act / call. The chapter's "wallet card" §"Recognize → Act, one more time" | §1.1 master table + §"wallet card" | QUICK-SVG (multi-panel) | **P1** |
| §4.1 Burns | **Burn First Aid: 20-Minute Cool-Water Protocol** | a / c | DO: cool running water ~20 min (within 3 h), remove rings, cling-film cover. DON'T: butter/oil/ice/blister-bursting. ER triggers (face/hands/genitals, circumferential, airway) | §4.1 | QUICK-SVG | P2 |
| §4.6 Seizures | **Seizure Response: Don'ts + Recovery Position** | a / c | Cardinal DON'Ts (nothing in mouth, don't restrain) + DO (time it, clear objects, cushion head, recovery position after) + call-911 thresholds (>5 min, repeats, first-ever) | §4.6 | QUICK-SVG | P2 |
| §6.2 Heat stroke | **Heat Stroke: Cool-First, Transport-Second** | a / c | Core temp ≳40 °C + altered mental status → cold-water immersion gold standard / dowse+fan+ice to neck-armpit-groin; antipyretics don't work | §6.2 | QUICK-SVG | P3 |

---

## 22 — Disease Atlas I: Cardiometabolic, Endocrine & Renal

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.1 CAD/MI | **The apoB Atherosclerosis Cascade** | a / c | Retention→oxidation→foam-cell→plaque→rupture; one apoB per particle; non-obstructive plaque rupture causes most MIs; lowering apoB regresses plaque | `L-biomarkers` claim `apob-superior-to-ldlc`; FOURIER | QUICK-SVG (cross-section ANATOMICAL) | **P1** |
| §6.1 CKD | **KDIGO CKD Heat Map (GFR × Albuminuria)** | d | 6 GFR rows (G1 ≥90 → G5 <15) × 3 albuminuria cols (A1/A2/A3) green→red risk grid; albuminuria independent of GFR | KDIGO; lines 474–480 (albuminuria cutoffs from `17`) | MATRIX | **P1** |
| §2.2 T2D | **Type 2 Diabetes Management Ladder** | c / g | Tiered: lifestyle (DPP **58%** vs metformin **31%** progression cut) → metformin (UKPDS) → GLP-1/SGLT2 (EMPA-REG **38%** CV-death cut; semaglutide ~15% wt) → insulin | DPP 2002; UKPDS; EMPA-REG; SELECT | FLOWCHART | **P1** |
| §1.2 HFrEF | **Heart Failure: Four Pillars & Mortality Effect** | b / g | ARNI (PARADIGM-HF, ~20% CV cut, HR 0.84) · beta-blocker (~34%) · MRA (~30%) · SGLT2i (DAPA-HF HR 0.74) — bars of mortality reduction | PARADIGM-HF 2014; DAPA-HF 2019 | CHART | P2 |
| §2.3 T2D remission | **DiRECT: Remission by Weight Loss** | b | Dose-response bars: 46% remission (vs 4% control) at 1 yr; **86% of those losing ≥15 kg**; 36% at 2 yr | DiRECT Lancet 2018 / 2019 | CHART | P2 |
| §2.1 Metabolic syndrome | **Metabolic Syndrome: 5-Component Venn/Cluster** | g | 5 criteria (central adiposity, BP, glucose, triglycerides, low HDL); **≥3 of 5** = cluster; ~2× CV risk | ATP-III standard; lines 222–225 | QUICK-SVG | P2 |
| §1.2 HF phenotypes | **HFrEF vs HFpEF by Ejection Fraction** | g | EF axis: HFrEF ≤40% (weak squeeze) / HFmrEF 40–50% / HFpEF ≥50% (stiff fill); HFpEF ~half & rising | lines 113–117 | QUICK-SVG | P3 |
| §0 map | **Cardiometabolic-Renal "One Machine" Overview** | g | The interlinked failure of one vascular/metabolic system (CAD, HF, AF, T2D, CKD) — anchors the 4-horsemen framing for this cluster | §0 "map at a glance" table | INFOGRAPHIC | P2 |

---

## 23 — Disease Atlas II: Respiratory & GI

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §C1 MASLD/MASH | **MASLD Progression Spectrum + Reversal** | a / c | Steatosis→MASH→fibrosis→cirrhosis→HCC; ~30%+ adults; **≥7% wt resolves MASH, ≥10% regresses fibrosis**; resmetirom / semaglutide new; CV is #1 cause of death | MAESTRO-NASH `10.1056/NEJMoa2309000`; ESSENCE `10.1056/NEJMoa2413258` | QUICK-SVG | **P1** |
| §B7 CRC screening | **Adenoma→Carcinoma Window & Screening** | e / c | ~10–15 yr polyp-to-cancer window = the preventable gap; colonoscopy (NordICC) + FIT; screen from **age 45** | NordICC `10.1056/NEJMoa2208375` | TIMELINE | **P1** |
| §B3 IBS | **Low-FODMAP 3-Phase Protocol** | c | Restriction → systematic reintroduction → personalization (dietitian-guided, not lifelong); ~50–67% respond; soluble fiber helps / insoluble bran worsens | Halmos Gastroenterology 2014 `10.1053/j.gastro.2013.09.046` | FLOWCHART | P2 |
| §A3 OSA | **OSA: Mechanism + CPAP Honest Outcomes** | a / b | Airway collapse → intermittent hypoxia/sympathetic surge → HTN/AF/insulin resistance; SAVE trial: **no CV-event cut** but improved sleepiness/QoL (adherence-limited) | SAVE `10.1056/NEJMoa1606599` | QUICK-SVG + CHART | P2 |
| §A1 Asthma | **Asthma: Type-2 Eosinophilic Inflammation** | a | Th2 → IL-4/5/13 → eosinophils/IgE/mast cells → hyperreactive smooth muscle; obstruction reversible but problem is inflammatory (ICS, not just bronchodilator) | GINA; lines 68–74 | ANATOMICAL (airway) | P2 |
| §B2 PUD | **H. pylori: Chronic→Curable Ulcer** | e / a | 1984 Marshall self-experiment; urease buffering → gastritis/ulcer/cancer; quadruple/vonoprazan eradication cures the diathesis | Marshall MJA 1985; 2006 Nobel | TIMELINE | P3 |
| §C2 Hep C | **Hepatitis C: Interferon → DAA Cure** | e / b | Pre-2014 ~50% cure (1 yr, toxic) vs DAAs **>95% in 8–12 wk pills**; barrier now diagnosis/access | Afdhal NEJM 2014 `10.1056/NEJMoa1402454` | CHART | P2 |

---

## 24 — Disease Atlas III: Neuro & Rheumatology

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3 Stroke | **Ischemic Stroke: Reperfusion Windows & NNT** | e / b | Thrombolysis 3 h→4.5 h→imaging-selected 24 h; thrombectomy **NNT ≈ 2.6**, doubles functional independence (HERMES); core vs penumbra | NINDS 1995; HERMES `10.1016/S0140-6736(16)00163-X`; HOPE 2025 | TIMELINE + CHART | **P1** |
| §6 Parkinson's | **Parkinson's: Prodrome → Motor Tetrad** | e / a | Non-motor first (constipation, RBD, anosmia, depression) precede motor dx by years–decades; **50–70% SNpc dopaminergic neurons lost** at diagnosis; Braak gut→brain ascent | Bloem Lancet 2021 `10.1016/S0140-6736(21)00218-X` | TIMELINE | **P1** |
| §5 MS | **MS Disease Courses & DMT Efficacy** | b / g | RRMS / SPMS / PPMS courses; >20 DMTs; high-efficacy anti-CD20 cut relapses **70–90%**; "hit hard early" | Reich NEJM 2018 `10.1056/NEJMra1401483` | CHART | P2 |
| §11 Osteoarthritis | **OA: Whole-Joint Disease + X-ray≠Pain** | a / g | 6-component joint (cartilage, subchondral bone, synovium, meniscus, ligament, shape); imaging-pain dissociation; exercise/wt-loss first, no DMOAD, arthroscopy = sham | Hunter Lancet 2019 `10.1016/S0140-6736(19)30417-9` | ANATOMICAL (joint) | P2 |
| §13 Gout | **Gout: Urate Saturation & Treat-to-Target** | a / b | Hyperuricemia (sat ~6.8 mg/dL) → MSU crystals → NLRP3/IL-1β; mostly genetic not dietary; ULT target **<6 mg/dL** dissolves crystals; under-treated | ACR 2020 `10.1002/art.41247`; Choi NEJM 2004 | QUICK-SVG | P2 |
| §8 Neuropathy | **Neuropathic Pain: Symptomatic NNT Ladder** | b | First-line duloxetine/pregabalin/gabapentin/amitriptyline **NNT ~4–8** for 50% relief; glycemic control = only disease-modifier; B6 can cause neuropathy | Finnerup Lancet Neurol 2015 `10.1016/S1474-4422(14)70251-0` | CHART | P3 |
| §7 Migraine | **Migraine Prevention: CGRP Breakthrough** | b | Acute (triptans/gepants/ditans) vs preventive CGRP mAbs (erenumab etc.) cutting **2–3 migraine days/mo over placebo** — advance, not cure | Edvinsson Nat Rev Neurol 2018 `10.1038/s41582-018-0003-1` | CHART | P3 |
| §12 RA | **RA: Treat-to-Target Escalation** | c | Autoantibodies (RF/anti-CCP) years pre-symptom → pannus (TNF/IL-6); methotrexate anchor → biologics/JAK; treat-to-target window-of-opportunity; remission realistic | Smolen Lancet 2016 `10.1016/S0140-6736(16)30173-8` | FLOWCHART | P3 |

---

## 25 — Oncology & Cancer

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §25.1.2 Hallmarks | **Hallmarks of Cancer Wheel (2000→2022)** | g | 14-spoke wheel: original 6 (proliferation, evade suppressors, resist death, replicative immortality [telomerase **85–90%**], angiogenesis, invasion) + 2011 four + 2022 four | Hanahan & Weinberg 2000/2011; Hanahan 2022 | INFOGRAPHIC (radial) | **P1** |
| §25.3 Major cancers | **Cancer Burden & 5-Year Survival** | b | Cases / deaths / 5-yr survival for lung (#1 killer ~125k deaths, 25%), breast (91%), prostate (97%), colorectal (65%), melanoma (94%), pancreatic (**13%**) | ACS 2024; SEER | CHART | **P1** |
| §25.2.2 CRC sequence | **Adenoma→Carcinoma Multi-Hit Sequence** | a / e | Normal→(APC)→adenoma→(KRAS)→(18q/SMAD4)→(TP53)→carcinoma; 2–8 drivers; clonal evolution | Fearon & Vogelstein 1990; Vogelstein Science 2013 | QUICK-SVG | P2 |
| §25.5.2 Immunotherapy | **CheckMate-067: Melanoma 5-yr Survival** | b | Pre-immunotherapy near-uniformly fatal → nivo+ipi **~52% OS at 5 yr**, durable off-treatment remissions | Larkin NEJM 2019; Hodi NEJM 2010 | CHART | P2 |
| §25.2.4 BRCA | **Lifetime Cancer Risk: BRCA1 vs BRCA2** | b | BRCA1 breast 55–72% / ovarian 39–44%; BRCA2 breast 45–69% / ovarian 11–17% | Kuchenbaecker 2017 | CHART | P3 |
| §25.2.1 drivers | **Oncogene/Suppressor Mutation Frequency** | b / d | TP53 ~50% of all tumors; RAS ~25–30% (pancreatic ~90%, CRC ~40%, lung ~30%); HER2/EGFR/BCR-ABL/BRAF examples | lines 131–147 | CHART | P3 |

---

## 07 — Clinical Prevention

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3 Cancer screening | **Cancer Screening Decision Table (who/when/which/benefit)** | c / d | Colorectal 45–75 (NordICC RR 0.82), lung 50–80/≥20 pk-yr (NLST −20%), breast 40–74 (−20%), cervical 21–65 (Grade A), skin (Grade I, no benefit) | NordICC; NLST/NELSON; Marmot 2012; USPSTF | MATRIX / FLOWCHART | **P1** |
| §3.3 Breast | **Mammography: Benefit vs Overdiagnosis** | g / b | The trade-off: ~3 overdiagnosed per 1 death prevented; ~1 death/235 invited over 20 yr vs ~19% overdiagnosis — visualizes lead-time/overdiagnosis concept | Marmot 2012 (UK Independent Review) | INFOGRAPHIC | **P1** |
| §5 Prevention stack | **Clinical Prevention Roadmap by Decade** | g / d | 20s–70s+ × (cardiovascular / cancer screening / levers): Lp(a) once, CAC at intermediate risk, BP <130/80, screening starts, no primary-prevention aspirin 70+ | SPRINT, NordICC, NLST, ASPREE | INFOGRAPHIC | **P1** |
| §1.1 SPRINT | **SPRINT: Intensive vs Standard BP** | b | Achieved SBP 121.4 vs 136.2; primary composite **HR 0.75**, all-cause mortality **HR 0.73**; stopped early | SPRINT NEJM 2015/2021 | CHART | P2 |
| §1.3 Lifestyle BP | **Lifestyle BP-Lowering Magnitudes** | b | DASH ~5–6, DASH+low-Na up to ~11, Na alone ~2–5, weight ~1/kg, exercise ~5–8 mm Hg | Appel 1997; Sacks 2001 | CHART | P2 |
| §2.1 CAC | **CAC Score Risk Stratification** | b | "Power of zero"; CAC 101–300 ~7.7×, >300 ~9.7× event risk vs zero, independent of risk factors | MESA / Detrano NEJM 2008 | CHART | P3 |

---

## 26 — Infectious Disease & Microbiology

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §3.3 AMR | **Antimicrobial Resistance: Global Burden** | b / e | GRAM 2019: **1.27M deaths directly / 4.95M associated**; rivals HIV+malaria; named threats (MRSA, CRE, MDR/XDR-TB, C. diff, resistant gonorrhea) | Murray Lancet 2022 | CHART (+ timeline option) | **P1** |
| §4.2 Herd immunity | **Herd Immunity Threshold vs R₀** | b / g | Coverage needed rises with transmissibility; measles R₀ 12–18 needs **~95%** — falling coverage breaks first | lines 196–202 | CHART | **P1** |
| §1 Pathogens | **Five Pathogen Classes Comparison** | d / g | Bacteria / viruses / fungi / parasites / prions × biology, mechanism, therapy (antibiotics do nothing to viruses; prions untreatable) | §1 table | MATRIX | P2 |
| §4.3 Vaccines | **Vaccine-Preventable Disease Timeline** | e | Smallpox eradicated (1980), polio >99% (350k→double digits since 1988), measles resurging, HPV/HepB cancer prevention | lines 208–214 | TIMELINE | P2 |
| §5.4 Sepsis | **Sepsis: Burden + Recognition** | g / b | 48.9M cases / 11M deaths 2017 (~1 in 5 deaths); recognition signs; "every hour to antibiotics matters" | Rudd Lancet 2020 | INFOGRAPHIC | P2 *(P1 action card lives in §34)* |
| §5.2 Chronic viruses | **Chronic Viral Infections: Cure/Manage Status** | d | HIV (manage, U=U), HCV (cure >95%/8–12 wk), HepB (prevent/suppress), HPV (prevent cancer), herpesviruses (latency) | HPTN 052; Afdhal 2014 | MATRIX | P3 |

---

## 08 — Brain, Cognition & Dementia

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §1.1 Lancet 2024 | **14 Modifiable Dementia Risk Factors (PAF bar chart)** | b | Horizontal bars sorted by PAF, color-banded by life stage: hearing 7%, LDL 7%, education 5%, isolation 5%, depression 3%, TBI 3%, air pollution 3%, inactivity/diabetes/smoking/HTN 2%, vision 2%, obesity/alcohol 1% → **~45% total** | Livingston Lancet 2024 `10.1016/S0140-6736(24)01296-0` | CHART | **P1** |
| §3.3 FINGER | **FINGER: Multidomain Lifestyle Cognitive Gain** | b | Intervention composite cognition improved **~25%** more than control over 2 yr (diet+exercise+cognitive+vascular) | Ngandu Lancet 2015 `10.1016/S0140-6736(15)60461-5` | CHART | P2 |
| §6.2 Lecanemab | **Lecanemab: Marginal Benefit vs ARIA Risk** | b | CDR-SB −0.45 pts (**~27% slowing**) vs **ARIA-E 12.6% / ARIA-H 17.3%**; clinical-importance threshold line | van Dyck NEJM 2023 `10.1056/NEJMoa2212948` | CHART (waterfall) | P2 |
| §2 ACHIEVE | **ACHIEVE: Hearing Aids & Cognitive Decline** | b | Primary null; at-risk subgroup **~48% slowing** over 3 yr — hearing as a lever not just predictor | Lin Lancet 2023 `10.1016/S0140-6736(23)01406-X` | CHART | P3 |
| §6.1 Shingles | **Shingles Vaccine → Dementia (natural experiment)** | b | Regression-discontinuity at birth-date cutoff: ~3.5 pp absolute / ~20% relative dementia reduction; live vs recombinant | Eyting/Geldsetzer Nature 2025 `10.1038/s41586-025-08800-x` | CHART | P3 |

---

## 20 — Mental Health & Psychiatry

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §0 map | **Psychiatric Conditions: Prevalence & First-Line Tx** | d / g | 8 conditions × lifetime prevalence × first-line treatment (depression 15–20% CBT+AD; anxiety 20–30%; OCD 2–3% ERP; PTSD 6–8%; bipolar 1–2% lithium; schizophrenia ~1%; ADHD ~5%; eating 1–4%) | §0 table (DSM-5/GBD anchored) | MATRIX | **P1** |
| §1.3 Antidepressants | **Antidepressant Effect by Depression Severity** | b | All 21 beat placebo (Cipriani, SMD ~0.30); drug-placebo gap smallest in mild, largest in severe (Fournier); meaningful-difference line | Cipriani Lancet 2018; Fournier JAMA 2010 | CHART | **P1** |
| §3.2 Lithium | **Lithium's Unique Anti-Suicide Signal** | b | Forest/comparison: lithium reduces suicide + all-cause mortality, partly independent of mood effect; best relapse-prevention | Cipriani BMJ 2013 `10.1136/bmj.f3646`; BALANCE | CHART | P2 |
| §4.2 Antipsychotics | **Antipsychotics: Efficacy vs Metabolic Harm** | b / d | Scatter/benefit-risk: all 15 beat placebo, but weight/lipid/glucose burden → **15–20 yr reduced life expectancy** | Leucht Lancet 2013 `10.1016/S0140-6736(13)60733-3` | CHART | P2 |
| §7.1 Eating disorders | **Anorexia Nervosa Mortality (SMR 5–6)** | b | Standardized mortality ratio ~5–6× expected; among the most lethal psychiatric disorders (medical + suicide) | Arcelus Arch Gen Psych 2011 `10.1001/archgenpsychiatry.2011.74` | CHART | P3 |
| §6.4 MDMA | **MDMA-Assisted PTSD: Promise → 2024 FDA Rejection** | b / e | Large PTSD-severity reductions, many no longer meeting criteria; FDA rejected Aug 2024 (unblinding, data-integrity, abuse/CV) | Mitchell Nat Med 2021; FDA 2024 | CHART | P3 |

---

## 35 — Addiction & Substance Use

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §7.1 MAT/MOUD | **MAT/MOUD by Substance & Evidence Tier** | d / c | Opioids (methadone/bup **halve mortality**, detox-alone worse) · alcohol (naltrexone/acamprosate NNT ~12) · tobacco (varenicline 2–3×) · stimulants/cannabis (no drug → behavioral) | Sordo 2017; Jonas 2014; Cahill 2013 | MATRIX | **P1** |
| §3.4 MOUD mortality | **MOUD Halves Overdose & All-Cause Mortality** | b | In-treatment vs out-of-treatment survival; retention is the mechanism; highest-risk window post-discharge/prison | Sordo BMJ 2017 `10.1136/bmj.j1550` | CHART | **P1** |
| §0 map | **Drug Addictiveness vs Lethality Matrix** | d / b | Bubble scatter: transition-to-dependence % (tobacco 68%, opioids 23%, alcohol 22%, cocaine 21%, cannabis 9%, psychedelics very low) vs lethality, sized by prevalence | Lopez-Quintero 2011 `10.1016/j.drugalcdep.2010.11.004` | CHART | P2 |
| §2.2 Cessation | **Smoking Cessation Efficacy vs Placebo** | b | Varenicline 2–3×, combination NRT near-varenicline, cytisine non-inferior, bupropion modest; +behavioral multiplies | Cahill Cochrane 2013; Courtney JAMA 2021 | CHART | P2 |
| §4.2 Stimulants | **Stimulant UD: No Drug vs Contingency Management** | g / b | Pharmacotherapy column empty; CM = strongest evidence + 2025 mortality signal, yet under-deployed | Chan 2019; 2025 mortality cohort | INFOGRAPHIC | P3 |

---

## 21 — Pain, Injury & Rehabilitation

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §2.2 MRI overuse | **Spine MRI Findings in Pain-Free People** | b / d | Brinjikji table: disc degeneration 52%→88%, bulge 40%→69%, protrusion 31%→38%, fissure 20%→29% (age 30→60, asymptomatic) — "wrinkles on the inside" | Brinjikji AJNR 2015 `10.3174/ajnr.A4173` | CHART | **P1** |
| §1.4 Biopsychosocial | **Biopsychosocial Model of Pain** | g | 3 overlapping domains (biological / psychological / social) generating pain & disability; posture-link debunk | Gatchel Psych Bull 2007 `10.1037/0033-2909.133.4.581` | INFOGRAPHIC (Venn) | **P1** |
| §3.2 PEACE & LOVE | **Acute Soft-Tissue Injury: PEACE & LOVE (RICE retired)** | g / a | Two-phase acrostic matrix: PEACE (protect/elevate/avoid anti-inflammatory/compress/educate) → LOVE (load/optimism/vascularization/exercise) | Dubois & Esculier BJSM 2020 `10.1136/bjsports-2019-101253` | INFOGRAPHIC | **P1** |
| §1.1/1.3 | **Nociception ≠ Pain + Central Sensitization** | a / g | Decouples signal from experience (nociception w/o pain; pain w/o nociception); amplifier flipped up → hyperalgesia/allodynia | Woolf Pain 2011 `10.1016/j.pain.2010.09.030` | QUICK-SVG | P2 |
| §5.5 Multimodal | **Chronic Pain Multimodal Stack ("what helps vs what doesn't")** | g / d | Stack of modest levers (exercise, pain education, CBT/ACT, sleep, stress, non-opioid meds, social/work) vs low-value (passive tx, routine imaging, opioids) | Lin BJSM 2020 `10.1136/bjsports-2018-099878` | INFOGRAPHIC / MATRIX | P2 |
| §4.3 Return-to-activity | **Return-to-Sport: Capacity Criteria not Calendar** | g | ≥90% strength symmetry, full pain-free control, sport-specific load w/o flare, low re-injury fear; rushing at 70% drives re-injury | §4.3 | QUICK-SVG | P3 |

---

## 27 — Dermatology, Dental, ENT & Eye

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §A.5 Melanoma | **ABCDE Melanoma Detection (+ Ugly Duckling)** | a / g | Asymmetry, Border irregular, Color varied, Diameter >6 mm, **Evolving (most important)** + ugly-duckling sign; self/derm exam triggers | Abbasi JAMA 2004 `10.1001/jama.292.22.2771` | QUICK-SVG | **P1** |
| §A.5 Skin cancers | **Skin Cancer Lethality Gradient (BCC→SCC→Melanoma)** | d / g | Frequency vs behavior: BCC most common/almost never metastasizes; SCC 2nd/can metastasize; melanoma ~1% but most deaths | §A.5; Green sunscreen RCT | MATRIX | P2 |
| §D.4 Wet AMD | **Anti-VEGF Transforms Wet AMD** | b | MARINA: ~95% lost <15 letters (prevented loss), ~34% gained ≥15 letters vs sham; sudden central distortion = same-week ophthalmology | Rosenfeld NEJM 2006 `10.1056/NEJMoa054481` | CHART | P2 |
| §D.1 Myopia | **Childhood Myopia Prevention: Outdoor Time** | b / a | Guangzhou cluster-RCT: +40 min outdoor class/day over 3 yr cut new myopia; light→retinal dopamine→less axial elongation; ~2 h/day | He JAMA 2015 `10.1001/jama.2015.10803` | CHART | P3 |
| §C.3 BPPV | **BPPV: Epley Maneuver (60-second cure)** | a / c | Otoconia in semicircular canal; Dix-Hallpike dx → Epley repositioning sequence rolls them out; majority resolve single session; avoid meclizine | Hilton & Pinder Cochrane | QUICK-SVG (sequence) | P3 |
| §B.1 Fluoride | **Fluoride Toothpaste: Dose & Mechanism** | b / g | ~24% caries reduction; dose-dependent ≥1000 ppm (adult 1000–1500); spit-don't-rinse; reduce sugar frequency; fluorapatite | Marinho Cochrane 2003; Walsh 2019 | CHART | P3 |
| §D.3 Glaucoma | **Glaucoma: IOP-Lowering Preserves Sight** | b | EMGT progression 45% treated vs 62% control; IOP is both predictor AND proven lever | Heijl Arch Ophthalmol 2002 `10.1001/archopht.120.10.1268` | CHART | P3 |

---

## 43 — Developmental, Congenital & Pediatric

| Section | Figure title | Type | What it shows | Source (anchor) | Buildability | Priority |
|---|---|---|---|---|---|---|
| §6 Milestones | **Developmental Red-Flags Timeline** | e / g | Trajectory > date; language (no babble 12 mo, no words 16 mo, no 2-word 24 mo), motor (no sit 9 mo, no walk 18 mo, early hand pref); **regression always evaluate**; early eval beats wait-and-see | §6; early-intervention literature | TIMELINE | **P1** |
| §3.7 SIDS | **SIDS Prevention: Back-to-Sleep + Safe-Sleep Bundle** | a / g | Prone = ~4× risk; "Back to Sleep" 1994 halved SIDS; bundle (firm flat surface, no soft bedding, room-share not bed-share, no overheat/smoke, breastfeed, pacifier) | Gilbert IJE 2005 `10.1093/ije/dyi088` | QUICK-SVG | **P1** |
| §1.2 Chromosomal | **Trisomies & Sex-Chromosome Disorders Table** | d / g | Down (T21, 1/700, life exp 25→60 yr via care), Turner (45,X), Klinefelter (47,XXY), Edwards/Patau (usually lethal infancy) × genetics/features/prognosis | Antonarakis Nat Rev Dis Primers 2020 | MATRIX | P2 |
| §3.2 ALL | **Childhood ALL: ~0% → ~90% Cure** | b / e | 1960 near-zero → today ~90% cured via decades of cooperative multi-agent trials; survivorship late-effects caveat | Inaba/Greaves/Mullighan Lancet 2013 | CHART | P2 |
| §4 PKU | **PKU: Heel-Prick Screening → Managed Diet** | a / c | PAH defect → Phe accumulates → irreversible ID if untreated; Guthrie blood-spot (1960s) → low-Phe diet prevents entirely; tandem MS now catches dozens of IEMs | §4; newborn-screening literature | QUICK-SVG | P3 |
| §3.1 Vaccines | **Vaccine-Preventable Childhood Disease List** | g | 11 once-killer diseases (measles "immune amnesia," pertussis, diphtheria/tetanus, polio, Hib, pneumococcus, rotavirus, rubella/CRS, varicella) returning where coverage drops | §3.1; cross-ref §26 | INFOGRAPHIC | P3 |

---

## Build-Order Notes

- **Emergency action cards (§34) are the single highest-value batch** — 8 P1 procedural-SVG cards
  (CPR, BE-FAST, anaphylaxis, choking, bleeding, naloxone, sepsis, master wallet card). These are
  literally life-saving and should be built first as a coherent visual set (shared card template).
- **Spine-of-chapter charts** to build alongside: dementia 14-factor PAF bars (§08), Hallmarks wheel
  (§25), cancer-screening decision table (§07), MAT/MOUD matrix (§35), KDIGO CKD heat map (§22),
  stroke reperfusion/NNT (§24).
- **Reusable templates worth standardizing:** (1) emergency recognize→act card; (2) "trial-result
  bar with effect size + harm" chart (recurs across HF pillars, lecanemab, antipsychotics, AMD,
  glaucoma, MS, smoking cessation); (3) staging/risk matrix grid (CKD, pathogen classes, psychiatric
  conditions, MAT, chromosomal, skin cancer).
- BE-FAST appears in both §34 and §24 — build once, cross-reference (§34 owns the action card).
- Sepsis: action card = P1 in §34; the burden/epidemiology infographic in §26 is P2 (don't duplicate).
# Visual Design Spec — Practice & Drugs Cluster

> **Reviewer pass:** Visual design review of the "practice-and-drugs" chapter cluster of the
> AGFarms / Bucket Foundation health manual. Output is a **buildable spec list**, not the graphics.
> Chapters reviewed: 38 (surgery/perioperative), 39 (anesthesia/critical-care), 40 (imaging/radiology),
> 41 (pathology/lab-medicine), 28 (pharmacology-full), 10 (medical-pharmacology), 31 (regenerative-frontier),
> 30 (complementary-medicine), 32 (biohacking-fringe).
>
> **Build tooling tags:** (a) PROCEDURAL SVG (cairosvg) · (b) DATA CHARTS (matplotlib) ·
> (c) DECISION FLOWCHARTS · (d) MATRIX/HEATMAP grids · (e) TIMELINES · (f) REAL MEDIA (Wikimedia open-license) ·
> (g) INFOGRAPHIC.
> **Buildability:** QUICK-SVG / CHART / FLOWCHART / ANATOMICAL / REAL-MEDIA / COMPLEX.
> **Priority:** P1 (must-have, high-leverage) · P2 (strong) · P3 (nice-to-have).
>
> ⭐ **Flagship P1 of the whole cluster:** §41 *Bayes / pre-test-probability worked example* — the
> PPV-collapses-at-low-prevalence visualization. This is the single most leverage-dense figure in the
> manual; build it first.

---

## §40 — Diagnostic Imaging & Radiology

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 40-1 | **Imaging-modality comparison matrix** | d | Modalities (X-ray, fluoro, CT, US, MRI, nuclear, PET, DEXA, mammo, angio) as rows × columns: physics, what-it-sees-best, radiation dose, relative cost, best-for, key limit. Color-coded radiation column (green=none → red=highest). | §40.2 master table | MATRIX | **P1** |
| 40-2 | **Radiation dose in context (mSv bar chart)** | b | Horizontal log-scale bars: dental/DEXA ~0.001 → CXR 0.02 → mammo 0.4 → CAC 1 → head CT 2 → **background 3/yr (reference line)** → chest CT 5–7 → abdo/pelvis 8–10 → FDG-PET 15–25. Anchor annotations (flight, years-of-background). | §40.3.1 dose table | CHART | **P1** |
| 40-3 | **The four physics principles of imaging** | g/a | Four-panel infographic: ionising EM (X-ray/CT) · mechanical wave (US) · magnetic resonance (MRI) · radioactive decay (nuclear/PET) — each with the probe→tissue→signal idea and the hazard note ("image and hazard are the same photon"). | §40.1 | QUICK-SVG | P2 |
| 40-4 | **Incidentaloma prevalence heatmap** | d | Grid: modality/organ × prevalence-of-incidental-finding and × malignancy-rate-within-finding. Highlights cardiac MRI/chest CT >⅓; renal/thyroid/ovarian ~25%, breast ~42%. | §40.4 (O'Sullivan/Ioannidis) | MATRIX | P2 |
| 40-5 | **Image a question, not a body — decision flow** | c | Flowchart: symptom/clinical question? → which physical question → matched modality (bone/trauma→CT, soft-tissue→MRI, fetus/repeat→US, metabolism→PET); asymptomatic "checkup" branch → STOP (incidentaloma cascade). | §40.9, §40.8 | FLOWCHART | P2 |
| 40-6 | **CT cancer-burden: cohort + population projection** | b | Twin-panel bar: childhood-CT excess cancer (Mathews +24%, EPI-CT ERR ~1.96/100mGy) and Smith-Bindman 2025 (~93M scans → ~103k projected cancers, ~5% of dx). Labelled "modelled, not body count." | §40.3.2 | CHART | P3 |

---

## §41 — Pathology & Laboratory Medicine  *(the test-performance P1 cluster)*

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 41-1 | ⭐ **Bayes worked example — PPV collapses at low prevalence** | g+b | The flagship. The 99%-sens/99%-spec test on 1-in-1,000 disease, 100,000 screened: 100 true cases → 99 TP; 99,900 well → 999 FP; **1,098 positives, only 99 real → PPV ≈ 9%.** Show as a 100k-dot/icon array or proportional block diagram + the arithmetic, then the contrast panel (1-in-10 clinic → PPV >90%). "Same test, opposite meaning." | §A.4 | COMPLEX (icon-array infographic) | **P1** |
| 41-2 | **The 2×2 confusion table** | a/d | TP/FP/FN/TN grid with the column-reads (sens/spec, "down the columns = property of test") vs row-reads (PPV/NPV, "across the rows = meaning for you"). Annotated SnNout / SpPin. | §A.1–A.3 | QUICK-SVG | **P1** |
| 41-3 | **PPV-vs-prevalence curve** | b | Line chart: PPV (y) against disease prevalence/pre-test probability (x, log), one curve per sens/spec pair (e.g. 99/99, 95/95, 90/90). Marks the 1-in-1,000 and 1-in-10 points from 41-1. The mathematical spine of "screening low-prevalence floods false positives." | §A.4 | CHART | **P1** |
| 41-4 | **Likelihood-ratio (Fagan) nomogram** | a | Classic three-axis nomogram: pre-test probability → LR → post-test probability, with the LR field guide (>10 conclusive ↑, <0.1 conclusive ↓, ~1 useless) as a side legend. | §A.5 | QUICK-SVG | **P1** |
| 41-5 | **Reference-range false-positive math** | b | Bar/curve: probability ≥1 abnormal flag = 1 − 0.95ⁿ as panel size grows; 14 analytes ≈ 51%, 20 ≈ 64%. "More than half of healthy people 'fail' a broad panel by statistics alone." | §A.7 | CHART | **P1** |
| 41-6 | **ROC curve + AUC interpretation** | b | Sensitivity vs 1−specificity, several curves (AUC 0.5 diagonal, 0.7 modest, 0.9 excellent), with the threshold-as-policy-choice annotation. | §A.6 | CHART | P2 |
| 41-7 | **Lab-category map (table-as-grid)** | d | Categories (CMP, glycemic, LFT, kidney, lipids, CBC, inflammatory, endocrine, tumor markers, coagulation, UA, histopath) × core tests / what it tells you / honest caveat. | §B.1 | MATRIX | P2 |
| 41-8 | **The cascade — how one false positive cascades** | c/g | Flow: broad panel on low-pre-test person → false flag (low PPV) → repeat → imaging → specialist → biopsy (complication risk) → overdiagnosis/anxiety. The "cost of more." | §A.9 | FLOWCHART | P2 |

---

## §28 — Pharmacology (Full) & Pharmacogenomics

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 28-1 | **Dose-response + therapeutic-index curve** | b | Two sigmoid log-dose curves (benefit Emax + toxicity), the **therapeutic window** shaded between ED50 and TD50; wide-TI (penicillin) vs narrow-TI (warfarin/digoxin/lithium) inset. "The dose makes the poison." | §A.1.4 | CHART | **P1** |
| 28-2 | **ADME journey of a drug** | g/a | Pipeline infographic: Absorption (route + first-pass via portal/liver) → Distribution (protein binding, BBB, fat) → Metabolism (CYP Phase I/II) → Excretion (kidney). | §A.2 | QUICK-SVG | **P1** |
| 28-3 | **CYP450 interaction matrix** | d | Big-four enzymes (3A4/5, 2D6, 2C19, 2C9) × rows: share of metabolism, key substrates, strong inhibitors, classic inducers. Grapefruit + St. John's Wort flagged. | §A.2.3 | MATRIX | **P1** |
| 28-4 | **Pharmacogenomics actionable gene-drug grid** | d | The CPIC table as a heatmap: gene × drug × what-the-variant-does × clinical-action × evidence-tier (CYP2C19/clopidogrel, CYP2D6/codeine, CYP2C9+VKORC1/warfarin, TPMT-NUDT15/thiopurines, DPYD/5-FU, SLCO1B1/simvastatin, HLA-B*57:01/abacavir, HLA-B*15:02/carbamazepine, G6PD). | §C.3 | MATRIX | **P1** |
| 28-5 | **Metabolizer-phenotype × prodrug-inversion** | d/g | 2-axis grid: phenotype (PM/IM/NM/UM) × drug-type (active drug vs prodrug), cells showing the inversion (PM = toxicity for active, failure for prodrug; UM = failure for active, **overdose** for prodrug — codeine deaths). | §C.2 | MATRIX | P2 |
| 28-6 | **Half-life & steady state curve** | b | Concentration-time: ~4–5 half-lives to plateau on repeat dosing and same to wash out; loading-dose overlay. | §A.2.4 | CHART | P2 |
| 28-7 | **Agonist spectrum** | a | Receptor-activation continuum: inverse agonist (below baseline) — antagonist (0) — partial agonist (submaximal ceiling) — full agonist (Emax); allosteric modulator as side-binding. | §A.1.2 | QUICK-SVG | P2 |
| 28-8 | **Placebo / nocebo as endogenous pharmacology** | g | Two-sided diagram: placebo (expectation → endogenous opioid/dopamine, naloxone-reversible; dose-response of ritual) vs nocebo (negative expectation → real symptoms, SAMSON ~90% on placebo). | Part E | INFOGRAPHIC | P2 |

---

## §10 — Medical & Pharmacology

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 10-1 | **GLP-1 trial outcomes chart** | b | Grouped bars: STEP-1 −14.9% weight, SURMOUNT-1 −20.9%, SELECT −20% MACE, FLOW −24% kidney events — surrogate (weight) vs hard-outcome (MACE/renal) coded differently. | §1.2 | CHART | **P1** |
| 10-2 | **Statin NNT: primary vs secondary prevention** | b/g | Icon-array / bar contrast: large absolute benefit (low NNT) in secondary prevention vs small (high NNT, tens–hundreds) in primary — "same pill, baseline risk is the story." | §2.2 | CHART | P2 |
| 10-3 | **ASPREE — the clean "stop"** | b | Three-panel: disability-free survival (no benefit), CV events (no reduction), major hemorrhage (↑), all-cause mortality (slightly ↑). The negative-result figure. | §4 | CHART | P2 |
| 10-4 | **Geroprotector evidence grid** | d | Drug (metformin, rapamycin, SGLT2i, acarbose) × approved-use × best-evidence-tier-for-aging × honest verdict. Heatmap: only SGLT2i has hard human outcomes (for disease, not aging). | §6 table | MATRIX | P2 |
| 10-5 | **Interventions ranked by hard-outcome evidence** | g | Ladder/pyramid: proven large benefit → proven negative (stop) → deficiency-only → experimental/off-label → no-evidence. Inverts the marketing-loudness order. | §8 | INFOGRAPHIC | P2 |
| 10-6 | **Vaccines as longevity medicine** | d | Vaccine × target × beyond-target signal × tier (Shingrix→dementia, flu→CV, pneumococcal, RSV). | §5 table | MATRIX | P3 |

---

## §38 — Surgery & Perioperative Medicine

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 38-1 | **Surgery verdict map (operation × honest verdict)** | d | The §0 master table as a heatmap: representative operations × verdict band (transformative / genuinely effective / over-sold / debunked-vs-sham), with best-evidence anchor. | §0 | MATRIX | **P1** |
| 38-2 | **Sham-surgery results chart** | b | The canonical failures: knee arthroscopy (Moseley), meniscectomy (FIDELITY), vertebroplasty (Buchbinder/Kallmes), PCI for stable angina (ORBITA) — real vs sham, effect difference ≈ 0. Mechanism ≠ outcome made visual. | §2.2 | CHART | **P1** |
| 38-3 | **Open vs laparoscopic vs robotic** | d | Access-axis matrix: invasiveness, recovery, cost, OR time, evidence-for-better-outcomes. Robotic = equivalent-but-pricier (ROLARR) called out. | §1 robotic | MATRIX | P2 |
| 38-4 | **The named over-uses (reflex → honest evidence)** | d/g | Grid: over-use × "the reflex" × "the honest evidence" × corpus location (knee scope, spinal fusion, vertebroplasty, stent-for-stable, robotic, C-section past threshold). | §5 table | MATRIX | P2 |
| 38-5 | **Bariatric surgery outcomes** | b | STAMPEDE diabetes-remission rates (surgery vs medical) + SOS mortality reduction — "most effective obesity/diabetes intervention we have." | §3 bariatric | CHART | P2 |
| 38-6 | **Questions before any elective operation** | c/g | Decision/checklist flow: natural history? symptoms-survival-or-picture? best blinded evidence for MY indication? real trial of non-surgical? surgeon/centre volume? prehab window? Emergency branch = skip (speed is the treatment). | §5 questions | FLOWCHART | P2 |

---

## §39 — Anesthesiology & Critical Care

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 39-1 | **Anesthesia types map** | d/g | GA / spinal / epidural / peripheral nerve block / local / sedation × what's switched off × how given × typical use × patient state. | §2.1 table | MATRIX | P2 |
| 39-2 | **The sedation continuum** | a | Spectrum bar: local → light sedation → deep sedation → general anesthesia as one dial, with the "unintentionally too deep, not breathing" danger zone marked. | §2.1 note | QUICK-SVG | P2 |
| 39-3 | **Anesthesia-attributable mortality decline** | b/e | Drop from ~357/million (pre-1970s) → ~34/million (1990s–2000s) → ~1-in-100,000 healthy patients; annotate the drivers (oximetry, capnography, difficult-airway algorithm). | §2.5 | CHART | P2 |
| 39-4 | **The sepsis evidence that turned over** | e | Timeline: 2001 Rivers EGDT (celebrated) → 2014–15 ProCESS/ARISE/ProMISe (deflation, no benefit) → 2021 Surviving Sepsis (keep the simple core). "The signal survived; the ritual didn't." | §6 | TIMELINE | **P1** |
| 39-5 | **ICU organ-substitution map** | d/g | Failing organ (lungs/circulation/kidneys/brain/metabolic) × the support (vent/ECMO, vasopressors, dialysis/CRRT, etc.) × "what it's honestly doing = buying time." | §5 table | MATRIX | P2 |
| 39-6 | **Less-is-more in critical care** | b | Paired bars of the RCT wins where gentler beat aggressive: ARDSNet low-tidal-volume (~9pp mortality ↓), PROSEVA proning, RECOVERY dexamethasone. | §5.1 | CHART | P2 |
| 39-7 | **Delirium prevention bundle (HELP / ABCDEF)** | g | Infographic of the low-tech bundle elements; note antipsychotics don't work, the bundle does. Highest-yield literacy topic. | §7 | INFOGRAPHIC | P3 |

---

## §31 — Regenerative Medicine & the Longevity Frontier

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 31-1 | **Regenerative-medicine evidence-stage ladder** | d | The §1 master table as a heatmap: intervention × best-evidence-stage (meta/rct/cohort/animal/invitro/anecdotal/speculative) × honest status. Top = regulator-approved hard endpoints; bottom = paying for a story. | §1 table | MATRIX | **P1** |
| 31-2 | **The four-beat structure of the field** | g | Cycle/flow infographic: (1) striking biology → (2) spectacular mouse result → (3) brutal translation gap → (4) predatory clinic filling the gap. "Clinic shows you the Nobel, sells you the infusion." | §0 | INFOGRAPHIC | **P1** |
| 31-3 | **Gene-therapy price reality** | b | Bar chart of the most-expensive-drug-ever launches: Zolgensma ~$2.1M, Casgevy ~$2.2M, Hemgenix ~$3.5M, Lenmeldy ~$4.25M; access/equity annotation. | §3.3 | CHART | P2 |
| 31-4 | **PRP — marketing vs evidence (RESTORE)** | b | Pain/cartilage outcomes: intra-articular PRP vs saline placebo at 12 mo (no difference). "Sold as regeneration; matches placebo." | §6.1 | CHART | P2 |
| 31-5 | **Frontier honesty through-line** | d | Domain × {striking biology / mouse result / the gap / the predatory fill} — the §8 summary grid showing gene therapy as the lone gap-crossing column. | §8 table | MATRIX | P2 |
| 31-6 | **Predatory stem-cell-clinic red-flags** | g/c | Checklist infographic: cash-only + long unrelated condition menu + not on ClinicalTrials.gov + "regeneration" of tissue cells don't build = predatory tier. | §2.3 | INFOGRAPHIC | P3 |

---

## §30 — Complementary & Alternative Medicine

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 30-1 | **CAM modality verdict heatmap** | d | The §1 verdict table as a color grid: modality × best-evidence-indication × verdict (works / works-for-some / placebo-level / no-evidence / harmful). The chapter in one image. | §1 table | MATRIX | **P1** |
| 30-2 | **Alternative-instead-of vs alongside — cancer survival** | b | The killer number: 5-yr survival 55% (alternative-only) vs 78% (conventional); HR 2.50 overall, 5.68 breast; effect vanishes once treatment-refusal is accounted for. | §9.3 (Johnson) | CHART | **P1** |
| 30-3 | **Acupuncture effect sizes (Vickers IPD)** | b | Two bars: vs no-treatment ~0.5 SD vs vs-sham ~0.2 SD — "most of the benefit is ritual, a sliver is the needle." | §2 | CHART | P2 |
| 30-4 | **Placebo is real but bounded** | g | Split infographic: subjective/brain-mediated outcomes (pain, nausea, mood — placebo moves these) vs objective/pathology (tumors, infection, HbA1c, fractures — placebo does NOT). Hróbjartsson & Gøtzsche. | §9.1 | INFOGRAPHIC | P2 |
| 30-5 | **Heavy-metal contamination in Ayurvedic products** | b | Bar: ~1 in 5 products with detectable lead/mercury/arsenic; ~40% for rasa shastra. "Natural ≠ safe." | §4 (Saper) | CHART | P3 |

---

## §32 — Biohacking & Fringe Interventions

| # | Figure title | Type | What it shows | Source (content) | Buildability | Priority |
|---|---|---|---|---|---|---|
| 32-1 | **The biohacking verdict matrix** | d | The big §0 table as a heatmap: intervention × verdict band (REAL / PROMISING / PLACEBO-LEVEL / NO-EVIDENCE / POTENTIALLY-HARMFUL) across peptides, light, HBOT, cryo, IV drips, detox cluster, fringe biophysics, nootropics. | big verdict table | MATRIX | **P1** |
| 32-2 | **The laundering gap (concept diagram)** | g | The chapter's central idea: real mechanism / mouse-or-cell result → [LAUNDER] → sold as human outcome it never earned. Worked examples (BPC-157 rat tendon → "heals you"; HBOT telomere n=35 → "reverses aging"; NAD+ up → "recharge"). | §10 | INFOGRAPHIC | **P1** |
| 32-3 | **The anecdote engine** | g | Four-bias infographic: survivorship + lifestyle-bundling + regression-to-the-mean + placebo — why "it changed my life" testimonials mislead; n=1 can't see small effects or longevity. | §10 / honesty-rule 4 | INFOGRAPHIC | P2 |
| 32-4 | **Dose-sold ≠ dose-studied** | g/b | Template figure (reusable across cryo, red-light, NAD, cold): the protocol that produced any human signal vs the protocol being marketed. PBM biphasic dose-response curve as the concrete example. | honesty-rule 3; §2 | CHART/INFOGRAPHIC | P2 |
| 32-5 | **GH/IGF-1 longevity own-goal** | a/g | Lever diagram: longevity genetics says LOW GH/IGF-1 extends life (dwarf/GHR-KO, low-IGF1 long-lived) ← → GH-secretagogues push the lever the WRONG way. | §1.3 | QUICK-SVG | P3 |

---

## Summary statistics

- **Total figures specified:** 49 across 9 chapters (5–8 per chapter).
- **Priority breakdown:** P1 = 15 · P2 = 27 · P3 = 7.
- **Type/tooling breakdown (primary tag):**
  - (d) MATRIX/HEATMAP — 19 (dominant; this cluster is verdict-tables and comparison grids)
  - (b) DATA CHARTS — 16
  - (g) INFOGRAPHIC — 9 (laundering gap, four-beat, placebo-bounded, anecdote engine, etc.)
  - (a) PROCEDURAL SVG — 6 (2×2 table, Fagan nomogram, ADME, agonist spectrum, sedation continuum)
  - (c) FLOWCHART — 4 (often paired with d/g)
  - (e) TIMELINE — 2 (sepsis turnover, anesthesia-mortality decline)
  - (f) REAL MEDIA — 0 (none load-bearing; the cluster is conceptual/quantitative, not anatomical-photo)
- **Buildability:** most are CHART or MATRIX (fast). The flagship 41-1 (Bayes icon-array) is the one COMPLEX build.
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
# Visuals Spec — META / Personalization / Calibration cluster

> **Reviewer pass, 2026-06-29.** Buildable graphics/diagram specs for the META cluster:
> `sections/04-individual-variation.md`, `sections/46-practitioner-claims-vs-evidence.md`,
> `sections/06-go-deeper-library.md`, plus `04-protocols/WHAT-TO-TRACK-SYNTHESIS.md` and
> `06-evidence/CONFLICTS-REGISTER.md`.
>
> **This is a spec list, not the graphics.** Each row is buildable from the cited corpus content.
>
> **Build tooling tags:** (a) PROCEDURAL SVG (cairosvg) · (b) DATA CHARTS (matplotlib) ·
> (c) FLOWCHARTS · (d) MATRIX/HEATMAP · (e) TIMELINES · (f) REAL MEDIA · (g) INFOGRAPHIC.
> **Buildability:** QUICK-SVG / CHART / FLOWCHART / ANATOMICAL / REAL-MEDIA / COMPLEX.
> **Priority:** P1 (signature/must-build) · P2 (high-value) · P3 (nice-to-have).

---

## A. WHAT-TO-TRACK-SYNTHESIS.md (the actionable capstone)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| A1 | **"What To Track" tiered panel** (the flagship) | (g) INFOGRAPHIC + (d) | Two stacked panels — **WHAT TO MEASURE** and **WHAT TO DO** — each split into Tier A / B / C bands. Measure side: VO2max, grip/gait/chair-rise/balance, apoB, Lp(a)-once, HbA1c/HOMA-IR, DEXA-BMD (A); hsCRP, DEXA body-comp, HRV, sleep tracker, IGF-1 (B); biological-age clocks, CGM-healthy, microbiome-age (C). Functional tests vs blood markers visually grouped. Pairs with Start Here. | WHAT-TO-TRACK PART 1 + PART 2 (all tier tables, claim-ids) | COMPLEX | **P1** |
| A2 | **The levers, by confidence tier** (stacked do-this card grid) | (g) INFOGRAPHIC | Tier A levers (don't smoke, VO2max, strength, move more, apoB, sleep 7h, metabolic profile) as bold cards; Tier B (Zone2/HIIT, sauna, protein, TRE, light, CR, breathing) muted; Tier C (senolytics, NAD+, metformin/rapa, reprogramming, cold plunge, CGM, seed-oil) as faded/"experiments." Color = confidence. | PART 1 Tier A/B/C tables | CHART/COMPLEX | **P1** |
| A3 | **Functional-test "free at-home" panel** | (g) INFOGRAPHIC | Icon row of the cheap functional predictors: grip, gait speed, chair-rise, 10-sec one-leg stance, sit-to-rise. Each with what it predicts + "biomarker not lever" footnote. | PART 2 Tier A; `physical-capability-battery-mortality-meta`, `araujo one-leg`, sit-to-rise (Brito, §46) | QUICK-SVG | P2 |
| A4 | **Dose-response: steepest at the low end** | (b) DATA CHART | Schematic curve — mortality risk vs activity dose, steepest drop sedentary→some, flattening at top (annotate resistance J-shape peak ~30–60 min/wk). Embodies Rule 3. | `physical-activity-dose-response-mortality`, `resistance-training-mortality-meta` (J-shape) | CHART | P2 |
| A5 | **Predictor vs lever sorting card** | (a) PROCEDURAL SVG | Two-column split: PREDICTORS (grip, gait, HRV, hsCRP, clocks — "tells you risk") vs LEVERS (apoB, VO2max, strength, sleep — "change it, changes outcome"). The single causal blood lever (apoB) highlighted. | PART 2 honesty rule 1; PART 1 Tier A | QUICK-SVG | **P1** |

---

## B. 04-individual-variation.md (personalization / body-type)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| B1 | **HERITAGE responder distribution** | (b) DATA CHART | Histogram/density of VO2max change across ~480 subjects on the identical 20-wk program: mean ~+19%, spread from ~0 to +40–50%, a thin adverse-responder tail. Same program, huge variance. The motivating chart. | §2.1; Skinner 2001 `10.1152/jappl.2001.90.5.1770`, Bouchard `10.1152/jappl.1999.87.3.1003` | CHART | **P1** |
| B2 | **Long vs short femur squat mechanics** | (a) PROCEDURAL SVG (ANATOMICAL) | Side-by-side stick-skeleton squat: long-femur lifter (forward torso lean, wider stance, heeled shoe, bar-over-midfoot) vs short-femur/long-torso (upright). Honest, anti-somatotype — "set technique to your skeleton." | §1.2a; Ferland & Laurier `10.70252/wktf5547` | ANATOMICAL | **P1** |
| B3 | **Leverage → lift advantage matrix** | (d) MATRIX | Rows = build (long arms/long torso, short limbs/long torso, long femur); columns = squat / bench / deadlift; cells = advantage/disadvantage. "Expect uneven lifts by build." | §1.2a | QUICK-SVG | P2 |
| B4 | **Somatotype: what's real vs sold** | (g) INFOGRAPHIC | The 4-row debunk table as a verdict graphic: "you ARE a type" (false), "predicts temperament" (debunked), "dictates diet/macros" (no evidence), "describes current physique" (trivially true). Verdict-badge styling. | §1.1 debunk table | QUICK-SVG | P2 |
| B5 | **Sex × life-stage personalization matrix** | (d) MATRIX/HEATMAP | Rows = woman pre-menopause / peri-post-menopause / aging man / 65+ ; columns = key levers (strength, VO2max, protein, BMD-tracking, HRT/TRT caveat, balance/power). Cells flag "main event" vs "overclaimed." Mirrors the one-screen summary. | §3, §4, §6 one-screen summary | COMPLEX | **P1** |
| B6 | **The age inversion** | (a) PROCEDURAL SVG / (e) | Timeline/arc across life stages (youth "build the peak" → midlife "defend it" → 65+ "matters MORE"), with strength/power/protein/balance importance rising, not tapering, with age. | §4.1–4.3 | QUICK-SVG | P2 |
| B7 | **Regression ladder: train around bad joints** | (c) FLOWCHART | Three lanes (knees / lower back / shoulders): "don't skip → regress to" with the substitution list, keeping the movement pattern. Pain-free-range principle. | §5.1 regression table | FLOWCHART | P2 |
| B8 | **Menstrual-cycle periodization: claimed vs evidence** | (a) PROCEDURAL SVG | Confidence gauge — "sync training to cycle" sold HIGH, graded TRIVIAL/low-certainty (McNulty, Colenso-Semple). Contrast with menopause levers (real). | §3.2; McNulty `10.1007/s40279-020-01319-3`, Colenso-Semple `10.3389/fspor.2023.1054542` | QUICK-SVG | P3 |

---

## C. 46-practitioner-claims-vs-evidence.md (the claim-checker)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| C1 | **The Calibration Spectrum** (THE signature graphic) | (b) DATA CHART / (g) | Ranked horizontal ladder of all 13 voices from most corpus-aligned (Galpin, Kaeberlein, clock-builders) to most over-skied (Sinclair, Taubes, Johnson). Position = calibration, not direction. Annotate "boring core = gold / branded frontier = skis out." | §"Calibration Spectrum" rank table (ranks 1–13) | CHART/COMPLEX | **P1** |
| C2 | **Agree / Overstate / Contradict stacked bar per practitioner** | (b) DATA CHART | Horizontal 100%-stacked bars, one per voice, segments = AGREES / OVERSTATED / CONTRADICTS counts (Galpin ~9/2/0, Attia 12/6/0, Huberman 6/11/0, Rhonda 13/8/0, Sinclair 0/most/1, movement 9/9/3, etc.). | Rank table counts | CHART | **P1** |
| C3 | **Consolidated verdict donut** (the shape is the story) | (b) DATA CHART | Donut/bar of the ~139-claim split: AGREES ~37%, OVERSTATED ~37%, CONTRADICTS ~8%, NOT-YET-IN-CORPUS ~15%. Headline: "overstatement is as common as agreement; flat contradiction is rare." | Consolidated tallies table | CHART | **P1** |
| C4 | **The two universal failure modes** | (c) FLOWCHART | Two parallel pipelines: (1) predictor→lever ("marker predicts death" → unproven "moving it prevents death") and (2) mechanism→outcome ("activates X in a cell/mouse" → unearned "delivers human outcome"). Example claims hung off each. | §"two universal failure modes" tables | FLOWCHART | **P1** |
| C5 | **"How to listen to a health podcast" checklist** | (g) INFOGRAPHIC | The 5 real-time questions as a numbered checklist card: mechanism-or-outcome? predictor-or-lever? dose-match? sponsor? confidence-vs-tier? + the meta-rule. Standalone shareable. | §"Practical takeaway" 5 questions | QUICK-SVG | **P1** |
| C6 | **The most-laundered claim (cold→dopamine)** | (a) PROCEDURAL SVG | Anatomy of one laundering: acute +250% dopamine / +530% NE *measured in the water* → arrow → prohibited leap to "durable mood/focus/longevity." Plus the dose-twin (hours of mild cold ≠ 3-min plunge). | §"single most-laundered claim"; `cold-norepinephrine-thermogenesis-mechanism` | QUICK-SVG | P2 |
| C7 | **Kaeberlein vs Sinclair — the rigor gradient** | (d) MATRIX | Side-by-side comparison rows (NAD, rapamycin, metformin, supplements, resveratrol, COI, corpus verdict) — the anti-Sinclair. 5 AGREES vs 0-agree/mostly-overstated. | §"Kaeberlein as the anti-Sinclair" table | QUICK-SVG | P2 |
| C8 | **The 11 hard contradictions** | (g) INFOGRAPHIC | Compact card list of the contradicted claims (resveratrol, CGM-healthy, carb-insulin model, calorie-is-a-calorie, keto-superiority, N=1 generalize, posture-causes-pain, stretching-prevents-injury, static-stretch-warmup, WHM-anywhere ⚠️, seed oils) each with who + what it loses to. | §"hard contradictions" table | QUICK-SVG | P2 |
| C9 | **NOT-YET-IN-CORPUS: where practitioners are ahead** | (g) INFOGRAPHIC | The 10 promote-worthy leads as "frontier" cards (UPF/Hall, omega-3↔aging, fructose→urate, Søberg cold dose, caffeine timing, triage theory, sit-to-rise, CD38, Dog Aging rapamycin, Hispanic paradox). Net-additive framing. | §"Where practitioners are RIGHT" table | QUICK-SVG | P3 |

---

## D. 06-go-deeper-library.md (the reference library)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| D1 | **Beginner → Advanced reading-path flowchart** | (c) FLOWCHART | Per-topic 3-node paths (B accessible → I synthesis → A primary source + open conflict) for the 8 topics (longevity, exercise, strength/back, nutrition, sleep, breath, thermal, biomarkers, foundation). Always ends at a primary source + a conflict. | §7 reading paths | FLOWCHART | **P1** |
| D2 | **Evidence-posture tag legend** (design-system key) | (a) PROCEDURAL SVG | The 5 posture tags as consistent badges: rigorous-scientist / translator / communicator(grade-the-primary) / contested / practitioner-N=1, each with "how to weight them." Becomes the cross-cutting people-badge. | §"How to read the tags" table | QUICK-SVG | **P1** |
| D3 | **The funding fault line** (3 paradigms of aging) | (a) PROCEDURAL SVG / (c) | Three-column map: geroscience (slow aging) vs damage-repair/SENS (engineering) vs reprogramming (Altos/Retro) — "different theories of what aging is." Funders mapped under each. | §6.3 funding fault line | QUICK-SVG | P2 |
| D4 | **Industry reality-check scoreboard** | (d) MATRIX | Companies (Altos, Calico, Unity, Loyal, Retro/NewLimit/BioAge) × thesis × reality (no product / 10yr little output / Phase-2 failed / FDA-dog-first / early). "Letterhead ≠ evidence." | §6.2 industry table | QUICK-SVG | P2 |
| D5 | **The honest workflow loop** (podcast → primary source) | (c) FLOWCHART | The meta-rule loop: podcast/discovery → find named study → read abstract/Methods → check CONFLICTS-REGISTER → grade. "If a host won't name the study, downgrade." | §4 meta-rule | FLOWCHART | P2 |
| D6 | **Books-by-topic shelf with caveat badges** | (g) INFOGRAPHIC | The book table as a visual "shelf" grouped by topic, each spine carrying its tier + a one-word caveat flag (overstated / COI / contested / wisdom). | §1.1–1.8 book tables | COMPLEX | P3 |

---

## E. CONFLICTS-REGISTER.md (the open-questions map)

| # | Figure title | Type | What it shows | Source | Buildability | Priority |
|---|---|---|---|---|---|---|
| E1 | **The conflicts register as a visual** (29 objects) | (d) MATRIX/HEATMAP | All 29 conflicts as a grid/wall, color-coded **open (15)** vs **partially/mostly-resolved (14)**, grouped by domain. The "open questions" landscape at a glance. (Note: register says 29; the library prose cites "38 open questions"/"29 conflict objects" — reconcile to 29 from the register, flag the 38 discrepancy.) | CONFLICTS-REGISTER table (29 rows, status legend) | COMPLEX | **P1** |
| E2 | **The handful worth tracking** | (g) INFOGRAPHIC | The 9 highlighted "watch these — resolving them moves the protocol" conflicts (protein/mTOR, NAD+, which-clock, sleep-causality, sauna-healthy-user, CR/drug translation, microbiome, Zone2, free-radical) as cards with "Side A vs Side B / Watch:". | go-deeper §5 + register rows | QUICK-SVG | P2 |
| E3 | **Open vs resolved status bar** | (b) DATA CHART | Simple split bar: 15 open / 14 partially-resolved / 0 closed — with the "never closed" rule annotated. | register status legend | CHART | P3 |
| E4 | **Anatomy of a conflict object** (Side A vs Side B template) | (a) PROCEDURAL SVG | One worked example (e.g. protein↔mTOR) showing the conflict-card template: claim, Side A + evidence tier, Side B + evidence tier, status, "watch." Reusable per-conflict template. | register row 16 + SCHEMA | QUICK-SVG | P2 |

---

## CROSS-CUTTING / RECURRING TEMPLATES (design-system elements)

These should render in **one consistent style across every chapter** of the manual. They are not one-off
figures — they are reusable components. Recommend building them first as an SVG component kit, then reusing.

| Template | Type | What it is | Where it recurs | Priority |
|---|---|---|---|---|
| **Evidence-tier badge** | (a) QUICK-SVG | A small pill encoding the corpus tier (anecdotal / cross-sectional / cohort / mechanistic / animal / rct / meta / consensus / statement). Fixed color ramp, weakest→strongest. | Every claim, table cell, reading path, library entry across all chapters. | **P1** |
| **Verdict scale** | (a) QUICK-SVG | A 4-stop scale badge: AGREES → OVERSTATED → CONTRADICTS → NOT-YET-IN-CORPUS (used in §46), and the parallel False/Debunked/No-evidence/Trivially-true scale (§04 somatotype). One shared visual grammar. | §46 every verdict; §04 debunk table; conflict statuses. | **P1** |
| **Predictor-vs-lever icon pair** | (a) QUICK-SVG | Two paired glyphs: a gauge (predictor: "tells you risk") and a switch/handle (lever: "change it, changes outcome"). The three-honesty-rules motif. | WHAT-TO-TRACK, §46 failure mode 1, every "predictor ≠ lever" mention. | **P1** |
| **Mechanism-vs-outcome icon pair** | (a) QUICK-SVG | Paired glyphs: a cell/spark (mechanism) → a person/lifespan (outcome), with the "leap" arrow that marks the unearned upgrade. | §46 failure mode 2, go-deeper one-paragraph, every "mechanism ≠ outcome" mention. | **P1** |
| **Evidence-posture people badge** | (a) QUICK-SVG | The 5-tag person badge (rigorous / translator / communicator / contested / practitioner-N=1) — see D2. Consistent across people tables. | §06 people/podcast tables, §46 practitioner names, §04 go-deeper. | **P1** |
| **Per-chapter "key levers" sidebar** | (g) INFOGRAPHIC | A standard right-rail card listing each chapter's 3–5 highest-leverage takeaways with tier badges. Same layout every chapter. | All chapters. | P2 |
| **Conflict-card template** | (a) QUICK-SVG | Side A / Side B / status / "watch" layout (see E4) — reused for every conflict object referenced anywhere. | §46, §06, CONFLICTS, any chapter citing a conflict. | P2 |
| **Dose-match flag** | (a) QUICK-SVG | A small ⚠️ "studied dose ≠ sold dose" stamp (cold plunge, sauna IR-vs-traditional, etc.). | §46, WHAT-TO-TRACK Tier C, thermal sections. | P2 |
| **Rule-3 "something beats nothing" motif** | (a) QUICK-SVG | A recurring mini-curve glyph marking the steepest-at-the-low-end idea. | WHAT-TO-TRACK, §04 §5.3, dose-response figures. | P3 |

---

### Notes for the builder
- **Reconcile discrepancy:** go-deeper prose says "29 conflict objects (15 still fully open)" and elsewhere
  the brief mentions "38 open questions"; the CONFLICTS-REGISTER is authoritative at **29 conflicts / 15 open /
  14 partial**. Build E1 from the register; flag any 38 reference for correction.
- **Counts in §46 are approximate** ("~9", "~52", split verdicts counted by dominant verdict) — render bars
  with the tilde/"approx" treatment, don't imply false precision.
- Build the **cross-cutting templates first** (tier badge, verdict scale, predictor/lever + mechanism/outcome
  icon pairs, posture badge) — A1, C1, C2, B5 and most infographics consume them.
