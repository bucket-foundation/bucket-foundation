# Movement / Strength / Breath / Sport — Practitioner Claims vs Corpus Evidence

> **Wave:** YouTube transcript wave — MOVEMENT / STRENGTH / BREATH / SPORTS practitioners.
> **Date:** 2026-06-29. **Author cluster:** Kelly & Juliet Starrett (mobility), Stuart McGill (spine),
> Pavel Tsatsouline (strength/kettlebell), Ido Portal (movement), Patrick McKeown (breath / Oxygen
> Advantage), Wim Hof (breath/cold), + recreational-sport/longevity voices.
> **Method:** 12 transcripts pulled with `agf-yt`, mined with `agf-yt-mine`
> (`_intake-raw/yt-wave/movement-breath-mined/`), then headline claims cross-checked against
> `00-map/01-STATE-OF-THE-FIELD.md`, `06-evidence/CONFLICTS-REGISTER.md`, and the graded claim sets in
> `02-domains/{E,G,exercise-modalities,sports-play,pain-rehab}-claims.json`.
>
> **Honesty frame (inherited from STATE-OF-THE-FIELD):** predictor ≠ lever; cohort ≠ RCT; "something
> beats nothing" is the most robust signal. Practitioner name = provenance, not evidence.

---

## Videos pulled (12 transcripts; 6 of the original 18+ targets failed at meta/transcript stage — YouTube rate-limiting + a few unavailable)

| # | Practitioner | Title | YouTube ID | lines |
|---|---|---|---|---|
| 1 | Kelly Starrett (Huberman) | How to Improve Your Mobility, Posture & Flexibility | `8N7mdkrXgbc` | 5723 |
| 2 | Kelly & Juliet Starrett (D. Shah) | Why Sitting Isn't the Problem — It's How You Move | `duNi7F8ZUns` | 3731 |
| 3 | Kelly & Juliet Starrett | Built to Move: Ten Essential Habits of Durable Humans | `tb1PNJVH26A` | 1672 |
| 4 | Stuart McGill (Huberman) | Build a Strong, Pain-Proof Back | `mAlt_HKX4as` | 4020 |
| 5 | Stuart McGill (A. Connor) | The Back Mechanic — Fix Your Own Back Pain | `EeVDWvSdJsI` | 2757 |
| 6 | Squat University (McGill critique) | Why the McGill Big 3 ISN'T Working | `Woz8RYQnbhU` | 608 |
| 7 | Pavel Tsatsouline (Tim Ferriss) | The Science of Strength & the Art of Physical Performance | `UGshHR1OjJ8` | 2866 |
| 8 | Pavel Tsatsouline (Huberman) | How to Build Strength, Endurance & Flexibility at Any Age | `Z3OpxT65fKw` | 6621 |
| 9 | Pavel Tsatsouline (Huberman clip) | Get Stronger with Grease the Groove Training | `Vx0LJV-Q0j8` | 354 |
| 10 | Ido Portal (Huberman Essentials) | The Science & Practice of Movement | `JsICN9ZiSjA` | 966 |
| 11 | Patrick McKeown (Mind Muscle Project) | Learn How to Control Your Breathing | `a3mjPGGsslk` | 2184 |
| 12 | Wim Hof (Gary Brecka / TUH) | On Breathwork Science, Cold Exposure, Immune Control | `iZycKhRESB4` | 1925 |

**Failed (skipped per instructions):** `L4WV98-5H0I` (Ido — André Duqum), `KlcfRUwN6d8` /
`iEGNXbj0QgM` (McKeown long-form + BOLT measurement), `lXEqqQSkihA` / `HFjQrb_7CYI` /
`17NTPNyCRUw` (BJJ/sport-longevity), `TmWS3IeNcmw` (Ido), `PVmQOLYckKQ` (McGill), `hLiPM5YIrvs`
(McKeown), `WlOy1MtQ4Wg` (Wim Hof — Jay Shetty, meta OK but no transcript). Practitioner coverage is
intact via the 12 above; the dedicated BJJ video failed but the sports-longevity claims are checked
against `sports-play-claims.json` directly.

> **Note on the miner:** `agf-yt-mine`'s concept extractor is tuned for the Kruse biophysics corpus
> (its top "concepts" here — WHO/AGE/iron/RAGE — are false-positive word matches, not movement
> concepts). Its **value in this wave is the people/name list** (Marty Gallagher, Dan John, Andy
> Bolton, Lamar Gant, Fred Hatfield, Barry Ross, etc. — appended to `discovered-people.md`). The
> headline claims below were extracted by reading the transcripts directly, not from the miner.

---

## Headline claims — verdict table

Verdict legend: **AGREES** = consistent with a graded corpus claim; **OVERSTATED** = a real
mechanism/signal sold beyond its evidence tier; **CONTRADICTS** = corpus evidence runs against it;
**NOT-YET-IN-CORPUS** = plausible but no graded claim exists yet (candidate intake).

| # | Practitioner claim (headline) | Verdict | Corpus claim-id / conflict |
|---|---|---|---|
| 1 | "Sitting is the new smoking" (equivalence framing) | **OVERSTATED** | `physical-activity-dose-response-mortality` (E) — sedentary→active is the steepest, least-confounded signal, but *magnitude* nowhere near smoking (`crf-vo2max…`, smoking = #1 lever) |
| 2 | Starrett's *own* reframe: "it's not sitting, it's not **moving** / lack of movement variability" | **AGREES** | `physical-activity-dose-response-mortality` (E); `physical-activity-variety-mortality` (sports-play) |
| 3 | Daily steps / get-up-off-the-floor / "Built to Move" habits extend healthspan | **AGREES** | `physical-activity-dose-response-mortality` (E); sit-to-rise test as mortality predictor = **NOT-YET-IN-CORPUS** (candidate) |
| 4 | Mobility / soft-tissue work (rolling, ROM drills) **prevents injury** | **CONTRADICTS** | `stretching-does-not-prevent-injury` (meta, robust replicated negative, pain-rehab); `foam-rolling-acute-rom-not-fascia-release` (pain-rehab); conflict #27 foam-rolling |
| 5 | Mobility = usable end-range ROM that supports function & positions | **AGREES (weak)** | `masters-athletes-disuse-not-chronology` (sports-play) — function is trainable at any age; ROM itself ≠ longevity lever |
| 6 | McGill: "genetics loads the gun, loading pulls the trigger" — most back pain has an identifiable mechanical trigger | **OVERSTATED / CONTESTED** | `lbp-leading-disability-mismanaged` (meta): ~90–95% of LBP is *non-specific* (no identifiable structure). McGill's individualized-mechanism view partly contradicts the "non-specific" consensus |
| 7 | McGill Big 3 (curl-up, side-bridge, bird-dog) build spine stability at low disc load | **AGREES (as exercise)** but Big-3 *superiority* **OVERSTATED** | `lbp-stay-active-exercise-first-line` (meta) AGREES; `pilates-lbp-equivalent` (meta) — modality is ~interchangeable, so "Big 3 is the answer" is overstated |
| 8 | "You have a finite number of bends in your spine"; avoid loaded lumbar flexion (disc = bent wire) | **OVERSTATED (mechanistic)** | mechanistic; not a graded outcome claim. Useful heuristic, but "finite bends" is extrapolated from cadaver/porcine spine work → **NOT-YET-IN-CORPUS** as outcome |
| 9 | Disc bulges/degeneration on MRI are common in **pain-free** people (McGill agrees) | **AGREES** | `spine-imaging-findings-asymptomatic` (meta) |
| 10 | Squat-University critique: Big 3 is *not enough* — must progress to graded loading | **AGREES** (the contested-within-cluster item) | `tendinopathy-load-not-rest`, `rehab-progressive-loading-pain-as-dial`, `lbp-stay-active-exercise-first-line` (pain-rehab) — load is the active ingredient |
| 11 | Pavel: "grease the groove" — frequent sub-max practice, never to failure, builds strength as a skill | **AGREES (J-shape) / mechanism NOT-YET-IN-CORPUS** | `resistance-training-mortality-meta` (E) J-shape (more≠better, peaks 30–60 min/wk) AGREES with "never to failure"; GTG-specific superiority not graded |
| 12 | Strength is a skill (neural), train *strength* not "muscle"; strength ≠ mass | **AGREES** | `sarcopenia-strength-defining-ewgsop2`, `grip-strength-mortality-pure` (E); `dexa-strength-not-mass-predicts-mortality` (L) — strength, not mass, predicts mortality |
| 13 | Resistance/kettlebell training benefits older adults (strength at any age) | **AGREES** | `resistance-training-mortality-meta` (E); `kettlebell-bell-trial-older` (rct), `kettlebell-transfer` (exercise-modalities) |
| 14 | Static stretching before lifting helps / is necessary warm-up | **OVERSTATED → CONTRADICTS** | conflict #8 `static-stretch & performance`: long-hold static stretch transiently *reduces* strength/power (resolved by short holds + dynamic warm-up) |
| 15 | Ido: varied "movement culture" (generalist) beats narrow specialization | **AGREES (variety) / philosophy NOT-YET-IN-CORPUS** | `physical-activity-variety-mortality` (sports-play) AGREES; `early-sport-specialization-harm` (sports-play) AGREES for youth |
| 16 | Foundational human positions (hanging, deep squat, ground sitting, locomotion) should be trained | **NOT-YET-IN-CORPUS** | mechanistic/plausible; no graded outcome. Candidate intake |
| 17 | McKeown: nasal > mouth breathing (NO production, filtration, sleep quality) | **AGREES** | `nasal-breathing-nitric-oxide` (mechanistic, G); nasal congestion → worse sleep is consistent with corpus sleep claims |
| 18 | BOLT score is a valid metric of CO2 tolerance that predicts performance/health | **OVERSTATED** | `bohr-effect-co2-tolerance` (mechanistic, G) AGREES on CO2 physiology; BOLT itself = proprietary breath-hold heuristic, **predictive validity unvalidated** (already flagged in `discovered-concepts.md`) |
| 19 | Chronic over-breathing is widespread & harmful; reduce breathing volume (Buteyko) | **OVERSTATED** | `buteyko-asthma-symptoms-rct` (rct) AGREES *symptoms* improve (not lung function); "over-breathing epidemic" is a broader unproven claim |
| 20 | Slow breathing (~6/min) improves HRV / autonomic balance | **AGREES (surrogate)** | `slow-breathing-autonomic-hrv`, `exhalation-vagal-mechanism`, `cyclic-sighing-mood-arousal-rct` (G) — real acute effect; longevity outcome unproven |
| 21 | Mouth-taping at night improves sleep/breathing | **NOT-YET-IN-CORPUS** (+ caution) | no graded claim; thin evidence, safety caveats. Candidate intake |
| 22 | Wim Hof method lets you voluntarily suppress immune activation / inflammation | **OVERSTATED / CONTESTED** | `wim-hof-voluntary-sns-immune-attenuation` (rct, shown **once**) + `wim-hof-disease-axspa-proof-of-concept`; but conflict #12 + `wim-hof-systematic-review-caution` (meta): acute-adrenaline, **bundled** (breath+cold+mindset), small/healthy/short |
| 23 | WHM breathing/cold delivers metabolic / longevity benefit | **OVERSTATED** | the only human cold *metabolic outcome* used prolonged mild cold (hours), not WHM hyperventilation/plunge (`cold-acclimation-insulin-sensitivity-t2d`, H) — dose↔evidence mismatch |
| 24 | WHM breathing is safe to practice anywhere | **CONTRADICTS** (⚠️ safety) | STATE-OF-THE-FIELD §3 explicit ⚠️: WHM hyperventilation is **genuinely dangerous in/near water** (hypoxic blackout / shallow-water drowning) |
| 25 | Jiu-jitsu / recreational sport "for life" extends lifespan & wellbeing | **AGREES (assoc.) / causal OVERSTATED** | `bjj-mental-health-association` (cross-sectional), `sport-beats-gym-adherence-mechanism`, `social-connection-mortality-applies-to-sport`, `masters-athletes-disuse-not-chronology` (sports-play) — association + adherence mechanism real; BJJ-specific *causal* longevity not established. Note `contact-striking-cte-trade` for striking arts |

**Tally (25 headline claims):** **AGREES 9** · **OVERSTATED 9** · **CONTRADICTS 3** · **NOT-YET-IN-CORPUS 4**
(claims 5, 7, 11, 15, 25 are split verdicts — counted by their dominant verdict above).

---

## The contested items (flagged in the brief), resolved against the corpus

**"Sitting is the new smoking."** OVERSTATED as an *equivalence*. The corpus's least-confounded
exercise signal is exactly the sedentary→active gradient (`physical-activity-dose-response-mortality`),
so "break up sitting / move more" is well-supported — but smoking is the single largest modifiable
mortality factor in the whole corpus, and nothing about sitting approaches it. Notably, the Starretts'
*own* 2023 framing (video `duNi7F8ZUns`, literally titled "Why Sitting Isn't the Problem") has already
walked the slogan back to "it's the lack of movement / movement variability" — which **AGREES** with
the corpus. The slogan is the overclaim; the practitioners' current position is sound.

**Posture-causes-pain.** The cluster (especially the mobility/Starrett side, and implicitly McGill's
neutral-spine emphasis) leans on the idea that posture drives pain. The corpus has a dedicated graded
refutation: `posture-does-not-cause-pain-simply` (cohort, pain-rehab) — population posture variants are
largely **not** associated with pain; the "good posture prevents pain / bad posture causes it" model is
**largely unsupported** (cross-ref STATE-OF-THE-FIELD pain-rehab section). Verdict on the strong
posture-pain claim: **CONTRADICTS**. (McGill is more defensible than the generic posture-gurus because
he targets *provocative loading*, not static posture — but the "neutral spine at all times" popular
takeaway still over-reaches.)

**BOLT-score validity.** OVERSTATED. The underlying CO2-tolerance physiology is real
(`bohr-effect-co2-tolerance`, G) and BOLT is already indexed in `discovered-concepts.md` with the exact
caveat: the 25 s / 40 s cutoffs are a **proprietary heuristic with unvalidated predictive validity**.
Useful as a self-tracked trend; not a validated biomarker.

**Wim Hof (bundled / adrenaline + water safety).** OVERSTATED + a hard CONTRADICTS on safety. The
single endotoxemia RCT (`wim-hof-voluntary-sns-immune-attenuation`) is real and striking but it is
**one** acute-adrenaline-mediated, bundled (breath+cold+mindset), small, healthy-young, short-duration
result (conflict #12, `wim-hof-systematic-review-caution` meta = low-quality evidence). The metabolic
/longevity sell rides on cold-exposure data that used *prolonged mild cold*, not WHM hyperventilation
(`cold-acclimation-insulin-sensitivity-t2d`). And the breathing protocol is **dangerous in/near water**
— flagged with a ⚠️ in STATE-OF-THE-FIELD §3.

**Mobility-prevents-injury.** CONTRADICTS. The cleanest corpus result here: `stretching-does-not-prevent-injury`
is a robust, replicated negative (meta, pain-rehab), and `foam-rolling-acute-rom-not-fascia-release`
(+ conflict #27) shows self-myofascial work gives only small, minutes-long ROM bumps with no
fascia/adhesion mechanism. Mobility work has value for *range and comfort in positions*; it does not
meaningfully *prevent injury*, and there is no "fascia release."

**Within-cluster disagreement worth keeping (it's a feature):** the Squat-University video
(`Woz8RYQnbhU`) attacks the McGill Big 3 as insufficient — and the corpus sides with the *critic*: the
active ingredient in both back-pain rehab and tendinopathy is **progressive mechanical loading**
(`tendinopathy-load-not-rest`, `rehab-progressive-loading-pain-as-dial`), not isometric stabilization
held forever. McGill's Big 3 is a sound *entry* (low-load, builds endurance/control) but the corpus
treats it as a floor, not a ceiling.

---

## What this cluster gets RIGHT (the AGREES column is real)

The practitioners' *boring* advice is exactly the corpus's high-confidence tier: **move more / break up
sitting** (Starrett), **train strength specifically and keep it into old age, strength-not-mass**
(Pavel), **stay active and load tissue progressively for pain** (McGill-as-entry + Squat-Univ), **vary
your movement** (Ido), **breathe nasally and slowly** (McKeown's HRV/nasal claims). These map onto
STATE-OF-THE-FIELD's Tier-A levers (CRF, strength, movement, sleep) and the G-domain surrogate-tier
breathing claims. The pattern across the wave is consistent with the rest of the corpus: **the
boring core is well-supported; the branded protocol (the slogan, the proprietary score, the bundled
method, the fascia release) is where evidence gets out over its skis.**

---

## Intake candidates surfaced (not yet graded claims)

- **Sit-to-rise / floor-transfer test as a mortality predictor** (Brito et al.) — Starrett "Built to
  Move" leans on it; would slot into E / functional-biomarker cluster. (candidate)
- **"Finite bends" / cumulative-flexion disc model** (McGill, from porcine/cadaver spine work) —
  mechanistic; candidate for pain-rehab mechanism node. (candidate)
- **Mouth-taping for sleep-disordered breathing** — McKeown; thin evidence + safety caveat; candidate
  for G/I. (candidate)
- **Foundational human positions (deep squat / hanging / ground-sitting) as trainable longevity
  postures** — Ido/Starrett; no graded outcome. (candidate)

---

*Cross-check maintained for the Bucket Foundation health-longevity-fitness corpus. Practitioner
positions are provenance; verdicts resolve to the graded claim sets in `02-domains/` and the conflict
objects in `06-evidence/CONFLICTS.md`. Raw transcripts in `~/agfarms/bucket-foundation/yt/<id>-*`;
mined references in `_intake-raw/yt-wave/movement-breath-mined/`.*
