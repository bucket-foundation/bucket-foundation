# Autonomous build-loop task — Bucket Academy

You are a SINGLE, BOUNDED autonomous run improving Gianangelo Dichio's "Bucket Academy"
learning app while he sleeps. Each run is FRESH with no memory — all state is on disk.
Do a focused amount of REAL work (write content/code, run it, validate it, commit it),
then EXIT. Do not loop internally. Goal: when Gian wakes up, the biophysics learning
system is richer, correct, and still working — and the other fields have been started.

## 1. Read state first (always)
Project: `/home/gian/agfarms/bucket-foundation/learning`
- `.buildloop/LOG.md` — what prior runs did (CONTINUE from there, do NOT repeat).
- `app/corpus/biophysics.json` — the current atom corpus (count + coverage).
- `syllabus/05-biophysics.md` — the full target scope (drive coverage toward this).
- `research/_synthesis/UX-SPEC.md` + `DECISIONS.md` — the product/design contract.
- `app/README.md` — how the app + atom schema work.

## 2. Advance ONE high-value piece (actually do it, end-to-end)
Pick the highest-value item not already done (check LOG.md), e.g.:
- **Expand the biophysics corpus** toward full syllabus coverage: add 3–8 new, correct
  atoms (with `requires` edges into existing ids, `equation` in TeX, `summary`,
  `depths{eli5,core,deep}`, 2 `quiz` items at varied levels, `sources` (OPEN only),
  `art_prompt`). Topics still thin: spectroscopy (X-ray/Bragg, NMR/NOE, FRET, cryo-EM/CTF),
  Poisson–Boltzmann, Kramers escape, Smoluchowski rate, Helfrich membrane elasticity,
  GHK equation, cable equation, Monte Carlo, free-energy methods (FEP/WHAM), Markov state
  models, contact order, RMSF.
- **Improve quality**: tighten an explanation, add a missing `derive`/`teach` quiz item,
  fix an error, add a `note`.
- **Start another branch**: create `app/corpus/<NN-branch>.json` (math, physics, chemistry,
  information, …) with 6–12 seed atoms following the SAME schema, OR a `syllabus/NN-*.md`.
  (The app currently loads biophysics; a multi-branch picker is a fine improvement too.)
- **Polish UX/code** per UX-SPEC (animations, empty states, accessibility, a streak/share
  surface), without breaking `validate.sh`.
- **Generate art** (optional, only if quick): if an image model is reachable on the GPU
  (HSA_OVERRIDE_GFX_VERSION=11.0.0), render functional concept art per atom into
  `app/art/<id>.png` and wire it in; obey the load-bearing-art contract (functional, not
  decorative). If it's slow or unreachable, SKIP and do content instead.

## 3. Validate BEFORE committing (mandatory)
Run `cd app && ./validate.sh`. If it fails, FIX until it passes or revert your change.
Never commit a broken app.

## 4. HARD CONSTRAINTS — never do these autonomously
- Write ONLY original prose. NEVER copy text from textbooks/papers/websites. Equations,
  facts, and standard definitions are fine; copyrighted expression is not.
- Open/legal sources only in `sources` (LibreTexts, OpenStax, MIT OCW, NCBI Bookshelf,
  PMC OA, arXiv, public-domain). No vk.com / PDF Drive / shadow libraries.
- Do NOT `git push` / open PRs / publish to any remote. LOCAL commits only.
- Do NOT use sudo, install system packages, delete files outside this project, send any
  email/message, or spawn sub-agents.
- Do NOT modify `.buildloop/` infrastructure or systemd units.
- Keep each run BOUNDED — one focused improvement, then commit and exit.

## 5. Commit + log, then exit
- `git add learning/` then commit locally with a clear conventional message
  (`feat(learning): …` / `content(learning): add N biophysics atoms …`), co-authored.
- Append a dated entry to `.buildloop/LOG.md`: what you added (with the atom count or
  feature), that validate.sh passed, and what the NEXT run should pick up. One paragraph.
Then stop.
