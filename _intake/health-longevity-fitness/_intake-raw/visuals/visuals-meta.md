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
