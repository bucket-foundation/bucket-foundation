# Domain E — Exercise Physiology & Strength

> **Status:** v0.1 (Wave 1) — 2026-06-27. Graded claim set; companion data in `E-claims.json` (13 claims).
> **Discipline:** exercise physiology + strength science. The **outcome/application layer** — where a
> mechanism rests on a foundation (mitochondria, redox, oxidative phosphorylation) it carries a
> `canon_link` UP to `bucket-canon/05-biophysics/`.
>
> **The governing rule:** a *mechanism* is never laundered into an *outcome*. "Exercise triggers
> mitochondrial biogenesis" (mechanism, certain) is not "exercise extends lifespan" (outcome — true in
> direction but observational in humans). "Grip strength predicts mortality" (biomarker association) is
> not "training grip lowers mortality" (interventional — untested). Tiers below make every gap explicit.

## How to read the tiers (descending rigor)
`meta` > `rct` > `cohort` > `mechanistic` > `animal`. Note the structural fact of this field: the
**cardiorespiratory-fitness/mortality link is the single strongest longevity association in all of
preventive medicine, yet it is `cohort`/`meta` (observational), not `rct`.** You cannot randomize people
to decades of high vs low fitness. So the strongest claim here is, by design, not the highest tier.

---

## 1. Cardiorespiratory fitness (VO2max) — the strongest longevity predictor

- **Mandsager et al., JAMA Network Open 2018** (`10.1001/jamanetworkopen.2018.3605`, Cleveland Clinic,
  **n=122,007** treadmill tests): higher CRF tracks lower all-cause mortality **with no observed upper
  limit of benefit**. Elite-fit vs low-fit adjusted HR ~5.04 — i.e. **being low-fit carried a risk
  comparable to or greater than smoking, diabetes or coronary artery disease.** ("There is no level of
  fitness that is too high.") `cohort` / outcome.
- **Kodama et al., JAMA 2009** (`10.1001/jama.2009.681`, meta of ~33 cohorts): **each 1-MET higher CRF
  ≈ 13% lower all-cause mortality** and ~15% lower CHD/CVD. `meta` / outcome — the clean per-unit dose.

**Watch the gap:** both are observational. CRF partly *reflects* underlying health (reverse causation),
so the 5x magnitude overstates the causal training effect. But the direction is rock-solid and replicated.
VO2max is the headline biomarker of Domain L; this is the spine the whole "exercise is the best longevity
drug" narrative hangs on — and it is, honestly, `cohort`-tier.

## 2. Zone 2, lactate threshold & mitochondrial biogenesis (the engine)

- **Holloszy, J Biol Chem 1967** (`10.1016/S0021-9258(18)96046-1`) — the foundational paper: endurance
  training ~doubles skeletal-muscle mitochondrial respiratory-enzyme content. **Mitochondrial biogenesis.**
  `animal`/mechanism. UP-link to biophysics canon (mitochondria, electron transport).
- **San-Millán & Brooks, Sports Med 2018** (`10.1007/s40279-017-0751-x`): fitter people oxidize more fat
  and produce less lactate at a given intensity (**metabolic flexibility**); "Zone 2" is operationally the
  intensity near the first lactate turn-point (~2 mmol/L). `mechanistic`.
- **Hargreaves & Spriet, Nat Metab 2020** (`10.1038/s42255-020-0251-4`): substrate use shifts fat→carb
  as intensity rises — the physiological basis for zone-training prescriptions. `mechanistic`.

**Conflict flagged (`conflict-zone2-optimal-mito`):** the popular claim that *Zone 2 is THE optimal
intensity for mitochondrial biogenesis* is an extrapolation. HIIT also drives strong mitochondrial
adaptation; the cross-sectional athlete data does not establish a single best intensity. See CONFLICTS.

## 3. Resistance training, sarcopenia & muscle as an endocrine organ

- **Momma et al., Br J Sports Med 2022** (`10.1136/bjsports-2021-105061`, meta of cohorts):
  muscle-strengthening activity → **~10-17% lower all-cause/CVD/cancer/diabetes mortality, independent of
  aerobic exercise**, with a **J-shaped dose-response peaking ~30-60 min/week** (more is not better — an
  often-omitted nuance). `meta` / outcome.
- **Cruz-Jentoft et al. (EWGSOP2), Age & Ageing 2018** (`10.1093/ageing/afy169`) + **Mitchell et al.,
  Front Physiol 2012** (`10.3389/fphys.2012.00260`): sarcopenia is now defined primarily by **low
  strength, not low mass**; strength declines *faster* than mass with age (dynapenia). Low strength
  predicts falls, disability, mortality. Resistance training is the primary countermeasure.
- **Muscle as an endocrine organ — Pedersen & Febbraio, Nat Rev Endocrinol 2012** (`10.1038/nrendo.2012.49`)
  + **Severinsen & Pedersen, Endocr Rev 2020** (`10.1210/endrev/bnaa016`): contracting muscle secretes
  **myokines** (IL-6, irisin, BDNF, SPARC…) signaling to fat/liver/bone/brain — the mechanistic basis of
  exercise's systemic anti-inflammatory effects. `mechanistic`. (Caveat: *irisin* quantification is
  itself contested; the broader concept is solid.)

## 4. Grip strength as a mortality biomarker

- **Leong et al. (PURE), Lancet 2015** (`10.1016/S0140-6736(14)62000-6`, PMID 25982160, **n=139,691**,
  17 countries): **each 5-kg lower grip → ~16% higher all-cause and ~17% higher CVD mortality** — a
  *better* predictor of death than systolic blood pressure. `cohort` / outcome.
- **Bohannon, Clin Interv Aging 2019** (`10.2147/cia.s194543`): grip is a cheap, reliable biomarker of
  whole-body strength, frailty and biological aging. `mechanistic` / biomarker.

**Watch the gap:** grip is a *biomarker* of systemic robustness, not a magic muscle. Squeezing a gripper
won't move mortality; the signal is what low grip *reveals* (sarcopenia, illness, reverse causation).

## 5. HIIT, dose-response & concurrent training

- **HIIT — Weston et al., Br J Sports Med 2014** (`10.1136/bjsports-2013-092576`) + **Gillen & Gibala,
  APNM 2014** (`10.1139/apnm-2013-0187`): HIIT (incl. low-volume) raises VO2max and cardiometabolic
  markers, often **more per unit time** than moderate continuous exercise (~19% greater VO2peak gain in
  cardiometabolic patients). `meta` — surrogate endpoints, higher RPE/adherence cost, not categorically
  superior for every goal.
- **Total activity dose-response — Ekelund et al., BMJ 2019** (`10.1136/bmj.l4570`, accelerometer meta):
  **any-intensity movement, especially replacing sedentary time, steeply lowers mortality**, with the
  largest marginal gains at the *low-active end*. "Doing something beats nothing" is the lowest-confounded
  signal in the domain.
- **Concurrent training — Wilson et al., J Strength Cond Res 2012** (`10.1519/JSC.0b013e31823a3e2d`): the
  **interference effect** (endurance work blunting strength/power/hypertrophy gains) is real but
  **modality- and dose-dependent** — worst for power/hypertrophy and high-frequency *running*; minimal for
  cycling/low volume; aerobic gains are preserved. Proposed mechanism: AMPK-vs-mTOR antagonism.
  See `conflict-concurrent-interference`.

---

## Cross-links
- **UP to canon:** mitochondrial biogenesis, substrate metabolism, lactate shuttle → `bucket-canon/05-biophysics/`.
- **SIDEWAYS:** muscle-as-endocrine-organ ↔ Domain B (inflammaging), VO2max/grip ↔ Domain L (biomarkers),
  hormesis frame ↔ Domain H (thermal), sarcopenia ↔ Domain B (stem-cell exhaustion).
- **PROTOCOLS:** see `04-protocols/E-exercise-protocols.md` (Zone 2 prescription, Norwegian 4x4 HIIT,
  resistance-training minimums, "centenarian decathlon" framing) — kept separate from these efficacy claims.

## Gaps flagged for Wave 2
See `_EHG-SUMMARY.md`. Headline: no exercise→hard-endpoint RCT exists (structural); VO2max *trainability*
& responder variance; rate-of-force / power as a distinct mortality predictor (Attia's emphasis); blood-flow
restriction; the protein×resistance-training interaction (bridges Domain D); exercise-snacks / minimal effective
dose; women-specific data (most mortality cohorts are male-heavy).
