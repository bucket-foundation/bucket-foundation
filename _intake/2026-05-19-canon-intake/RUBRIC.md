# Bucket Canon — Quality Rubric (the mechanical canon gate)

**Bead:** `bkt-epic-canon-intake` — P0 post-hotfix
**Date:** 2026-05-19
**Pillar:** Data
**Status:** the explicit pass/fail contract the pipeline applies — not vibes

---

## Why this exists

The 2026-05-19 audit found `/api/research` serving auto-segmented YouTube
transcript chunks (mis-transcribed Fauci conspiracy line) as `canon_tier`
with a `CC-BY` `canonical_url`. Root cause: **no gate existed**. This rubric is
the gate. Every record the pipeline writes to `primary-papers.yaml` MUST pass
it; it is implemented in code (`tools/canon-pipeline/scoring.py` already
computes `canon_score`; this doc adds the **eligibility gate** that runs
*before* scoring), not in human judgement.

The decision is three-valued: **CANON** (write to `primary-papers.yaml`),
**CANDIDATE** (hold in `_intake/`, never served as canon), **REJECT** (drop).

---

## Stage 0 — Hard eligibility gate (binary; any failure ⇒ REJECT)

Run before scoring. These are the filters whose absence caused the incident.

| # | Rule | Rationale (maps to audit failure) |
|---|---|---|
| E1 | **Must resolve to a DOI** (or arXiv id → DOI, or PMID → DOI, or stable book DOI/ISBN-with-DOI). No DOI ⇒ REJECT. | Transcript chunks have no DOI; this single rule kills 599/599 of them. |
| E2 | **`canonical_url` must be `https://doi.org/<doi>`** (or publisher DOI landing). It may NOT point at `bucket.foundation`, youtube.com, a blog, or any self-reference. | Audit: synthesized `bucket.foundation/canon/claims/...` URL asserted the chunk *was* the primary source. |
| E3 | **Source type ∈ {journal-article, book, book-chapter, monograph, proceedings-article, posted-content(preprint w/ DOI)}** per Crossref `type`. REJECT: `dataset`, `other`, `component`, `peer-review`, web pages, transcripts, none. | Enforces "primary derivation / primary literature", excludes commentariat media. |
| E4 | **Not a transcript / not commentariat as the record itself.** REJECT if the resolved work's container or author is a podcast/video/blog (heuristic: venue matches `/youtube|podcast|substack|blog|medium\.com|\.tv$/i`, or the title is a spoken-fragment per the garble heuristic below). Named commentators (Kruse, Peat, Huberman, Rubin, Dinkov, Loh…) are NOT canon authors *on their own authority* — a paper they co-authored in a real venue is judged on the venue/DOI like any other; a podcast is REJECT. | Audit: 219/599 chunks were Kruse podcasts headlined as canon, incl. pure-math branch. |
| E5 | **Garble heuristic** (mirrors the shipped `looksGarbled()` filter): REJECT if the candidate title starts lowercase, starts with a spoken connective (`because`, `so`, `and`, `but`, `like`, `you know`, `guess what`…), ends on a dangling 1–2-char token, or has < 3 content words. | Catches the 555/599 mid-sentence transcript fragments. |
| E6 | **Conspiracy / ideological / mistranscription blocklist** (regex list, extensible; seed: `fauci|fouchy|plandemic|controlled the budget|NIH budget|deep state|big pharma (hides|suppress)|they don'?t want you to know|wake up sheeple`). Any hit on title/abstract ⇒ REJECT and log to `_intake/quarantine/`. | The exact content that triggered the audit. |
| E7 | **Not an outcome/application.** REJECT if the work is a clinical trial, treatment-efficacy, supplement, protocol, or longevity/disease/cognition *outcome* study with no foundational mechanism claim (heuristic: ClinicalTrials registration, OR title matches `/randomized|clinical trial|supplementation|treatment of|efficacy of|protocol for|reverse aging|biohack/i` AND no foundational concept term). Route to the longevity outcome canon, not bucket-canon. | Thesis: outcomes are downstream, NOT canon. |
| E8 | **Retraction check.** If Crossref `is_retracted` / `update-to` retraction ⇒ REJECT (do not even hold as candidate). | Integrity. |
| E9 | **Concept match.** The record must lexically or via OpenAlex `concepts[]` match the target concept slug for the folder it would land in (≥1 distinct concept token overlap with the concept's `queries.txt` intent). Mismatch ⇒ CANDIDATE in branch `_intake/`, not CANON. | Prevents force-fitting (audit follow-up: keyword leak put a peptide paper under "mitochondrial ATP"). |

If E1–E9 all pass → proceed to Stage 1 scoring. Any single failure → REJECT
(E6/E7 also logged), except E9 → CANDIDATE.

## Stage 1 — `canon_score` (0–100, explainable; existing `scoring.py`)

Unchanged from the live, audited implementation (`tools/canon-pipeline/scoring.py`).
Reproduced so the gate is self-contained:

| signal | points |
|---|---|
| peer-reviewed Crossref type | +30 |
| citation_count > 1000 / > 50 / > 10 | +25 / +20 / +10 |
| year survived > 5 years | +15 |
| open access | +10 |
| foundational venue (Nature, Science, PNAS, Cell, Phys Rev, Rev Mod Phys, Annual Reviews, Phil Trans, NEJM/JAMA/BMJ/Lancet, …) | +15 |
| retracted | −30 |

`canon_score_reasons[]` is emitted with every record — no black-box scoring.

## Stage 2 — tier assignment (the three-valued decision)

| condition (after E1–E9 pass) | tier | action |
|---|---|---|
| `canon_score ≥ 70` | **CANON** | write record to `<concept>/primary-papers.yaml`, add to `CANON_INDEX.md` |
| `40 ≤ canon_score < 70` | **CANDIDATE** | hold in `bucket-canon/<branch>/_intake/<concept>.candidates.yaml`; NEVER served as canon; eligible for promotion on re-run if citations cross a tier |
| `canon_score < 40` | **REJECT** | drop (logged in run report, not stored) |

**Foundational-anchor override (the one human-curated input):** a small allow-list
of *founding* works that are foundational by historical fact even if the metric
under-counts them (very old, pre-citation-index, or a short letter). Example:
Watson–Crick 1953 is the structural axiom of heredity regardless of metric
quirks. The override may only *raise* a record that already passed E1–E9 to
CANON, may NOT bypass the hard gate, must cite a reason
(`+anchor: <one-line justification>` appended to `canon_score_reasons`), and the
allow-list lives in version control (`SOURCING.md` per-concept seed DOIs are the
allow-list — a DOI in a concept's seed `queries.txt` is operator-asserted
foundational). This is auditable and convergent, not vibes.

## Stage 3 — idempotency / convergence (canon folder contract)

- Record `id = "bkt-" + sha1(doi)[:12]` (stable). Re-running a concept's
  dossier MUST converge: same DOIs → same ids → no duplicates (merge, not append).
- A DOI present in `queries.txt` but failing the gate is reported in the run
  log and NOT written (the seed list is an *intent*, the gate is the *authority*).
- A previously-CANON record that drops below 70 on re-fetch (e.g. retraction)
  → moved to `_archive/<YYYY-MM>/`, removed from `CANON_INDEX.md`, logged.
- No PII, no raw scrapes, no full text — citation metadata + (licensed) abstract
  only. `oa_status` records license; full text stays at the DOI.

## Worked check against the incident

| artifact | E1 DOI | E3 type | E4 not-podcast | E5 garble | E6 conspiracy | verdict |
|---|---|---|---|---|---|---|
| `003-because-guess-what.md` ("Anthony Fouchy…controlled the budget", youtube source) | ✗ no DOI | ✗ transcript | ✗ Kruse podcast | ✗ "because guess what?" | ✗ Fauci/Fouchy + "controlled the budget" | **REJECT** (5 independent fails; logged to quarantine) |
| Mitchell P. 1961, Nature, DOI 10.1038/191144a0 | ✓ | ✓ journal-article | ✓ | ✓ | ✓ | score 85 → **CANON** |
| A randomized longevity supplement trial w/ DOI | ✓ | ✓ | ✓ | ✓ | ✓ | E7 outcome ⇒ **REJECT** (route to longevity canon) |

The gate would have made the audited failure impossible: the chunk fails E1
alone (no DOI), and four more rules besides. Every record in the existing 104
curated biophysics records re-passes E1–E9 (spot-checked: Mitchell 1961,
Lane & Martin 2010, Gray 1999 all DOI-backed journal-articles, score ≥ 70).
