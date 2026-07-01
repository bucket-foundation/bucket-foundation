# Review Loop — Log

One entry per cycle. Newest at top. See `REVIEW-CHARTER.md` for the standard,
the personas, and the procedure.

Rotation: layperson → prose editor → practitioner → expert(guard) → repeat.

Baseline before cycle 1: 689 pages, 50 chapters, ~265k words, 1007 graded claims,
367 inline figures, 37 conflicts. Figures placed inline + show-not-tell reduction done.

---

<!-- LOOP COMPLETE — all 4 reader perspectives have passed over the book. -->

## Page-drop cycle — layout density (no content change)
The 4 reader cycles couldn't move the page count much because it's set by the 367 figures +
graded tables, not prose. This cycle attacked the layout/CSS directly in `build_manual.py`:
- Page margins 20/17/16mm → 14/14/12mm (bigger content area).
- Body font 9.7→9.35pt, line-height 1.4→1.3, paragraph spacing 6→4pt.
- Inline single figures max-width 80%→62%; figure margins tightened.
- Table font 8→7.5pt, cell padding 3.5→2.3pt; heading margins + list spacing tightened.
- **Result: 700 → 559 pages (−141, ~20%).** Zero content touched — every figure, claim,
  number, and citation identical; verified still readable (dense-textbook density).

## Cycle 4 — Skeptical expert guard + structural length (full-book pass) — FINAL
**Read:** 9 expert-guard readers audited every chapter for accuracy damage from 3 edit rounds, plus
a dedicated agent traced the true claim/conflict counts.

**Accuracy audit — the edits held.** Across the whole book: **1 real medical error**, a handful of
stale cross-refs and citation nits, no lost load-bearing content. Fixed:
- **ch.41: eGFR/muscle-mass direction was INVERTED** — now correct (high muscle → more creatinine →
  eGFR understates true function; frail → overstates, masking CKD). The one science error; the guard-
  last cycle exists to catch exactly this.
- Stale cross-refs from Cycle 3's consolidation: ch.28 grapefruit/anticoagulant/geriatrics pointers,
  ch.41 A.11/A.12→B.4/B.5, ch.34 §6.3→§6.4.
- Citation/factual nits: ch.23 Nobel 2006→2005, ch.17 FEV₁/FVC unit error, ch.27 glaucoma "second"→
  "leading" cause of irreversible blindness, ch.08 hearing "largest"→tied, ch.05 Laukkanen 2016→2017,
  ch.11 melanoma total-vs-invasive + bold nesting, ch.35 opioid attribution, ch.32 placeholder DOI,
  several "Hviid An/Jain An"→"A" typos.
- The guard also **rejected** a bad finding (unifying two distinct CALERIE claim-ids would have dropped
  a unique DOI) — correct call.

**Count reconciliation (verified ground truth):** summed all 54 domain JSON files → **1007 graded
claims** (990 distinct; 17 cross-domain duplicates) and **38 conflict objects** (23 open). 197/29/37
were stale snapshots. Made consistent across cover, atlas, State-of-the-Field (real tier distribution
now sums to 1007), the conflicts register (added the 9 missing rows 30–38), CANON_INDEX, FRONTIER,
go-deeper. Regenerated the `01-claims-by-tier` figure from live data → shows 1007.

**Structural length: ~3,000 words cut** — collapsed Go-deeper lists that re-listed footnote DOIs to
~5 picks each (keeping every unique citation, several caught and preserved), tightened end-of-chapter
"honest summary" restatements (kept as BLUF devices), halved over-long reference tables.

**Verified:** 367/367 figures placed, 0 broken footnotes, counts consistent book-wide.

---
**LOOP CLOSED.** 4 cycles: layperson (hooks, jargon, citations→endnotes) → prose editor (voice,
killed 148 "genuinely") → practitioner (BLUF boxes, ~5k words) → expert guard (accuracy + counts +
~3k words). Depth intact throughout: every graded claim, number, citation, and all 367 figures preserved.

## Cycle 3 — Busy practitioner + LENGTH REDUCTION (full-book pass)
**New founder mandate:** reduce length (added to the charter for Cycles 3–4). **Read:** 9 practitioner
readers over the whole book → findability gaps + ~12–15k words flagged cuttable.

**Patterns:** the honesty-rules preamble was re-taught in every chapter; "honest synthesis" sections
re-derived the body; cross-chapter debunks (natural≠safe, St John's Wort, grapefruit) were written out
in full in 3 chapters each; theses over-repeated (adherence-beats-optimality 5–6×, MOUD 6×).

**Applied (9 slice-apply agents):**
- **~5,000+ words cut** — collapsed repeated honesty-rules preambles to one first-use reminder + pointer;
  deduped over-stated theses/verdicts/debunks (kept the strongest single instance); trimmed synthesis
  sections that re-derive; consolidated cross-chapter debunks to single-home-plus-pointer.
- **~18 BLUF "Bottom line" boxes + ~25 skim signposts** added to long chapters (14 nervous 5,475w had
  its verdict buried at §8; also 07, 22, 24, 28, 39, 41, 02, 36, 19, 04, 29, 46), each lifting existing
  payoff — no new claims.
- **Safety verified:** all 367 figures still placed (0 lost), 1513 footnote markers unchanged (0 broken),
  0 citations dropped — cuts removed redundant prose only.
- **Fixed an over-cut:** the dedup pass pushed 4 marquee opening hooks down a section (foundations
  "Being alive is a verb", training "You do not start at the barbell", mitochondrial thesis, oncology);
  restored all four to lead their chapters, bottom-line box after.

## Cycle 2 — Prose / narrative editor (full-book pass)
**Read:** 9 parallel prose-editors line-read the post-Cycle-1 book → ~430 located findings.

**Unanimous #1 finding:** the word **"genuinely" was the author's verbal tic — 148 uses** (Cycle 1's
voice rule only caught touched sentences). Other patterns: "robust/robustly" as an AI evidence-word,
filler "really/truly/actually", a handful of run-ons / mega-bullets / triple-nested parentheticals,
and internal self-repeats (theses stated twice, cross-refs repeated 3×).

**Applied:**
- **Global sweep: all 148 "genuinely" removed** (script; then fixed the ~10 "a"→"an" and capitalization
  artifacts the deletion left, book-wide).
- **9 slice-apply agents** applied the located line-edits: ~120 edits total — "robust"→replicated/
  consistent, killed filler intensifiers, split run-ons, deduped repeats, recast **incidental**
  antithesis comma-splices as positive statements, fixed the ch.09 garbled "not smoking…" list and
  the ch.23 malformed-bold bug.
- **Protected the load-bearing motifs** (predictor ≠ lever survives 69×, mechanism ≠ outcome, regulate-
  not-boost, healthspan-not-lifespan) and every flagged GOOD line.
- **Judgment call:** a few marquee hooks used "not X, it is Y" antithesis (banned by house style), so
  they were trimmed to clean positives — "Cancer is a process — the corruption of the cell's own
  software"; "Being alive is a verb." Both still strong; the "not Y" tail can be restored if preferred.

**Result:** verified — 0 literal footnote markers, 346 figures intact, 0 "genuinely". PDF re-rendered.

## Cycle 1 — Smart motivated layperson (full-book pass)
**Read:** 9 parallel layperson readers across all 51 chapters → ~335 located findings.

**Unanimous patterns (ranked by how much they hurt the read):**
1. **Cold opens / build-scaffolding on the page** — every chapter led with a `> Status:` block (version stamps, `.json` companion paths, "gap this section fills / do not duplicate §Y" turf-maps, "maintained by Nucleus" footers). The real hook sat a screen down.
2. Private vocabulary undefined in-chapter (predictor ≠ lever, the honesty rules, backtick tier-codes).
3. Acronyms/jargon unglossed on first use, worst in the front-loaded at-a-glance tables.
4. Machine plumbing in reader prose (claim-id slugs, raw DOI strings).
5. Catalog fatigue (modalities/sports: 15–20 identical cards, payoff buried).
6. Trust dings: claim count 1007 vs 197; cover said 660 figures; +2 bugs (CYP450 row, "AED" typo).

**Applied (founder-approved directions): strip build cruft + lead with the hook; keep (Name, Year) inline, move DOIs/claim-ids to per-chapter "Sources & notes" endnotes.**
- All 51 chapters: opening rewritten to lead with the buried human hook; `Status:`/companion/turf-map/Nucleus scaffolding stripped; "not medical advice" demoted to one italic line.
- ~350+ first-use glosses added (acronyms, tier-codes, stats, the honesty rules).
- ~700+ inline DOIs/claim-ids moved to pandoc footnote endnotes (0 literal markers leak; all render).
- Bugs fixed: CYP450 CYP2C19+CYP2C9 misaligned rows; §40.7 "AED"→"AI model" typo; ~30 stray "genuinely"/antithesis voice violations.
- Catalog fatigue: "pick 3" boxes front-loaded in modalities + sports.
- Cover/colophon: 660→367 figures, 49→50 chapters.
- Build: `pandoc -citations`; footnote CSS labels the per-chapter endnote block "Sources & notes".

**Deferred to Cycle 4 (expert guard):** the count contradictions — 1007 vs 197 graded claims (and the 151 sub-sum), and 37 (cover) vs 29 (register) conflicts. Not guessed; flagged for reconciliation.

**Result:** 690-page PDF, all 367 figures + inline endnotes intact, zero information loss.

## Cycle 0 — setup (baseline)
- Charter + log created. Rotation set. No content changes yet.
- Next up: **Cycle 1 — Smart motivated layperson**, full-book pass.

## Book-structure pass — front matter reordered to real-book convention
Restructured the front matter in `build_manual.py` to read like an actual book:
- Order was Cover → Start Here → How-to → Contents → body.
- Now: Cover → **Edition/copyright page** → **Contents** → How to Read → **Start Here** → body → Colophon.
- Start Here now sits after the Contents as the book's introduction (per request).
- Added a clean edition/copyright page (title, first-edition 2026, sources, not-medical-advice, scale).
- Contents now lists the front matter (How to Read, Start Here) and back matter (Colophon) with page
  numbers, alongside the 13 Parts. 560 pages.

## Reference-book navigation (Track 1 of 3 requested improvements)
Turned the manual into a real reference book (build_manual.py + generated back matter):
- **Running headers** — the current chapter title flows into the top-right of every page
  (CSS string-set on .ch-title, carries across a chapter's pages).
- **Clickable cross-references** — every `§NN` / `§NN.M` in the text (2,720 of them) is now an
  internal link to that chapter's anchor (linkify(); chapter-number→cid map, sections/ only).
- **Glossary** — a 139-entry A–Z back-matter glossary (evidence-tier codes + biomarkers/acronyms +
  the manual's framing concepts), generated from a corpus frequency census, 2-column.
- **Index** — a 230-entry 2-column subject index; each term links to the chapters (§) it appears in.
- Front matter + back matter both listed in the Contents. 571 pages.
