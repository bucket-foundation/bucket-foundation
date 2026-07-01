# Review Loop — Log

One entry per cycle. Newest at top. See `REVIEW-CHARTER.md` for the standard,
the personas, and the procedure.

Rotation: layperson → prose editor → practitioner → expert(guard) → repeat.

Baseline before cycle 1: 689 pages, 50 chapters, ~265k words, 1007 graded claims,
367 inline figures, 37 conflicts. Figures placed inline + show-not-tell reduction done.

---

<!-- next cycle goes here -->

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
