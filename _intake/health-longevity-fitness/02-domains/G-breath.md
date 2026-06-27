# Domain G — Breath

> **Status:** v0.1 (Wave 1) — 2026-06-27. Graded claim set; companion data in `G-claims.json` (11 claims).
> **Discipline:** respiratory physiology + breathwork systems. The **outcome/application layer** — gas-
> exchange/allostery mechanisms carry `canon_link` UP to `bucket-canon/05-biophysics/`.
>
> **The governing rule:** *slow breathing raises HRV / vagal tone* is a **mechanism**; *breathwork cures
> X* is an **outcome**. The Wim Hof PNAS study is a real RCT with a real immune **outcome** — but it is a
> **bundle** (breathing + cold + meditation), so the breathing component can't be isolated. Buteyko
> improved asthma *symptoms* (subjective/behavioral) without changing *lung function* (objective) — those
> are different claims. Tiers and `claim_type` keep them apart.

## How to read the tiers (descending rigor)
`meta` > `rct` > `mechanistic`. Unusually for this corpus, Domain G has **several actual RCTs**
(Kox/Pickkers, Balban/Huberman, Cooper, Ma) — but nearly all use **surrogate or subjective endpoints**
(cytokines, mood, symptoms, cortisol, HRV), short durations, and small/healthy samples. The mechanisms
(autonomic, vagal, gas-exchange) are well established; the *clinical outcomes* are mostly modest and acute.

---

## 1. Wim Hof method — the strongest (and most-bundled) evidence

- **Kox, Pickkers et al., PNAS 2014** (`10.1073/pnas.1322174111`, **RCT, 24 men, experimental
  endotoxemia**): trained practitioners **voluntarily activated the SNS (↑adrenaline) and attenuated the
  innate immune response** — ~50% lower TNF/IL-6, higher IL-10, fewer flu-like symptoms. `rct` / outcome.
- **Zwaag et al., Metabolites 2020** (`10.3390/metabo10040148`): the anti-inflammatory effect tracks a
  **lactate/pyruvate rise** during the practice — a proposed metabolic mediator alongside adrenaline.
  `mechanistic`.
- **Buijze et al., PLoS ONE 2019** (`10.1371/journal.pone.0225749`): add-on WHM reduced inflammation and
  disease activity in **axial spondyloarthritis** (n=24, open-label proof-of-concept). `rct` (mixed).
- **Almahayni & Hammond, PLoS ONE 2024** (`10.1371/journal.pone.0286933`, **systematic review**): the
  skeptical counterweight — evidence is **small and low-quality**; only the acute anti-inflammatory/
  sympathetic effect reproduces; broader benefit claims are unsupported. `meta` (mixed).

**Watch the gap (`conflict-wim-hof-mechanism`):** the effect is real but (a) it's a **bundle** — cold +
breathing + meditation, breathing not isolable; (b) the driver is an **adrenaline surge (mechanism)**, an
acute stress response, not evidence of a durable health upgrade; (c) samples are tiny, healthy, young.
Hyperventilation breath-holds also carry a **drowning/blackout risk if done in water** — a safety, not
efficacy, note.

## 2. Slow breathing, HRV & the vagal mechanism

- **Zaccaro et al., Front Hum Neurosci 2018** (`10.3389/fnhum.2018.00353`) + **Russo et al., Breathe 2017**
  (`10.1183/20734735.009817`): **slow breathing (~6 breaths/min, ~0.1 Hz) raises HRV and shifts autonomic
  balance toward parasympathetic dominance**, with reduced anxiety/arousal. `mechanistic`. The "resonance
  frequency" ~0.1 Hz aligns with the baroreflex.
- **Gerritsen & Band, Front Hum Neurosci 2018** (`10.3389/fnhum.2018.00397`) + **Jerath et al., Med
  Hypotheses 2006** (`10.1016/j.mehy.2006.02.042`): the **respiratory vagal mechanism** — HR rises on
  inhale, falls on exhale (respiratory sinus arrhythmia), so **prolonged exhalation increases vagal
  output**. This grounds extended-exhale and physiological-sigh practices. `mechanistic`.

## 3. CO2 tolerance, the Bohr effect & nasal breathing

- **Bohr effect** (`bohr-effect-co2-tolerance`, classical physiology — Bohr/Hasselbalch/Krogh 1904):
  elevated CO2 (lower pH) shifts the oxyhemoglobin curve rightward, promoting **O2 release to tissues**.
  CO2-tolerance breathwork (Buteyko, breath-holds) is built on raising tolerance to CO2 / blunting the
  air-hunger chemoreflex. `mechanistic`. UP-link to canon (hemoglobin allostery, gas exchange).
  **The Bohr effect is settled physiology; the claim that habitual "over-breathing" impairs tissue
  oxygenation and that CO2-training corrects it for health/performance is a contested EXTRAPOLATION.**
- **Nasal vs mouth breathing — nasal nitric oxide** (`nasal-breathing-nitric-oxide`; Kharitonov et al.,
  Eur Respir J 1997 `10.1183/09031936.97.10071683`; nasal-NO origin: Lundberg 1995): NO is produced in
  the paranasal sinuses; **nasal breathing delivers NO to the lungs** where it is a vasodilator improving
  V/Q matching. `mechanistic`. The leap to "nasal breathing meaningfully boosts athletic O2 uptake/
  performance" is a **weaker, popularized extrapolation** not well shown in performance outcomes.

## 4. Buteyko, pranayama & structured breathwork RCTs

- **Cooper et al., Thorax 2003** (`10.1136/thorax.58.8.674`, RCT): the **Buteyko technique improved asthma
  symptoms and reduced reliever-medication use — but did NOT change lung function (FEV1) or airway
  inflammation.** `rct` (mixed). The symptom/medication-vs-disease-modification distinction is the whole
  story: benefit likely comes from breathing-pattern normalization, not the disputed CO2 rationale.
- **Balban, Huberman et al., Cell Rep Med 2023** (`10.1016/j.xcrm.2022.100895`, **RCT, n=114, 28 days**):
  **5 min/day of cyclic sighing (exhale-emphasized) improved mood and lowered respiratory rate/arousal
  more than equal-time mindfulness meditation** or other breathwork. `rct` / outcome (subjective).
- **Ma et al., Front Psychol 2017** (`10.3389/fpsyg.2017.00874`, RCT): **diaphragmatic breathing reduced
  cortisol and negative affect and improved attention.** `rct` (surrogate). Consistent with the slow-
  breathing autonomic mechanism.

---

## Cross-links
- **UP to canon:** hemoglobin allostery / Bohr effect / gas exchange, nasal NO → `bucket-canon/05-biophysics/`.
- **SIDEWAYS:** HRV/autonomic balance ↔ Domain I (sleep/recovery) & Domain H (cold autonomic effects);
  WHM cold component ↔ Domain H (thermal); breath-as-hormesis (hyperventilation/breath-hold) ↔ hormesis frame.
- **PROTOCOLS:** see `04-protocols/G-breath-protocols.md` (box breathing, 4-7-8, coherent ~6/min, physiological
  sigh, Wim Hof rounds, Buteyko control-pause) — kept separate from these efficacy claims.

## Gaps flagged for Wave 2
See `_EHG-SUMMARY.md`. Headline: isolate the breathing component of WHM (vs cold/meditation); longer-
duration / clinical-population breathwork outcomes; nasal-breathing performance & sleep (mouth-taping
evidence — mostly anecdotal); HRV-biofeedback resonance training as a distinct modality; pranayama lineage-
specific data (Iyengar/Ashtanga); hyperventilation breath-hold safety literature; breathwork for hypertension
(slow-breathing-device RCTs).
