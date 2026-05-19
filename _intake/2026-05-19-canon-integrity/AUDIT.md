# Canon Integrity Audit — `/api/research` serves transcript sludge as canon

**Bead:** P0 (supersedes GTM): /api/research serves auto-segmented Kruse transcript incl. conspiracy as citeable canon
**Date:** 2026-05-19
**Pillar:** Data
**Status:** fast win SHIPPED in-repo (not pushed/deployed — orchestrator controls prod)

---

## 1. Audit — how the garbled "canon" is produced

### 1.1 Data flow (verified, with file:line)

```
GET /api/research?q=...&tier=insight
  └─ src/app/api/research/route.ts  GET()  (line 342)
       ├─ no funded wallet (prod: BUCKET_WALLET_PRIVATE_KEY unset)  → line 386
       └─ canonFallback(q, tier)                                     → line 387
            └─ buildIndex() + tokenRank(q, 6)   [src/lib/canon-search-index.ts]
                 └─ globs ONLY  bucket-canon/*/sub-claims/**/*.md   (line 90–110)
            └─ getEvidenceFor()                  [src/lib/canon-evidence.ts]
                 └─ _intake/embeddings/claim-evidence.jsonl
            └─ returns: answer = top.title + top.text.slice(0,600)
                        citation.canonical_url = .../canon/claims/<concept>/<slug>
                        license = "CC-BY-4.0"
```

The prod path is **always `canonFallback`**: `WALLET_FUNDED = Boolean(process.env.BUCKET_WALLET_PRIVATE_KEY)` (route.ts:75) is `false` on Vercel, so `route.ts:386-388` short-circuits to the local fallback for every request. The x402 gateway branch is dead code in prod.

### 1.2 Where the transcript chunks come from

`src/lib/canon-search-index.ts:79-134` `buildIndex()` walks `bucket-canon/<NN-branch>/sub-claims/<concept>/*.md` and indexes the `# ` title + `## Excerpt` block of every file. **It never reads `primary-papers.md`, `primary-papers.yaml`, `CANON_INDEX.md`, `SEED.md`, or `lineage.md`.** The only thing the search layer has ever seen is `sub-claims/`.

Every `sub-claims/*.md` is an auto-segmented YouTube transcript chunk. Header of `bucket-canon/05-biophysics/sub-claims/mitochondria/003-because-guess-what.md` (verbatim):

```
# Claim — because guess what?
- **Source**: [Red Light, Blue Light, Brain Damage: Dr. Jack Kruse Explains WTF...](youtube.com/watch?v=2njvFN-W4zc&t=1413)
- **Timestamp**: `00:23:33.280` (~1413s)
## Excerpt
> because guess what? The guy that controlled the budget, Anthony Fouchy, made sure we
> always focused in on RNA and DNA, not the mitochondrial DNA. That's why you never learned about UPES.
## Curation
- [ ] Verify excerpt against source
- [ ] Promote to canon (axiom / law / principle / derivation / observation)
- [ ] Cross-cite primary sources
```

Every curation checkbox is **unchecked**. These are raw, unverified, pre-curation captures. "Anthony Fouchy" is a mis-transcription of "Anthony Fauci"; the chunk is a named-conspiracy assertion. It was being served verbatim as the answer with `canon_tier` and a `CC-BY-4.0` `canonical_url` — i.e. a research-integrity nonprofit telling AI agents to cite-forever a misheard podcast conspiracy line as primary-research canon.

### 1.3 How "claims" get titles / canonical_urls

- **Title:** `canon-search-index.ts:72` — first `# ` line of the md, which the ingester set to the first ~12 spoken words of the chunk (`# Claim — because guess what?`). No editorial title.
- **canonical_url:** `route.ts:282` — synthesised string `https://www.bucket.foundation/canon/claims/<concept>/<slug>`. It points back at bucket itself, not at any primary source. Combined with `license: "CC-BY-4.0"` and `citation.type: "source"` this asserts the transcript chunk *is* the primary, attributable, citeable artifact.
- **canon_tier:** the OLD code hard-set `canon_tier: "candidate"` (route.ts old:259/296) — but the *answer text* said `"From the bucket.foundation canon (...)"`, `citation.type` was `"source"`, and the chunk was the headline. The "candidate" label was cosmetic; everything else asserted canon.

### 1.4 Quality gate

**None existed.** No transcription-error filter, no conspiracy filter, no garble filter, no primary-vs-candidate precedence, no abstention. `tokenRank` (canon-search-index.ts:155-173) is naive token-overlap over 599 chunks; whatever ranks first is the answer.

### 1.5 How widespread — all 7 branches, quantified

`bucket-canon/*/sub-claims/` md count (the entire API corpus = **599 files**):

| Branch | sub-claim concepts | sub-claim .md | curated `primary-papers.*` |
|---|---|---|---|
| 01-mathematics | 9 | 35 | **none** |
| 02-physics | 24 | 136 | **none** |
| 03-chemistry | 4 | 13 | **none** |
| 04-information | 4 | 9 | **none** |
| 05-biophysics | 23 | 198 | mitochondria, melanin, peptides, bioelectric-lineage (4 concepts only) |
| 06-cosmology | 12 | 52 | **none** |
| 07-mind | 15 | 105 | **none** |
| 08-deep-history | 10 | 42 | **none** |
| 09-sacred-texts | 4 | 9 | **none** |

- **599 / 599** indexed entries are auto-segmented transcript chunks. Zero curated primary content was ever in the search index.
- **219 / 599** sub-claim files literally name Jack Kruse in the Source line. The single largest source across the whole corpus is the *Jack Kruse × Huberman Rick Rubin podcast* (33 chunks). The "01-mathematics / chaos-theory" canon is a Kruse podcast saying *"jobs knew about it ... laptop why because he always"*. The thesis (canon = real math/physics axioms; Kruse = ONE partial source, not the centre) is **inverted**: Kruse podcasts are the plurality of every branch including pure math.
- **Quarantine quantification (new filter, applied to all 599):**
  - 4 hit explicit conspiracy/mistranscription patterns (Fauci/Fouchy, "NIH budget", "controlled the budget", etc.)
  - **555 / 599 (93%)** are garbled mid-sentence fragments (title starts lowercase or with a spoken connective, or ends on a dangling 1–2-char word)
  - **Only 44 / 599 (7%)** survive even as demoted candidate material.

**Transcript-derived vs primary, quantified:** 599 transcript-derived sub-claims served by the API; **0** primary papers served by the API (pre-fix). The real primary layer that *should* be canon: **104 machine-readable records** across 4 `primary-papers.yaml` files, all under 05-biophysics (mitochondria 30, bioelectric-lineage 27, peptides 26, melanin 21), each with title, authors, year, DOI, real `doi.org` `canonical_url`, `citation_count`, `canon_score` + reasons. Branches 01–04, 06–09 have **zero** curated primary records anywhere. `bucket-canon/05-biophysics/mitochondria/primary-papers.md` is the human-readable twin (Mitchell 1961 = "**the axiom**", Boyer 1993, Walker/Abrahams 1994 F1 structure, Margulis 1970, Lane & Martin 2010, Wallace 2005).

### 1.6 Honest answer to "is any flagship query in any branch currently citeable?"

**Pre-fix: no.** Every branch's answer was a garbled transcript fragment with a self-referential `canonical_url`. Nothing a scientist would cite. The curated primary-research existed on disk but was unreachable by the only code path prod uses.

---

## 2. Fix plan

### 2.1 Primary direction (adopted)

Make `/api/research` serve the **curated primary-research layer** as the canonical answer + citation; demote auto-transcript material out of `canon_tier`; quarantine garbled/conspiracy chunks; abstain honestly when no curated paper matches.

### 2.2 Sequenced plan

1. **[SHIPPED]** New `src/lib/canon-primary.ts` — dependency-free loader for the 104 `primary-papers.yaml` records (title/authors/year/DOI/canonical_url/citation_count/canon_score). `rankPrimary()` ranks by title-weighted lexical overlap + canon_score + log(citations) priors, with an **abstention gate** (≥1 distinct query term must appear in the top hit's *title*, else return `[]`).
2. **[SHIPPED]** `route.ts` `canonFallback` rewritten with explicit precedence: Layer 1 = primary papers → `canon_tier:"canon"`, `citation.type:"source"`, real `doi.org` `canonical_url`, structured authors/year/venue, `x-bucket-source: canon-primary`. Layer 2 (no primary match) = transcript candidates, **post-quarantine**, `canon_tier:"candidate"`, `citation.type:"candidate"`, answer explicitly states "UNVERIFIED ... NOT canon ... verify against primary sources". Transcript material is only ever `data.supporting_candidates[]`, each tagged `tier:"candidate"` + "one partial source — not canon", never the headline.
3. **[SHIPPED]** `isQuarantined()` filter: named-conspiracy/mistranscription regex list + `looksGarbled()` title heuristic. Drops 555/599 chunks before they can reach a caller.
4. **[FOLLOW-UP — founder/eng]** Semantic ranking. Keyword overlap still mis-ranks within the primary layer: `q="mitochondrial ATP synthesis"` returns a real 778-cite peptide paper (Zhao 2004) instead of Mitchell 1961, because Mitchell's title says "Phosphorylation" not "synthesis". Reuse the existing MiniLM embedding infra (`_intake/embeddings-v2/`) to embed primary-paper titles+abstracts and cosine-rank. Medium effort, not low-risk → deferred.
5. **[FOLLOW-UP — research/data]** Primary-layer backfill: 6 of 7 canon branches (01-math, 02-physics, 03-chem, 04-info, 06-cosmo, 07-mind) have **zero** `primary-papers.yaml`. Until backfilled, queries in those branches correctly *abstain* to the labeled-candidate path (no fabricated citation) but cannot return real canon. This is the `bkt-epic-canon-intake` Viatika x402 pipeline's actual job; it has not run.
6. **[FOLLOW-UP]** Add abstract/annotation to `primary-papers.yaml` schema so the `answer` can summarise findings, not just cite the paper.

### 2.3 Fastest safe shippable win

Steps 1–3 — **shipped this session**. Low-risk: additive new lib + a self-contained rewrite of one already-isolated function; `next build` green; no schema/data/infra change; `.vercelignore` untouched (primary-papers.yaml lives under `bucket-canon/` which is already shipped — the repo is the CMS). It does not fully *solve* ranking, but it categorically removes the existential failure: **no query in any branch can headline mis-transcribed conspiracy content as canon anymore.**

---

## 3. Before / after (local, exercising the real `GET` handler, wallet unset = prod path)

Harness: `scripts/audit-research-beforeafter.ts`

| Query | BEFORE (`canon_tier` / answer) | AFTER |
|---|---|---|
| `mitochondrial ATP synthesis` | served `canon`-asserting transcript: *"...mitochondrial DNA that we're talking about..."*; evidence incl. `003-because-guess-what` ("Anthony Fouchy ... controlled the budget"), `005` ("99 of the NIH Budget") | `canon_tier:canon`, `citation.type:source`, Zhao et al. 2004, **DOI 10.1074/jbc.M402999200**, 778 cites; transcript demoted to `supporting_candidates`, conspiracy chunks quarantined. *(Real cited paper — but not yet the ideal Mitchell 1961; see §2.2 step 4.)* |
| `Mitchell chemiosmotic coupling` | transcript fragment | `canon`, **Mitchell (1961), Nature, DOI 10.1038/191144a0, 4,599 cites** — "the axiom". **Fully citeable.** |
| `Bell inequality quantum entanglement` | physics transcript fragment served as canon | abstains from primary layer (no force-fit biophysics paper), `canon_tier:candidate`, answer explicitly *"NOT canon ... verify against primary sources"*. Honest. |
| `how do I tan my skin in France` (junk) | transcript fragment as canon | returns a real DOI-backed paper (keyword leak via "mitochondria"-class tokens) — known ranking ceiling, documented follow-up; still not transcript sludge. |

---

## 4. Shipped vs. follow-up

**Shipped (this session, in-repo, not pushed):**
- `src/lib/canon-primary.ts` (new) — curated primary-papers loader + ranker + abstention gate
- `src/app/api/research/route.ts` — primary-first precedence, transcript demotion, quarantine filter
- `scripts/audit-research-beforeafter.ts` (new) — before/after harness
- `BEADS-PENDING.jsonl` line 51 — bead → `in_progress` + progress_note

**Needs founder/eng follow-up (new beads):**
- Semantic ranking over primary-papers (embedding cosine; fixes ATP-synthesis-→-Mitchell precision and junk-query abstention) — *medium effort, was deliberately not cowboyed*
- Primary-papers.yaml backfill for 6 uncovered branches (`bkt-epic-canon-intake` / Viatika x402 pipeline must actually run)
- Schema: add abstract/annotation to primary-papers.yaml
- Stale `scripts/test-research-route.ts` asserts removed 502 behavior — unrelated, flag-only

**Honest call:** after this fix, **biophysics queries that name a curated concept are genuinely citeable** (Mitchell 1961, Lane & Martin, Wallace, Meredith eumelanin, etc., all with real DOIs). All other branches now **abstain honestly** instead of fabricating canon. The existential "nonprofit cites conspiracy as primary research" failure is closed; full multi-branch canon coverage is a pipeline backfill, not a code bug.
