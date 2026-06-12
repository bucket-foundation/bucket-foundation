# Bucket Academy (app)

A runnable, offline-capable learning app for the **biophysics nucleus** — spaced
repetition (FSRS) over a foundations-first knowledge graph. Built to the spec in
`../research/_synthesis/UX-SPEC.md` and `DECISIONS.md`.

## Run it
```bash
./serve.sh            # → http://localhost:8137
```
Open the URL. Progress is saved in your browser (localStorage). After one online load
it works fully offline (service worker caches the app + corpus + KaTeX).

## What works today
- **Today's Route** — a zero-decision daily queue: due reviews first, then the next
  highest-leverage concepts you're ready for (foundations before advanced).
- **Atom screen** — concept art card + 3-depth explanation (Plain / Core / Deep) +
  equation (KaTeX) + a retrieval drill (Show answer → rate Again/Hard/Good/Easy) +
  an "Unlocks →" line so you see what each concept opens up.
- **FSRS-5 scheduler** — real spaced repetition; target retention 0.90 (toggle 0.95
  exam-sprint in Settings).
- **Nucleus map** — concentric-shell graph (ring = shell, size = leverage, fill = your
  mastery). Tap any concept.
- **Progress** — streak, XP (mastery-weighted: derive ≫ recall), per-shell mastery bars,
  and a per-concept mastery list.

## Validate (used by the build loop too)
```bash
./validate.sh         # JSON integrity + JS syntax + a 60-day engine simulation
```

## Structure
```
app/
├── index.html              shell + service-worker registration
├── css/app.css             design system (Apple-grade tokens)
├── js/fsrs.js              FSRS-5 scheduler (vanilla, no deps)
├── js/engine.js            corpus load, leverage/nucleus scoring, route gen, persistence
├── js/app.js               UI (route loop, atom screen, map, progress)
├── corpus/biophysics.json  the atom corpus (the content)
├── sw.js, manifest…        offline / installable PWA
└── serve.sh, validate.sh
```

## Add content
Append atoms to `corpus/biophysics.json`. Each atom: `id, title, shell
(prereq|nucleus|frontier), requires[], equation (TeX), summary, depths{eli5,core,deep},
quiz[{level,prompt,answer,eq?}], sources[], art_prompt`. Run `./validate.sh` before
shipping. New-branch corpora (math, physics, …) follow the same schema.

## Honest status
Single-player, local-first P0/P1. No accounts, no AI tutor yet, art is a functional
placeholder (equation hero card) pending generated art. The scheduler, routing,
content, graph, and offline support are real and working.
