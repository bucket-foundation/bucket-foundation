# Corpus Audit — Verification & Cross-Chapter QA

**Scope:** `_intake/health-longevity-fitness` — the AGFarms / Bucket Foundation health-longevity-fitness manual.
**Date:** 2026-06-28 · **Auditor:** automated QA pass (JSON-validity, DOI-verification, cross-chapter contradiction scan, coverage tally, duplicate check).
**Corpus state at audit:** 35 content chapters (`reports/sections/01-35`, + `00-atlas` index), 43 graded-claim files (`02-domains/*claims.json`), **836 graded claims**, conflict register in `CONFLICTS.md` (37 first-class conflict objects).

This is the corpus's honest self-check. The grading philosophy (`SCHEMA.md`) is that the *grade is the neutrality* — nothing excluded for being fringe, nothing laundered to fact for being popular. This audit checks that the machinery behind that promise actually holds.

---

## 1. JSON validity

**Status: PASS (clean).**

- All **43** `*claims.json` files parse as valid JSON. **0 broken / malformed files.** No trailing-comma or syntax errors found, so no JSON repairs were required.
- Schema conformance: every one of the **836** claim objects carries the three required fields (`id`, `statement`, `evidence_tier`). **0 schema violations.** Provenance sub-objects (`primary`/`doi`/`surfaced_via`) and `confidence_notes` are present throughout.
- Two files were edited during this audit (DOI + cross-reference fixes, §2 and §3); both re-validated as well-formed JSON after editing.

---

## 2. Unverified-DOI inventory

A flag scan over `provenance.surfaced_via` + `confidence_notes` separates two populations. The full machine-readable list is in **`VERIFICATION-NEEDED.md`** (companion file). Summary:

### 2a. Genuinely "from memory / not machine-verified" (6 claims — highest stakes)

| File | Claim id | DOI as filed | Disposition |
|---|---|---|---|
| `O-claims.json` | `altitude-mortality-epidemiology` | `10.1161/CIRCULATIONAHA.108.840579` | **WRONG → FIXED.** Resolved to nothing in OpenAlex *and* Crossref. Correct DOI is **`10.1161/CIRCULATIONAHA.108.819250`** (Faeh, Gutzwiller & Bopp, *Circulation* 2009) — found via Crossref bibliographic search, file corrected this pass. |
| `V-nervous-claims.json` | `dopamine-reward-prediction-error` | `10.1126/science.275.5306.1593` | **VERIFIED CORRECT** (Schultz, Dayan & Montague, *Science* 1997, "A Neural Substrate of Prediction and Reward"). |
| `V-nervous-claims.json` | `left-right-brain-myth` | `10.1371/journal.pone.0071275` | **VERIFIED CORRECT** (Nielsen et al., *PLoS ONE* 2013). |
| `disease-neuro-rheum-claims.json` | `cte-real-but-unquantified` | `10.1001/jama.2017.8334` | **VERIFIED CORRECT** (Mez et al., *JAMA* 2017). The recalled cross-ref `10.1093/brain/aws307` (McKee, *Brain* 2012) also verified correct. |
| `disease-respiratory-gi-claims.json` | `ncgs-real-symptoms-often-fructans-no-test` | `10.1053/j.gastro.2017.10.040` | **VERIFIED CORRECT** (Skodje et al., *Gastroenterology* 2017 — "Fructan, Rather Than Gluten…"). Note: confidence_notes calls it "Skodje 2018"; the paper is 2017 (online) — DOI is right, year label is cosmetically off. |
| `disease-respiratory-gi-claims.json` | `diverticulitis-often-no-antibiotics` | `10.1002/bjs.8688` | **VERIFIED CORRECT** (Chabok et al., AVOD trial, *Br J Surg* 2012). |

Spot-check verdict: of 6 "from memory" DOIs, **5 were correct as filed and 1 was wrong (now fixed).** The honesty flags were doing their job — the one that was flagged hardest (altitude, "OpenAlex verification failed") was indeed the one that was wrong.

### 2b. PMID-cross-referenced "verify" targets (18 claims — lower stakes)

`I-claims.json` (10 meditation-lineage claims) and `Z-genetics-claims.json` (8 genetics claims) carry `surfaced_via` notes of the form "Europe PMC verify (PMID …)" / "PubMed verify PMID …". These already cite a specific PMID, so the DOI is anchored to a known record — they are *verification targets*, not unsupported guesses. Spot-checks done this pass (all from this set, **all correct**):

- `apoe-e4-alzheimer-gene-dose` → `10.1126/science.8346443` (Corder et al., *Science* 1993) ✓
- `lpa-genetic-causal-cvd-mendelian` → `10.1056/NEJMoa0902604` (Clarke et al., *NEJM* 2009) ✓
- `dtc-genotype-does-not-predict-diet-response` → `10.1001/jama.2018.0245` (Gardner DIETFITS, *JAMA* 2018) ✓
- `mthfr-testing-not-recommended` → `10.1038/gim.2012.165` (ACMG, *Genet Med* 2013) ✓

**Recommended follow-up:** batch-verify the remaining ~14 PMID-anchored DOIs in `I-` and `Z-` against Europe PMC (cheap; they have PMIDs). No errors found in the 4 sampled.

### Verification scorecard
- DOIs spot-checked against OpenAlex/Crossref this pass: **11** (the 6 "from-memory" + 5 high-stakes PMID-anchored). Verified correct: **10**; wrong-and-fixed: **1**. Hit rate ≈ **91%**, consistent with a well-sourced corpus.

---

## 3. Cross-chapter contradiction scan

The corpus's strongest QA feature is that it routes disagreement into **first-class conflict objects** (`CONFLICTS.md`, 37 objects) rather than leaving naked contradictions in prose. The probes the brief named all came back **consistent**:

| Probe | Verdict | Detail |
|---|---|---|
| **Protein target** (nutrition vs endocrine/lifestages) | **Consistent** | `D`, `D2`, `J` all converge on **~1.6 g/kg/day plateau** for hypertrophy and **1.6–2.2 g/kg** for older-adult muscle preservation (shared DOI `10.1136/bjsports-2017-097608`). The Longo IGF-1/mTOR counter-position is filed as the explicit, registered conflict `conflict-protein-mtor-longevity` and framed age-dependently everywhere. Kidney nuance (`Y`: healthy kidneys fine, CKD = faster eGFR decline on *animal* protein) is complementary, not contradictory. |
| **Sauna / cold dose** (recovery vs biohacking) | **Consistent** | Sauna **4–7×/week, ~40% lower all-cause mortality** stated identically in `H` and `J` (same Laukkanen DOI). Cold: Søberg "~11 min/week, end on cold" (`J`, nequals1) vs whole-body-cryotherapy-no-benefit (`biohacking`, meta) are **not** in conflict — different modalities (cold-water immersion ≠ cryo chamber). The cold-after-resistance timing tension is correctly captured as `conflict-cold-after-resistance`. |
| **apoB framing** | **Consistent** | apoB framed identically across `L` (apoB superior particle marker + causal), `disease-cardiometabolic` (apoB-retention causal), and `S-pharma` (statin/ezetimibe/PCSK9 outcome benefit via LDL/apoB lowering). No drift between "marker" and "cause." |
| **Dementia risk factors** (brain vs public-health) | **Consistent & mutually reinforcing** | `Q-brain` Lancet-Commission anchor (45% / 14 modifiable factors) is corroborated, not contradicted, by `T-systems` (hearing, vision, periodontitis, cataract), `R-exposures` (PM2.5), `P-clinical`/`Q` (hypertension, SPRINT-MIND), `S` (shingles vaccine). The ACHIEVE hearing-aid RCT is reported the same nuanced way in both `Q` and `T` (null overall, benefit in high-risk subgroup). |
| **Vitamin D** | **Consistent** | `D2`, `J`, `T`, `U` all say the same thing four times: **null in the replete, real in deficiency** (shared VITAL DOI). |
| **Omega-3** | **Consistent** | `D2`, `J` agree: lowers triglycerides dose-dependently, equivocal on hard CV events. |
| **TRE / fasting** | **Consistent** | `D`, `D2`, `I` converge: most real-world TRE benefit is the calorie restriction it induces (shared NEJMoa2114833). n-of-1 (Sinclair) and cohort (Longo) graded at appropriately low tiers. |

### Genuine tensions found (flag for follow-up — NOT rewritten)

These are real integrity gaps, but they are *plumbing* (broken/missing cross-references), not factual contradictions:

1. **10 dangling `conflicts_with` references** — claims point to conflict objects that don't exist in `CONFLICTS.md`:
   - `conflict-protein-mtor` (×2, `J-claims`) → **FIXED this pass**: renamed to the real object `conflict-protein-mtor-longevity` (the SCHEMA.md example id was stale).
   - **Still dangling (conflict object never authored — recommend writing these 8):**
     - `conflict-omega3-predictor-vs-lever` (`D2`, ×2)
     - `conflict-exercise-prevents-dementia` (`Q-brain`)
     - `conflict-mind-diet-cognition` (`Q-brain`)
     - `conflict-immunotherapy-cure-framing` (`oncology`)
     - `conflict-mced-galleri-unproven` (`oncology`)
     - `conflict-sugar-feeds-cancer` (`oncology`)
     - `conflict-bad-luck-cancer-interpretation` (`oncology`)
   - These claims *describe* their own tension well in `confidence_notes`; only the referenced conflict object is missing. Low risk, but the cross-reference graph is broken until the 8 objects are added (the oncology chapter, ch. 25, accounts for 4 of them — likely a single unfinished pass).

2. **Alcohol minimum-risk dose — three co-existing meta-tier framings in one chapter** (`R-exposures`): "zero minimizes total health loss" vs "age-dependent (~0 young, ~1 drink older)" vs "all-cause threshold ≤100 g/week." These are **reconcilable by endpoint** (total health loss vs all-cause mortality vs age strata) and the J-curve is explicitly tagged `(SUPERSEDED VIEW)` — but a reader could perceive them as conflicting. The registered `conflict-alcohol-jcurve` resolution_notes already explain it; recommend the three claims cross-link to that object (currently only `alcohol-no-safe-level-overall` links out). Minor.

**No factual head-to-head contradiction was found** where two chapters assert mutually exclusive facts at the same tier. The disagreements that exist are all (a) correctly tiered, (b) flagged in prose, and mostly (c) captured as conflict objects.

---

## 4. Claim-count & coverage tally

- **Total graded claims: 836** across **43** claim files.
- **Conflict objects: 37** (first-class, in `CONFLICTS.md`) + an older `CONFLICTS-REGISTER.md`.
- **Chapters: 35** content chapters (`01`–`35`) + `00-atlas` index = 36 section files.
- **Coverage: complete.** Claim files (43) outnumber content chapters (35); the mapping is **many-to-one by design** (e.g. ch.03 nutrition draws on `D`, `D2`, `J`; ch.01 foundations on `B`, `C`, `C2`). **No chapter has zero graded claims.**

Per-file claim counts (graded claims):

```
 38 B   25 C   11 C2   26 D   22 D2   13 E   11 G   10 H   30 I   23 J
 20 L   11 L2  11 M     9 N    9 O    13 P-clin 16 Q  24 R   24 S   25 T
 15 U   16 V   16 W    10 X   31 Y   15 Z
 21 addiction        17 behavior-change   22 biohacking       24 cam
 24 disease-cardiometabolic   23 disease-neuro-rheum   32 disease-respiratory-gi
 23 emergency        20 infectious-disease  21 lifestages     20 mentalhealth
 17 oncology         21 pain-rehab          23 pharmacology-full
 13 public-health    18 regenerative        23 surface-sensory
```

Distribution is healthy: heaviest files are the foundational/aging (`B`=38), organ-systems (`Y`=31), respiratory-GI disease (32), sleep-circadian (`I`=30); lightest are the narrow verticals (`N` women's=9, `O` hypoxia=9, `H` thermal=10, `X` telomere=10) — appropriate to scope.

---

## 5. Duplicate-claim check

The audit found **70 DOIs reused across 2+ distinct claims** (58 pairs, 12 triples+). **Most are legitimate cross-chapter coverage** — the manual is organized so a landmark appears through multiple lenses, which is a feature, not a bug. But a subset are **the same finding graded more than once with different ids**, which inflates the 836 count and lacks a designated canonical owner. Clearest same-finding duplicates:

| Finding (shared DOI) | Graded as (file · id) | Note |
|---|---|---|
| Serotonin-imbalance theory unsupported (Moncrieff `10.1038/s41380-022-01661-0`) | `Q-brain` serotonin-depression-no-evidence · `V-nervous` serotonin-imbalance-myth · `mentalhealth` serotonin-deficiency-myth | **3× near-identical.** Pick one canonical, cross-ref the others. |
| Biological-age clocks not validated as personal surrogate (`10.1016/j.cell.2023.08.003`) | `C` biomarkers-of-aging-consortium · `L` biological-age-tests-not-validated · `Z` methylation-age-not-validated | **3×.** |
| VO2max / CRF strongest mortality predictor (`10.1001/jamanetworkopen.2018.3605`) | `E` crf-vo2max · `J` attia-vo2max · `Y` crf-mortality-no-upper-limit | **3×.** |
| Protein augments RT, ~1.6 g/kg plateau (`10.1136/bjsports-2017-097608`) | `D` protein-augments · `D2` protein-resistance-training-plateau-1.6 · `J` attia-protein-muscle | **3×.** |
| Allostatic-load framework (`10.1056/NEJM199801153380307`) | `I` · `M` · `U` (allostatic-load-*) | **3×.** |
| Vitamin D null in replete (VITAL `10.1056/NEJMoa1809944`) | `D2` · `J` · `U` | **3×** (the `T` fracture claim is a distinct endpoint — OK). |
| TRE benefit ≈ the CR it causes (`10.1056/NEJMoa2114833`) | `D` tre-adds-nothing-to-cr · `D2` tre-benefit-is-mostly-the-cr | 2×. |
| Sauna 4–7×/week ↓ mortality (`10.1001/jamainternmed.2014.8187`) | `H` sauna-frequency-mortality-kihd · `J` rp-sauna-cohort | 2×. |
| CRF per-MET ↓ mortality (`10.1001/jama.2009.681`) | `E` crf-per-met-mortality-meta · `Y` crf-per-met-mortality | 2×. |
| Glucotypes in CGM non-diabetics (`10.1371/journal.pbio.2005143`) | `D` cgm-glucotypes · `L2` glucotypes-cgm | 2×. |
| Laron / GHR-deficiency cancer-diabetes protection (`10.1126/scitranslmed.3001845`) | `D` laron-ghr · `U` laron-gh-deficiency | 2× (the `S` peptide claim is a distinct, opposite-direction point — OK). |

**Recommendation:** these are not errors of fact (the grades agree), but the corpus would be cleaner if each duplicated finding had one **canonical claim** with the others either removed or converted to a lightweight cross-reference. No duplicate was found where the two copies *disagreed* on tier or direction — so duplication here is redundancy, not contradiction. (No exact-statement string duplicates were detected; all duplicates are same-finding-different-wording.)

---

## 6. Overall quality verdict + top fixes

**Verdict: HIGH quality and internally honest.** The corpus does what `SCHEMA.md` promises — it tiers claims rigorously, separates mechanism from outcome, and routes disagreement into first-class conflict objects instead of hiding it. JSON is clean (43/43 valid, 836/836 schema-conformant). Cross-chapter framing on the hardest, most-hyped topics (protein, apoB, sauna/cold, vitamin D, dementia risk, TRE) is **consistent across chapters**, which is the single best signal that the ~35 parallel agents stayed aligned. DOI sourcing is strong: 10/11 spot-checks correct, and the one error was the exact claim the corpus had already flagged as unverified — the honesty machinery works.

The defects found are **bookkeeping, not substance**: one wrong DOI (fixed), one stale conflict-id (fixed), 8 dangling conflict references (objects never authored — mostly oncology ch.25), some redundant same-finding claims, and a handful of PMID-anchored DOIs still nominally "to verify."

### Top fixes recommended (priority order)
1. **Author the 8 missing conflict objects** in `CONFLICTS.md` (esp. the 4 oncology ones — likely a single unfinished pass: `conflict-immunotherapy-cure-framing`, `conflict-mced-galleri-unproven`, `conflict-sugar-feeds-cancer`, `conflict-bad-luck-cancer-interpretation`; plus `conflict-omega3-predictor-vs-lever`, `conflict-exercise-prevents-dementia`, `conflict-mind-diet-cognition`). The referencing claims already exist and describe the tension — they just point at nothing.
2. **Batch-verify the ~14 remaining PMID-anchored DOIs** in `I-claims.json` (meditation) and `Z-claims.json` (genetics) against Europe PMC. Cheap; they carry PMIDs. (4 sampled were all correct.)
3. **De-duplicate the same-finding triples** (serotonin myth, bio-age clocks, VO2max, protein-1.6, allostatic load, vitamin-D-null): designate one canonical claim each, convert the rest to cross-references. Reduces the 836 count's redundancy without losing chapter coverage.
4. **Cross-link the three alcohol minimum-risk-dose claims** to `conflict-alcohol-jcurve` so the (reconcilable) framing differences are explicitly tied together.
5. **Cosmetic:** fix the "Skodje 2018"→2017 year label in `ncgs-real-symptoms-often-fructans-no-test` confidence_notes (DOI is correct).

### Fixes applied during this audit
- `O-claims.json` `altitude-mortality-epidemiology`: corrected DOI `…840579` (dead) → `…819250` (Faeh, *Circulation* 2009), re-verified.
- `J-claims.json` (2 claims): stale `conflict-protein-mtor` → `conflict-protein-mtor-longevity` (the registered object).
- Both files re-validated as well-formed JSON.
