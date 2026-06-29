# Dedup & Density Pass — Editor's Report

**Scope:** `_intake/health-longevity-fitness` — chapter prose (`reports/sections/*.md`) + graded-claim
files (`02-domains/*-claims.json`).
**Date:** 2026-06-29 · **Editor:** density & dedup pass.
**Driver:** `06-evidence/CORPUS-AUDIT.md` §5 (duplicate-claim clusters) + §6 (top fixes #3) and the new front
matter `reports/sections/00-start-here.md`, which now defines the three honesty rules **once** so chapters no
longer need to restate them.

**Net result:** ~**3,300 words** of redundant rule-restatement and verbose scaffolding removed from chapters
(git diff: 5,545 words on the removed side vs 2,242 re-added → net ≈ −3,303), **17 duplicate claims** marked
against **11 canonical owners**, and **0 facts / numbers / citations / claim-ids / debunks lost**. All 43
`*-claims.json` still parse; all edited markdown validates.

**Untouched per instruction:** `46-practitioner-claims-vs-evidence.md`, `06-evidence/CONFLICTS.md`,
`02-domains/practitioner-claims.json`, `reports/sections/00-start-here.md`.

---

## 1. The #1 redundancy — repeated "three honesty rules" preamble (37 chapters)

Every content chapter opened by restating the same three rules (predictor ≠ lever · cohort ≠ RCT · something
beats nothing), often with a 9–15-line numbered block. Now that `00-start-here.md` defines them once, each
chapter's **generic** restatement was collapsed to a single compact line:

> *Graded per the manual's evidence tiers; the three honesty rules — predictor ≠ lever, cohort ≠ RCT,
> something beats nothing — are defined up front in "Start Here."*

Chapter-specific *topic* intros, status/companion-data lines, one-line verdicts, tag tables, and "not medical
advice" blocks were all preserved. Where a numbered rule carried a **unique, load-bearing corollary**, that
corollary was kept as a short trailing clause (not cut).

### 1a. Straightforward blockquote/intro restatements → compact line (22 chapters)
`02, 03, 04, 05, 06, 07, 08, 09, 11, 14, 18, 20, 21, 22, 23, 24, 29, 35, 38, 43, 44, 45`
— ~9–15 lines each → 1 line. **~2,665 words removed.** Chapter-specific corollaries retained in **21**
(pain ≠ tissue damage / imaging ≠ diagnosis), **35** (dependence ≠ addiction; most use ≠ addiction; most
addiction remits), **43** (unchangeable cause ≠ unchangeable outcome), **44** (best modality = the one you
keep doing, `physical-activity-dose-response-mortality`), **45** (benefit and harm live in the same place).

### 1b. "## The three honesty rules, applied to X" H2 sections → condensed (9 chapters)
These were full sections that mixed the generic rules with genuinely domain-specific facts. Each was
**condensed in place** to a tight paragraph (renamed "How the three honesty rules cut for X") that drops the
generic tutorial scaffolding but **keeps every domain-specific fact and claim-id**:

| Ch | File | Domain facts preserved |
|---|---|---|
| 10 | medical-pharmacology | rapamycin/metformin/peptides not graduated; GLP-1/statin/SGLT2/SPRINT RCT-graduated; Bannister 2014; NNT/NNH; aspirin |
| 13 | endocrine-hormones | IGF-1 U-shape (`igf1-u-shaped-mortality`), lower-signaling longevity; low-T as illness marker; TRAVERSE / timing-stratified HRT |
| 15 | immune-system | hsCRP/IL-6/TNF-α predictors (Ridker/JUPITER); CMV / vitamin-C laundering; regulation beats more |
| 17 | organ-systems-atlas | eGFR & VO₂max predictors; ED→CVD / PDE5; protein & CKD; (one-line verdict block kept) |
| 19 | life-stages | Barker low-birthweight; DOHaD / Dutch Hunger Winter; folate/aspirin/GDM RCTs; resistance inversion §04 §4.3 |
| 28 | pharmacology-full | mechanism≠outcome + homocysteine story §18 A.5; CYP/pharmacogenomics; NNT/NNH |
| 40 | imaging-radiology | nodule/adrenal/disc predictors; LNT radiation model; thrombectomy + MASAI RCT-backed; pre-test question |
| 41 | pathology-lab | hsCRP/tumor-marker/calcium-score; screening-trial bar; "knowing when not to test" |
| 42 | reproductive-sexual | ED→CVD predictor; AMH/sperm count; LARC/HPV/aspirin/TRAVERSE RCTs; deficiency vs chasing youth |

**~530 words removed** across these nine, with zero fact loss (these double as density edits — see §3).

### 1c. Intentionally left intact — chapter-specific rule frameworks (5 chapters)
These do **not** restate the generic three; they carry their own load-bearing rule sets and were preserved:
- **27** derm/dental/ENT/eye — one compact bullet ("cleanest test of the three rules") with domain examples
  (IOP/glaucoma, charcoal abrasion, $2 fluoride). Kept as illustration, not generic restatement.
- **30** complementary-medicine — its own **five** rules (grade-per-indication, sham control, placebo bounded,
  "natural" ≠ safe, integrative ≠ evidence).
- **32** biohacking-fringe — its own **five** rules (mechanism≠outcome, the laundering gap, dose-sold≠dose-studied,
  survivorship, unregulated≠characterized).
- **33** public-health — defers to the corpus rules then adds **three of its own** (system≠self, predictor≠lever
  at system scale, cost-effectiveness as a moral fact).
- **36** fasting-cleanses — defers to corpus rules then adds the fasting-specific load-bearing distinctions
  (mechanism≠outcome, benefit = the CR not the schedule, "the body detoxes itself" is the null).

---

## 2. Duplicate-claim merges — `02-domains/*-claims.json` (17 marks, 11 clusters)

For each same-finding cluster the audit (§5) flagged, one **canonical** claim was designated (the
domain that owns the topic / best-sourced), and the redundant copies were marked with a
`"duplicate_of": "<canonical-id>"` field plus a one-line `"dedup_note"`. The non-canonical entries were
**kept** (not deleted) so chapter coverage and any inbound `claim-id` references stay intact — the safest,
hook-safe option per the brief. All 17 share an identical DOI with their canonical (verified, not assumed).

| Finding (shared DOI) | Canonical (kept) | Marked `duplicate_of` |
|---|---|---|
| Serotonin chemical-imbalance myth (`10.1038/s41380-022-01661-0`) | `mentalhealth: serotonin-deficiency-myth` | `V-nervous: serotonin-imbalance-myth`; `Q-brain: serotonin-depression-no-evidence` |
| Bio-age clocks not a validated personal surrogate (`10.1016/j.cell.2023.08.003`) | `L: biological-age-tests-not-validated-surrogate` | `C: biomarkers-of-aging-consortium-validation-gap`; `Z: methylation-age-not-validated-personal-surrogate` |
| VO₂max strongest mortality predictor (`10.1001/jamanetworkopen.2018.3605`) | `E: crf-vo2max-strongest-mortality-predictor` | `J: attia-vo2max-mortality`; `Y: crf-mortality-no-upper-limit` |
| CRF per-MET dose-response (`10.1001/jama.2009.681`) | `E: crf-per-met-mortality-meta` | `Y: crf-per-met-mortality` |
| Protein augments RT, ~1.6 g/kg plateau (`10.1136/bjsports-2017-097608`) | `D2: protein-resistance-training-plateau-1.6` | `D: protein-augments-resistance-training-gains`; `J: attia-protein-muscle` |
| Allostatic-load framework (`10.1056/NEJM199801153380307`) | `M: allostatic-load-framework` | `I: allostatic-load-stress-mediators`; `U: allostatic-load-stress-mediators` |
| Vitamin D null in the replete — VITAL (`10.1056/NEJMoa1809944`) | `D2: vitamin-d-null-in-replete-VITAL` | `J: rp-vitd-mixed`; `U: vitamin-d-supplement-null-in-replete` |
| TRE benefit ≈ the CR it causes (`10.1056/NEJMoa2114833`) | `D: tre-adds-nothing-to-cr-nejm` | `D2: tre-benefit-is-mostly-the-cr-it-causes` |
| Sauna 4–7×/week ↓ mortality (`10.1001/jamainternmed.2014.8187`) | `H: sauna-frequency-mortality-kihd` | `J: rp-sauna-cohort` |
| Glucotypes in CGM non-diabetics (`10.1371/journal.pbio.2005143`) | `D: cgm-glucotypes-nondiabetic-excursions` | `L2: glucotypes-cgm-nondiabetic-variability` |
| Laron / GHR-deficiency cancer-diabetes protection (`10.1126/scitranslmed.3001845`) | `D: laron-ghr-deficiency-cancer-diabetes-protection` | `U: laron-gh-deficiency-reduced-cancer-diabetes` |

**Validation:** all 43 `*-claims.json` parse (`json.load`, clean). No claim-ids deleted, so no cross-reference
(`conflicts_with`, `see`, `surfaced_via`) is broken. The corpus claim count is still 836; 17 of those are now
explicitly flagged as redundant copies (≈2% of the count was duplication), so the "independent finding" count
is effectively **819**.

> Note: these were marked, not deleted, to protect chapter coverage. A future pass that wants to *reduce* the
> raw count can safely delete any entry carrying `duplicate_of` after confirming nothing references its id.

---

## 3. Density edits

The corpus is already unusually tight — a pattern scan for the usual filler (throat-clearing, "it is worth
noting," "before we dive in," "as we saw above") returned **almost nothing**, which is a credit to the ~40
authoring agents. The real density wins were therefore structural:

1. **The 9 "applied-to-X" condensations (§1b)** are genuine density edits: each cut a ~150–220-word
   rule-and-example block to a ~90–130-word paragraph (~40% shorter) while preserving every domain fact and
   claim-id. That is 9 of the targeted ~15 density spots.
2. **Supplementary longest-chapter pass** (44, 27, 24, 23, 37) — a guarded in-place tightening of the five
   longest chapters (cut wind-ups, repeated within-chapter definitions, redundant list-item explanations;
   never a fact, number, citation, claim-id, or debunk):

| Chapter | Density edits | Net words saved (approx) | Note |
|---|---|---|---|
| 37 mitochondrial-health | 3 | ~28 | §37.1/§37.5/§37.8 wind-ups + "it gets its full statement here" meta-framing |
| 44 exercise-modalities | 2 | ~14 | kettlebell intro + §1 blockquote trailing filler |
| 24 disease-neuro-rheum | 2 | ~14 | "First, the summary table." + redundant Section-08 pointer (pointer kept) |
| 23 disease-respiratory-gi | 2 | ~24 | redundant not-medical-advice tail + doubled "IBS is real" sentence merged |
| 27 derm/dental/ENT/eye | 2 | ~22 | B.5 meta wind-up before the table + C.3 vertigo hype lead-in |

**11 edits, ~100 words** of pure filler/meta-commentary/within-chapter restatement removed — all facts,
numbers, claim-ids, study names, DOIs, debunks, tables, and the protected preamble lines left intact.
Combined with the 9 condensations in §1b, that is **~20 distinct density edits**, well past the ~15 target.
Overall chapter prose shrank by **~3,300 net words** (git diff across `reports/sections/`: 5,545 on the removed
side vs 2,242 re-added) with no substance lost.

---

## 4. Remaining redundancy recommended for human review

1. **apoB framing repeated near-verbatim** across `L`, `disease-cardiometabolic`, `S-pharma` (audit §3 found
   it *consistent*, which is good, but it is also three full explainers of the same causal story). Not merged
   here because each chapter needs to stand alone; a human may want a canonical apoB explainer with the others
   cross-linking.
2. **"Not medical advice" blockquotes** appear in 10, 13, 19, 42 (and others) with overlapping wording. Kept
   for per-chapter safety, but they could be standardized to one shared sentence + a pointer.
3. **8 dangling `conflicts_with` references** (audit §3) — out of scope here (conflict-object authoring, not
   dedup), but they remain the main integrity gap.
4. **Vitamin D "mixed" vs "null" wording** — `J: rp-vitd-mixed` is now `duplicate_of` the VITAL-null canonical;
   its statement says "mixed," the canonical says "null in replete." Same DOI/finding, but a human may want to
   align the one-word framing.
5. **The fracture-endpoint vitamin-D claim** (`T: vitd-no-fracture-benefit-replete`) was deliberately **not**
   marked duplicate — it is a distinct endpoint (fracture, not all-cause/CVD/cancer), per audit §5. Confirm
   that call.

---

*End of report.*
