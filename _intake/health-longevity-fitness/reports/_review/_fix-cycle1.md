CYCLE 1 FIXES — apply to ONE chapter's markdown. Founder-approved directions from the
layperson review. Goal: make it a great READ without losing any depth. Work dir:
/home/gian/agfarms/bucket-foundation/_intake/health-longevity-fitness/reports

You get: the chapter file path, and the slice-findings file that contains this chapter's
specific reader notes (search it for your chapter). Apply these fixes IN PRIORITY ORDER:

── P1. FIX THE OPENING (highest value) ──
Every chapter currently opens with editorial build-scaffolding: a `> **Status:** v0.x (Wave N)`
block, `Companion data in ...json`, version stamps, domain codes, and "the gap this section
fills / do not duplicate §Y" turf-map blockquotes. STRIP all of that from the reader-facing text.
- DELETE: version/status stamps, `.json` companion-file mentions, "maintained by Nucleus /
  idempotent / converges on re-runs" footers, one-letter domain codes, and the turf-map prose
  whose only job is to tell the corpus what not to duplicate.
- PROMOTE the chapter's existing human hook to the very first line after the `# title`. Every
  chapter already HAS a great hook buried a screen down (e.g. oncology's "cancer is not a thing,
  it is a process — the corruption of the cell's own software"). Lead with it. If a chapter's
  hook is weak, write a 2-3 sentence one from its best material — stakes first, why-you-care.
- KEEP "not medical advice" but as ONE demoted italic line (e.g. at the end of the intro:
  `_Not medical advice. [Screening/other owner]: §07._`). Keep genuinely useful "this chapter
  covers X; drugs live in §10" as one plain sentence if it helps the reader navigate — cut the
  rest.

── P2. GLOSS ON FIRST USE (don't dumb down — just define) ──
The first time a load-bearing acronym / biomarker / stat term / tier-code appears in reader
prose, add a 2-6 word inline gloss in parentheses. Examples: apoB (the particle that carries
cholesterol into artery walls), VO₂max (a fitness/aerobic-capacity score), NNT (how many people
you treat to prevent one event), HR 0.6 (a 40% lower rate), `rct` (the strongest evidence tier),
"predictor ≠ lever" (something that forecasts risk isn't automatically something that, changed,
lowers it). Only first use, only where it carries the argument. Do NOT gloss every instance.

── P3. CHAPTER-SPECIFIC FIXES ──
Open this chapter's slice-findings file, find your chapter's section, and apply the concrete
BORED/LOST/SO-WHAT fixes it lists (front-load a "pick 3" box for catalog chapters, fix a flagged
typo or misaligned table row, add a signpost over a huge skim-this table, etc.). Skip anything
that would remove depth. Protect every GOOD passage it flags.

── P4. CITATIONS → per-chapter endnotes ──
Reader prose keeps the human cite inline as (Name, Year) — e.g. "(SPRINT, 2015)". Move the raw
DOI/PMID string AND the internal claim-id slug OUT of the prose into a pandoc footnote:
  in prose:  ...halved heart-failure deaths (SPRINT, 2015).[^sprint-hf]
  at end:    [^sprint-hf]: SPRINT — NEJM 2015. doi:10.1056/NEJMoa1511939. claim: sprint-bp-mortality (rct)
Rules: footnote labels unique within THIS chapter; pandoc auto-numbers them, do not number by
hand. Remove bare claim-id slugs that sit in reader prose with no citation (they live in the JSON
already). NEVER drop a DOI or claim-id — every one moves to a footnote, none is deleted. If a
chapter has dozens, convert them all; the footnotes collect into a "Sources & notes" endnote at
the chapter's end automatically.

── HARD CONSTRAINTS ──
- Do not remove any graded claim, number/effect-size, evidence tier, conflict, caveat, cross-ref,
  or the `@@FIG:...@@` markers. Depth is sacred; you are moving/glossing, not cutting substance.
- Voice: plain, direct. No antithesis ("X, not Y" comma-splices), never the word "genuinely",
  cut AI-tells (delve/leverage/seamless/robust/boost/"it's worth noting").
- Edit the markdown in place. Reply with: opening before→after (one line each), # of glosses
  added, # of citations moved to footnotes, and the chapter-specific fixes you applied.
