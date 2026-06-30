# Review Loop — Charter

The standard this whole loop serves, in the founder's words:
**Don't sacrifice depth. Don't assume the reader is dumb. It should be engaging
AND a reference. At the end of the day it has to be super valuable.**

So every change is judged by one question: *does this make the book more valuable
to read without losing an ounce of depth or rigor?* Engagement that costs accuracy
is rejected. Simplification that condescends is rejected. We make it a great read by
making it clearer, better-signposted, better-paced, and better-voiced — never by
dumbing it down.

## How a cycle works

One persona per cycle does a **full-book pass**, then we apply the fixes and rebuild.

1. **Pick the next persona** in the rotation (see below).
2. **Fan out** that persona across the book so the read is deep, not skimmed: split
   the ~50 chapters into slices, one sub-reader per slice, each embodying the SAME
   persona and lens. Each returns prioritized, *located* findings (chapter + section +
   the specific sentence/table/figure) with a concrete proposed fix — not vibes.
3. **Synthesize** into one ranked list for the cycle: the highest-value fixes first,
   de-duplicated, with any cross-book patterns called out (e.g. "every chapter opens
   cold — no hook").
4. **Apply** the fixes to the section markdown (same per-chapter edit machinery as the
   figure work). Big structural changes get the founder's eye before mass application.
5. **Rebuild** `manual.html` → `manual.pdf`, mirror to Drive, append a cycle entry to
   `REVIEW-LOG.md`.
6. **Rotate** to the next persona next cycle.

## The reviewers (rotation order)

Order is deliberate: engagement and structure first (they expose the biggest gaps),
craft second, utility third, rigor last as a guard that the read got better without
the accuracy getting worse.

1. **Smart motivated layperson** — no medical training, sharp and curious. The honesty
   test for "is this a good read." Flags: where did I get bored, lost, or skim? What
   made me want to keep going vs. put it down? Where's the jargon I couldn't infer?
   Where did a chapter fail to tell me why I should care? NOT allowed to ask for
   dumbing-down — only for clarity, motivation, and pacing.

2. **Prose / narrative editor** — sentence-level craft. Flags: dead weight, limp
   openings, paragraphs that run too long, flat rhythm, weak transitions, no through-line,
   and any **AI-tells or antithesis** (see constraints). Owns voice and momentum.

3. **Busy practitioner** — wants to find and use things fast. Flags: navigation,
   signposting, missing summaries/TL;DRs, "I had to read four pages to get the answer,"
   tables that should exist, cross-refs that should be links.

4. **Skeptical domain expert** (the guard) — scientist/clinician. Reviews LAST each
   round. Flags: anything an earlier cycle's readability edit made inaccurate, overclaimed,
   or stripped of necessary caveat. Verifies claim-ids, evidence tiers, and conflicts are
   intact. Has veto over any change that softened the rigor.

## Hard constraints (every reviewer and every rewrite honors these)

- **Voice:** plain, direct, sounds like a person. No antithesis framing ("X, not Y",
  "not just X but Y", a clause contradicted by a comma-spliced clause). Never the word
  "genuinely" (or "truly"/"really" as intensifiers). Cut AI-tells: delve, leverage,
  seamless, robust, boost, "it's worth noting", "that said". No rule-of-three padding.
- **Depth is sacred.** Never remove a graded claim, a `claim-id`, an evidence tier, a
  conflict object, a number/effect-size, a citation/DOI, or a load-bearing caveat to
  make prose smoother. Move it, reframe it, or footnote it — never lose it.
- **Figures stay.** The 367 inline `@@FIG:slug@@` markers and their placement are not
  touched by readability edits unless a reviewer specifically argues a figure is wrong
  or misplaced (then it's logged as a figure issue, not a prose edit).
- **Reference apparatus stays.** TOC, part structure, § and claim-id cross-references,
  the evidence ladder, the conflict register.
- **Reproducible.** All edits land in the section markdown under `sections/` (and the
  few corpus files); the PDF regenerates from `build_manual.py`. Nothing is hand-edited
  in the HTML/PDF.

## Build / deliver (end of every cycle)

```
cd reports && python3 build_manual.py && weasyprint manual.html manual.pdf
rclone copy manual.pdf "gdrive:AGFarms/Nucleus/research/longevity-fitness-canon/practice/" -v
```
Drive: https://drive.google.com/open?id=1cSxXPvKoG3EIqQlvz51QmprVp3vv0YW_

Commit section edits + log per cycle. PDF/HTML are generated artifacts → Drive only.
