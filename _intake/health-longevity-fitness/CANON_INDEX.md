# CANON_INDEX — Health · Longevity · Fitness corpus (master manifest)

> **The authoritative manifest for this corpus** (per the Bucket canon folder contract: if a file
> isn't reachable from this index, treat it as not-canon). This is the human entry point — read it
> to navigate the entire corpus. **Synthesis index, not new research.**
>
> **Status:** v1 — built 2026-06-27 after Waves 1–5. Staging area; final location is a deliverable
> (`LANDING-PROPOSAL.md`), not yet decided. Counts below are live (actually counted), and may exceed
> the figures quoted in the older Wave-1/3 proposals as the corpus has grown.

## Read order (fastest path to understanding)
1. **`00-map/01-STATE-OF-THE-FIELD.md`** — the honest bottom-line: what the evidence actually supports (start here)
2. `04-protocols/WHAT-TO-TRACK-SYNTHESIS.md` — the actionable, evidence-tiered "what to do / measure" capstone
3. `00-map/00-IDEAL-STATE-MAP.md` — the target ontology (the 12 domains A–L + cross-cutting threads)
4. `06-evidence/SCHEMA.md` + `06-evidence/CONFLICTS-REGISTER.md` — how claims are graded; where experts disagree
5. `00-map/LANDING-PROPOSAL.md` + `00-map/CANON-BRIDGE-PROPOSAL.md` — where this corpus belongs in Bucket

---

## Corpus totals (live count, 2026-06-27)

| Asset | Count | Source of truth |
|---|---:|---|
| **Graded claims** | **1007** | `02-domains/*-claims.json` (54 sets) |
| **People (figure cards)** | **174** carded (`01-people/figures.json`); 170 `.md` cards; **155** graph edges | `01-people/` |
| **Labs / institutions** | **24** | `05-labs/labs.json` |
| **Clinical trials tracked** | **15** | `05-labs/trials.json` |
| **Conflict objects** | **38** (23 `open`, 15 partially/mostly-resolved) | `06-evidence/CONFLICTS.md` |
| **Cross-cutting threads** | **6** | `02-domains/threads/` |
| **Movements (movement library)** | **53** across 8 categories | `03-movement-library/` |
| **Media assets** | **294** (video + extracted frames + anatomy images) | `media/MANIFEST.jsonl` |
| **Practitioner protocol sheets** | **12** practitioners + **3** domain protocol sheets | `04-protocols/` |

### Claims by evidence tier (all 1007)
| Tier | Count | | Tier | Count |
|---|---:|---|---|---:|
| rct | 250 | | anecdotal | 28 |
| cohort | 229 | | theoretical | 22 |
| meta (meta-analysis) | 222 | | case-control | 11 |
| mechanistic | 154 | | in-vitro | 8 |
| animal | 43 | | n=1 | 6 |
| cross-sectional | 31 | | mixed | 2 |
| | | | outcome | 1 |

> Read: RCT-tier (250) and meta-tier (222) claims are a large minority; the corpus is still
> **observational-heavy** (cohort + cross-sectional + case-control = 271) and **mechanistic-heavy**
> (154), with animal/theoretical/anecdotal/in-vitro/n=1 tiers making up the rest. That distribution
> *is* the headline — see `00-map/01-STATE-OF-THE-FIELD.md`.

---

## 02-domains — graded claim sets (the spine)

Each domain has a narrative `.md` and a machine-readable `*-claims.json`. **Mechanism ≠ outcome ≠
protocol** is enforced per `06-evidence/SCHEMA.md`.

| ID | Domain file | Claims | Theme (one line) |
|---|---|---:|---|
| **B** | `B-aging-mechanisms.md` | 38 | Hallmarks of aging + nutrient-sensing (mTOR/AMPK/sirtuins/IGF-1), senescence/senolytics, autophagy, reprogramming — the geroscience spine |
| **C** | `C-genetics-omics.md` | 25 | Longevity genetics (APOE/FOXO3, centenarian GWAS), epigenetic clocks (Horvath/GrimAge/DunedinPACE), -omics aging signatures |
| **C2** | `C2-microbiome-deepdive.md` | 11 | Gut microbiome ↔ inflammaging: SCFAs, dysbiosis, FMT animal lifespan data — cause-vs-consequence unresolved |
| **D** | `D-metabolic-nutrition.md` | 26 | Insulin/glucose, protein↔mTOR tradeoff, caloric restriction/fasting/TRE/FMD, the seed-oil conflict |
| **E** | `E-exercise.md` | 13 | CRF/VO2max as strongest mortality predictor, strength/grip, Zone 2 vs HIIT, dose-response — the strongest-evidence domain |
| **G** | `G-breath.md` | 11 | Respiratory physiology (CO2 tolerance, Bohr, nasal), breathwork systems (Wim Hof, Buteyko, slow/coherent), autonomic effects |
| **H** | `H-thermal.md` | 10 | Cold thermogenesis (BAT/norepinephrine), sauna/heat (Finnish cohort), hormesis frame — dose↔evidence mismatches |
| **I** | `I-sleep-circadian.md` | 20 | Sleep duration U-shape (~7h), glymphatic clearance, circadian/light hygiene, HRV/recovery, allostatic load |
| **J** | *(claims only — narrative lives in `04-protocols/`)* | 23 | Practitioner/N=1 protocol claims (Bryan Johnson, Attia, Patrick, Huberman, Galpin, Sinclair, Longo, …) graded |
| **L** | `L-biomarkers.md` | 20 | What to actually measure: VO2max, apoB, Lp(a), HbA1c/HOMA-IR, DEXA, grip/gait, epigenetic clocks (validity-graded) |

**Domain summary files:** `_B-SUMMARY.md`, `_C-SUMMARY.md`, `_C2-SUMMARY.md`, `_D-SUMMARY.md`,
`_EHG-SUMMARY.md` (exercise+thermal+breath), `_I-SUMMARY.md`, `_L-SUMMARY.md`.

**Domains not as claim sets:** **A** (biophysical foundations) bridges UP to `bucket-canon/05-biophysics`
(see CANON-BRIDGE-PROPOSAL); **F** (movement/mobility) is the media library (`03-movement-library/`);
**K** (labs) lives in `05-labs/`.

### Cross-cutting threads (`02-domains/threads/`) — the connective tissue
6 threads weave existing claims across domains (no new research). Summary: `_THREADS-SUMMARY.md`.

| Thread | Unifies | Solid core | Hype edge |
|---|---|---|---|
| `thread-hormesis.md` | thermal·exercise·fasting·breath | exercise-as-hormesis, mitohormesis | unfalsifiable retro-explanation; unknown human dose-window |
| `thread-mitochondria.md` | biophysics→exercise→metabolism→aging→genetics | chemiosmosis (law), exercise→biogenesis | mtDNA causality in aging unproven; "boost mito" supplements |
| `thread-circadian-light.md` | sleep·metabolism·hormones·Kruse-biophysics | melanopsin→SCN→melatonin (settled) | blue-blocking glasses; Kruse UV/IR/nnEMF extensions speculative |
| `thread-inflammation.md` | aging·genetics·metabolism·exercise·sleep | IL-6/CRP/TNF predict mortality | cause-vs-consequence unresolved; "anti-inflammatory" diets |
| `thread-nad-redox.md` | biophysics·aging·practitioners | NAD+ as ETC cofactor, age decline | NAD-supplements extend life (surrogate only); resveratrol artifact |
| `thread-autonomic-hrv.md` | breath·cold·sleep·stress | slow breathing raises vagal tone | HRV is a biomarker not an intervention; wearable vanity metric |

> Three threads (mitochondria, hormesis, nad-redox) share one root — **redox / proton-motive
> bioenergetics** — which is the empirical basis of `CANON-BRIDGE-PROPOSAL.md`.

---

## 01-people — the figure map (174 carded)

- `figures.json` — 174 figures in the canon-figures schema (id, lifespan, branches, evidence_posture, …)
- `cards/` — 170 individual `.md` cards (mainstream + fringe, evidence-tagged)
- `graph.json` — people↔people graph, **155 edges** (built_on / influenced / collaborator / disputes)
- `RELATIONSHIPS.md`, `PEOPLE-SEED.md`, `graph.json`; summaries: `_EXPANSION-SUMMARY.md`, `_STREAM-SUMMARY.md`

Spans mainstream geroscience (Sinclair, Barzilai, Kennedy, Attia, López-Otín, Blackburn, Horvath),
exercise/physiology (Galpin, Holloszy, Starrett, McGill), thermal/breath (Laukkanen, Søberg, Wim Hof,
McKeown), and the inherited biophysics layer (Kruse, Pollack, Becker, Levin, Wallace, Mitchell, Lane).

## 05-labs — labs ↔ people ↔ trials graph
- `labs.json` (24) + `LABS.md` — Buck, Salk, Harvard, Stanford, UW, Albert Einstein, USC; Altos, Calico, Retro, BioAge; SENS/Hevolution
- `trials.json` (15) + `TRIALS.md` — TAME (metformin), rapamycin trials, dog-aging project, CALERIE, senolytic pilots
- `_SUMMARY.md`

## 06-evidence — grading + disagreement
- `SCHEMA.md` — the neutrality mechanism: how every claim is graded; tier definitions; "name is provenance, not evidence"
- `CONFLICTS.md` — 38 conflict objects, full prose + inline JSON mirror (append-only)
- **`CONFLICTS-REGISTER.md`** — clean summary table of all 38 (question | side A | side B | status)
- `_WAVE4-CLEANUP.md`

## 04-protocols — recipes (separated from evidence)
- `INDEX.md` — master protocol index (protocol = recipe, NOT evidence; every efficacy claim graded in J-claims/home domain)
- **`WHAT-TO-TRACK-SYNTHESIS.md`** — the actionable capstone (levers + measures by confidence tier A/B/C)
- 12 practitioner sheets: `bryan-johnson-blueprint`, `peter-attia-medicine3`, `rhonda-patrick-stack`, `huberman`, `galpin`, `starrett`, `mcgill`, `wim-hof`, `mckeown`, `soberg`, `sinclair`, `longo`
- 3 domain protocol sheets: `E-exercise-protocols`, `G-breath-protocols`, `H-thermal-protocols`
- `_PROTOCOLS-SUMMARY.md`. ⚠️ Safety-flagged protocols listed in `INDEX.md` (Wim Hof never in water; CWI; sauna; mouth-taping; FMD)

## 03-movement-library (Domain F) — applied/demo tier
- 8 categories: `balance-locomotion`, `breath`, `cold-thermogenesis`, `flexibility`, `heat-sauna`, `mobility`, `strength`, `yoga`
- 53 movements inventoried (each: name, what it trains, cues, source, demo URL) — per-category `INVENTORY.md`
- `MOVEMENT-EVIDENCE.md`, `SAFETY-FLAGS.md`, `_SUMMARY.md`, `_WAVE3-SUMMARY.md`
- Media (`media/`, MANIFEST.jsonl = 294): demonstration videos, extracted still frames, Wikimedia anatomy images (demo/anecdotal tier — show *how*, not outcome evidence)

## 00-map — orientation, frontier, proposals
- `00-IDEAL-STATE-MAP.md` — the target ontology (12 domains + threads + exit criteria)
- **`01-STATE-OF-THE-FIELD.md`** — the honest synthesis (what's strong / promising / hype / open)
- `FRONTIER.md` — live worklist + wave log (what's done, what remains for Wave 6+)
- `LANDING-PROPOSAL.md` — recommends a 3-way SPLIT: (α) bioenergetics→canon, (β) science→new outcome vertical, (γ) practice→sub-vertical
- `CANON-BRIDGE-PROPOSAL.md` — which figures/concepts are foundation-tier (promote Krebs, Moyle, Martin + chemiosmosis concept node into `05-biophysics`)
- `TAXONOMY_NOTES.md`, `_CANON-PROMOTION-LOG.md`, and the `discovered-*.md` expansion ledgers (people, concepts, labs, aging, exercise-thermal-breath)

## 07-sources / _intake-raw — provenance + raw pulls
- `07-sources/SOURCE-REGISTRY.md` — where the random walks go
- `_intake-raw/` — idempotent raw pulls before structuring (clinicaltrials, openalex, wikipedia, mined-existing-corpus, mined-new-pulls), 3 MANIFEST files

---

## The bottom line (one paragraph)
The evidence concentrates on a short list of **boring, powerful levers**: don't smoke; build & keep
**cardiorespiratory fitness (VO2max)** and **strength**; **move more**; **sleep ~7h regularly**; keep
**apoB/LDL** low across life; keep a **healthy metabolic profile**; protect **social connection**.
The one causal modifiable *blood* lever is **apoB/LDL** (measure **Lp(a)** once). The highest-signal
*measurements* are **functional** (VO2max, grip, gait, chair-rise, balance) and a few **causal/early
blood markers** (apoB, Lp(a), HbA1c, fasting insulin). Almost everything *sold* — biological-age
clocks, CGM for the healthy, senolytics/NAD+/rapamycin for healthy people, cold plunges, seed-oil
panic — is a **correlate dressed as a scorecard**, a **mouse result not yet in humans**, or a **dose
that doesn't match the studied dose**. Full argument with claim ids: `00-map/01-STATE-OF-THE-FIELD.md`.

*Maintained by Nucleus. Idempotent — re-runs update links, don't duplicate. Superseded material → `_archive/<YYYY-MM>/`.*
