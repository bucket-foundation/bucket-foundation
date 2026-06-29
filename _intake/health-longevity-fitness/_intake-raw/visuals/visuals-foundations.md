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
