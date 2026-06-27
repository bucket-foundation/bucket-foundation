# Domain C2 — Microbiome Deep-Dive + Blue Zones / Population Longevity

> **Status:** v0.1 (Wave 4 deepening) — 2026-06-27. Companion data in `C2-claims.json` (11 claims).
> **Scope:** EXTENDS, does not repeat, Domain C (microbiome §4: Biagi, Le Chatelier, Wilmanski, Sato,
> Galkin, SCFA-mechanism) and Domain D (§8 Mediterranean/Blue Zones). Two threads:
> **(1) the gut-microbiome↔aging causality stack** (associations → mechanisms → animal-intervention → human RCT),
> and **(2) population-longevity / Blue Zones**, treated as an unbiased-grading test case where the underlying
> AGE DATA is contested.
>
> **Governing rule (this domain's hardest):** the microbiome-aging field is **mostly association and animal
> work dressed as causal lifestyle advice**, and the Blue Zones field rests on **demographic counts that may be
> partly clerical error**. Both get graded DOWN to what the primary evidence actually licenses. Mechanism ≠
> outcome; cohort ≠ causal; centenarian count ≠ validated age.

## How to read the tiers here
`meta` > `rct` > `cohort` > `cross-sectional` > `mechanistic` > `animal` > `theoretical`. The microbiome causal
ladder in this file climbs: **human cross-sectional** (Domain C: Biagi/Wilmanski/Sato) → **mouse/fish
intervention** (Parker, Smith) → **single human RCT on surrogate markers** (Wastyk). Note where it STOPS: there
is **no human RCT showing a microbiome intervention extends healthspan or lifespan.** The Blue Zones thread tops
out at **cross-sectional demography** — and even that is the contested part.

---

## 1. The microbiome→aging CAUSALITY stack (honest about cause vs consequence)

Domain C already carded the **association** layer (centenarian remodeling, uniqueness-predicts-survival, the
Sato isoalloLCA bile acids, the microbiome aging-clock, the SCFA→barrier mechanism). C2 adds the **intervention
and deeper-mechanism** layers — the parts that try to move the claim from "the old gut looks different" to "the
gut DRIVES aging." It mostly doesn't get there in humans.

### 1a. Animal FMT — the strongest causal hints (still not human)
- **Killifish, young→middle FMT extends lifespan — Smith / Valenzano 2017** (`10.7554/elife.27014`): recolonizing
  a middle-aged short-lived fish with young-donor bacteria **extended lifespan** and delayed behavioral decline.
  The clearest "microbiome modulates vertebrate lifespan" result — but in a fish bred for ~4-month lifespans,
  where microbiome leverage is plausibly exaggerated. `animal`.
- **Mouse young↔old FMT reverses inflammaging — Parker 2022** (`10.1186/s40168-022-01243-w`): bidirectional
  transfer — young→aged microbiota **reduced** inflammaging in gut, eye, and brain; aged→young **induced** it.
  Causal direction (intervention) and multi-organ reach, but the readout is **inflammation markers, not
  lifespan**, and it is a mouse. `animal`.
- These are the load-bearing "cause" evidence — and they are exactly what `conflict-microbiome-cause-or-consequence`
  hangs on. **Animal FMT is the strongest causal hint AND does not establish a contribution to normal HUMAN aging.**

### 1b. Akkermansia muciniphila — the model "good bug" (mouse mechanism → small human PoC)
- **Mechanism — Everard / Cani 2013** (`10.1073/pnas.1219451110`): the mucin-degrader thins-when-lost; restoring
  it rebuilt the mucus barrier, cut metabolic endotoxemia, and reversed diet-induced obesity/insulin resistance
  in mice. `animal`. The origin of Akkermansia's "barrier-protective keystone" reputation.
- **Human translation — Depommier / Cani 2019** (`10.1038/s41591-019-0495-2`): a **n=40, 3-month, exploratory**
  RCT — supplementation improved insulin sensitivity and cardiometabolic markers, was safe. `rct` but
  **surrogate, tiny, proof-of-concept**. Two honest wrinkles: the strongest effect was from the **pasteurized
  (dead)** bacterium (complicates the "live probiotic" story), and HOMA-IR movement is not a longevity outcome.

### 1c. SCFAs / butyrate / fiber — the mechanism under "feed your microbes"
Domain C carded the SCFA→colonocyte-fuel→barrier→Treg sketch as one `mechanistic` claim. C2 splits out the two
landmark mouse mechanisms:
- **Butyrate → colonic Tregs — Furusawa 2013** (`10.1038/nature12721`): SCFA butyrate drives Foxp3+ regulatory-T
  differentiation via **HDAC inhibition** at the Foxp3 locus — a concrete fiber→immune-tolerance route, and a
  canon-relevant epigenetic mechanism (`bucket-canon/05-biophysics/`). `animal`.
- **Fiber starvation → mucus erosion — Desai / Martens 2016** (`10.1016/j.cell.2016.10.043`): with no dietary
  fiber, the microbiota eats the host **mucus layer**, thinning the barrier and worsening pathogen infection in
  gnotobiotic mice. `animal`. The mechanistic basis of the MAC hypothesis.
- **The MAC hypothesis — Sonnenburg & Sonnenburg 2014** (`10.1016/j.cmet.2014.07.003`): the low-fiber
  industrialized diet starves fermenters, lowering SCFA + diversity, plausibly compounding across generations.
  Influential **`theoretical`** framing by proponents — frames, does not prove.

### 1d. The one human RCT — and why it complicates the fiber story
- **Wastyk / Gardner / Sonnenburg 2021** (`10.1016/j.cell.2021.06.019`, Stanford, ~36 adults, 17 wk): the
  **high-fermented-food** arm RAISED microbiome diversity and LOWERED 19 inflammatory proteins (incl. IL-6); the
  **high-fiber** arm did **not** raise diversity short-term and gave **person-dependent** inflammatory responses
  (better in those whose baseline microbiome could ferment the fiber). `rct`.
- This is the **best human evidence in the whole microbiome-aging area**, and it is still: small, surrogate
  (diversity + cytokines, **not** a health/aging endpoint), 17 weeks. The counterintuitive **fiber null** is the
  honest headline — it directly tensions the simple "more fiber = more diversity" reading of §1c, and shows
  fiber's benefit is **microbiome-context-dependent** (ties to Desai: you need the right fermenters present).

### The honest synthesis (microbiome ↔ aging)
The chain is real but **front-loaded with association and animal data**: human cross-sectional signatures
(Domain C) + mouse/fish intervention (Parker, Smith) + mechanism (Furusawa, Desai, Everard) + ONE small human
surrogate RCT (Wastyk). **No human study shows a microbiome intervention extends healthspan or lifespan.** The
relationship is very likely **bidirectional** — the aged microbiome both reflects host decline (diet,
polypharmacy, motility, immune drift) and, in animals, can feed back onto it. Read Wilmanski's own caveat
(uniqueness predicts survival **only in the already-healthy**) as the brake on over-causal claims. → deepens
`conflict-microbiome-cause-or-consequence`.

---

## 2. Blue Zones / population longevity — the unbiased-grading test case

This is the cleanest case in the corpus of a **popular, widely-monetized health narrative whose foundational
data is contested.** The discipline: grade the DEMOGRAPHY and the LIFESTYLE claims separately, and grade the
lifestyle claims on their OWN evidence, not on centenarian counts.

### 2a. The original demographic concept (the defensible end)
- **Poulain / Pes — AKEA 2004** (`10.1016/j.exger.2004.06.016`): validated record-linkage demography found an
  inland-Sardinian province (Nuoro/Ogliastra) with an exceptional, near-1:1 **male**:female centenarian ratio.
  Poulain literally circled it in **blue** pen → "Blue Zone." `cross-sectional`. This is the peer-reviewed seed,
  and the zone with the most age-validation effort.
- **The popular synthesis — Buettner & Skemp 2016** (`10.1177/1559827616637066`): National-Geographic-origin
  distillation of five regions (Sardinia, Okinawa, Nicoya, Ikaria, Loma Linda) into the **"Power 9"** lifestyle
  commonalities (mostly-plant diet, constant moderate movement, social connection, purpose, moderate alcohol,
  down-shifting). `cross-sectional` — descriptive, uncontrolled, no causal weighting of any single factor.

### 2b. The serious data-quality critique (why the floor is soft)
- **Newman 2019, Ig Nobel 2024** (`10.1101/704080`): across countries, the onset of reliable **birth
  registration** coincides with apparent supercentenarian rates **collapsing** (by large fractions); surviving
  extreme-age hotspots correlate with **poverty, missing death certificates, and pension/welfare incentives** —
  i.e., conditions that produce **age exaggeration, clerical error, and pension fraud** rather than genuine
  survival. Okinawa's longevity status, notably, sits in a region with documented post-war record loss.
  `theoretical`/preprint, **contested** (demographers in the GRG/Robine validation tradition dispute the strong
  form), high-profile (the Ig Nobel is the tell that it's provocative, not that it's settled).

### 2c. How to grade Blue Zones claims (the unbiased rule)
- **What Newman does NOT show:** that Blue-Zone lifestyles are worthless, or that Poulain's validated Sardinian
  data is fabricated. He shows the **age data is unreliable enough** — especially for the popularized,
  less-validated zones — that you cannot treat "people here live to 100 *because* of diet X" as a cohort finding.
- **Therefore:** the **Power 9 lifestyle levers** are graded on their OWN, separate, stronger evidence where it
  exists — e.g. the **PREDIMED** Mediterranean-diet RCT (Domain D, `mediterranean-diet-predimed-cv-events`,
  `rct`), social-connection→mortality cohorts, plant-forward dietary-pattern cohorts. As a **Blue-Zones
  inference** ("these 9 traits cause longevity, proven by these centenarians"), they are **`theoretical`/contested**
  — uncontrolled cross-sectional correlations resting on shaky counts.
- This is exactly the corpus's neutrality stance: the lifestyle advice is mostly biologically plausible and
  individually echoed elsewhere; the **specific Blue-Zones causal claim is downgraded because its denominator
  (validated extreme ages) is in dispute.** → `conflict-blue-zones-data-quality`.

---

## Cross-links
- **DEEPENS** Domain C §4 (microbiome) — adds the animal-intervention + mechanism + human-RCT layers above the
  cross-sectional signatures already there. Reuses, does not restate, Biagi/Wilmanski/Sato/Galkin.
- **DEEPENS** Domain D §8 — the Blue Zones note in D is the seed; this is the full demographic-vs-lifestyle
  split. The diet lever resolves UP to PREDIMED (D), not to centenarian counts.
- **UP to canon:** butyrate/HDAC epigenetic mechanism, SCFA metabolism → `bucket-canon/05-biophysics/`.
- **Conflicts:** deepens `conflict-microbiome-cause-or-consequence`; adds `conflict-blue-zones-data-quality`.

## Gaps for Wave 5
1. **Human FMT/fiber RCTs with AGING endpoints** (clocks, frailty, hard outcomes) — the missing study that would
   move microbiome-aging from animal-causal to human-causal.
2. **Akkermansia live-vs-pasteurized** mechanism, and whether any probiotic moves a hard endpoint.
3. **Demographic rebuttals to Newman** (Robine/GRG validation methods) carded as the other side at proper tier.
4. **Okinawa/Loma Linda primary cohort data** (Willcox; Adventist Health Study) — Loma Linda is the one "zone"
   with strong cohort backing (Adventists), a useful contrast to the age-validation-weak zones.
5. **Fermented-food replication** beyond the single Stanford arm; mechanism of the diversity rise.

## Provenance method
All DOIs verified via OpenAlex direct-DOI lookup (`works/doi:`), `mailto=gianyrox@gmail.com`. Hook-safe: pulls
saved to file (`/tmp` script → archived JSON), parsed in a separate step — no `curl|python3`. Rate-limit (429)
hit mid-run; recovered by backoff + direct-DOI fallback for the mechanism papers. Raw JSON archived to
`_intake-raw/openalex/c2-*.json` (Wastyk, Parker, Smith, Everard, Depommier, Poulain, Buettner, Furusawa, Desai,
Sonnenburg; Newman reuses the existing `D-newman_bluezones_search.json`). Random walk: Domain-C microbiome
associations → "what's the causal evidence?" → animal FMT (killifish, mouse) → Akkermansia mechanism→human PoC →
SCFA/butyrate→Treg + fiber→mucus mechanisms → the one human RCT (Wastyk) → its fiber null → over to Blue Zones:
Poulain origin → Buettner Power 9 → Newman data-quality critique → grade lifestyle on PREDIMED, not counts.
