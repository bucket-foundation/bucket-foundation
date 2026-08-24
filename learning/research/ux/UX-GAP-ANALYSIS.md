# Bucket Academy: UX Gap Analysis

**Date:** 2026-06-26 · **Author:** Nucleus (orchestrator) · **Bead:** bkt-jh0 (Academy EPIC)
**Method:** (1) re-read our own UX spec (`research/product/UX-CASE-STUDIES.md` "UX Bible" + `research/_synthesis/UX-SPEC.md`); (2) **Playwright walk-through of the live app** (`bucket.foundation/academy-app`, mobile + desktop), screenshots in `captures/2026-06-26/ours/`; (3) read the actual engine code (`learning/app/js/app.js`); (4) **Playwright capture of the reference platforms** (Duolingo, Math Academy, Brilliant, Khan, Anki), `captures/2026-06-26/refs/`.

> **scope note:** the logged-in *in-app* flows of Duolingo/Brilliant are bot-gated and need a founder login (a headed session), captured here are their marketing/onboarding surfaces + our own research. A headed logged-in deep-dive is the recommended follow-up (see §6). The *language* deck sits behind a native branch dropdown the headless walk couldn't open; that screen is analyzed from code (`app.js` §language) and is the top candidate for the headed pass.

---

## 0. Verdict in one paragraph

The Academy has a **beautiful, deferential, content-first shell** (parchment, serif, calm, Apple-adjacent) and a **real engine underneath** (FSRS, a graph, a diagnostic, mastery, non-punishing amber feedback). But the **product surface contradicts our own #1 UX decision**: the home is a **menu of concepts to choose from + a "Study & learn" reading view**, standing in for the **single computed "Today's Route"** that removes decisions. We built a *better textbook with flashcards*; we specced a *Duolingo-confident guided path over PhD-deep content*. The gap is biggest exactly where Duolingo's 2022 research says it matters most, **"am I doing this right?"** The **language deck** is the most acute instance: it is a vocabulary *branch* wearing the same generic shell, with silent language defaults, a cognitively-heavy polyglot framing, and a single exercise type. All of this is re-routing what already exists.

---

## 1. Scorecard: built app vs. our own 10 highest-impact UX decisions

(From `UX-SPEC.md` §"10 highest-impact decisions", our committed spec.)

| # | The decision we committed to | Built? | Evidence |
|---|---|---|---|
| 1 | **Graph = map, path = route; the computed route is the zero-decision default** | ❌ **Missing** | Home = `STUDY & LEARN →` + a flat **"CONTINUE LEARNING"** list of concepts, each with its own `LEARN` button. That's a *menu of choices*, the decision-paralysis Duolingo explicitly killed, standing where one computed next step belongs. (`ours/clean-10-home.png`) |
| 2 | **Onboarding teaches a real atom + animates the opening, before signup** | ⚠️ **Wrong shape** | Onboarding is a **6-slide intro carousel** (dots, "Learn the nucleus.", explanatory copy), *telling* where it should be *doing*. The bible's rule: "the first lesson IS the onboarding." (`ours/m-00-first.png`) |
| 3 | Atom leads with **functional art + 3-depth progressive disclosure** | ⚠️ **Reading-first** | Depth tabs exist (`LESSON / PLAIN / CORE / DEEP`) ✅, but the primary action `STUDY & LEARN` opens a **long-form reading view** ("Read straight through, foundations first"), i.e. *reread the textbook*, the one thing learning science says is the weakest mode. Art anchor not present in that view. (`ours/clean-30-lang-card.png`) |
| 4 | **Non-punishing amber feedback that names the misconception** | ✅ **Good** | `app.js`: wrong = amber (never red), reveals correct, reschedules sooner, "I knew it" override. This is well done. |
| 5 | Inline, **mastery-weighted XP** | ◑ Partial | XP exists as a stat; weighting/inline-reward moment not verified in the walk. |
| 6 | **Curated concentric-shell graph; always a local-neighborhood view** | ❓ Unverified | A `MAP` tab exists (bottom bar). Not reachable in the headless walk, assess in the headed pass. |
| 7 | **"Opens →" line + post-route opening animation** (the edge no competitor has) | ❌ Not visible | Not present on home or in the study view. This is our unique payoff and it's dark. |
| 8 | **Apple-grade tokens** (grid, 44pt, motion, **four states**) | ◑ Partial | Type/grid/calm = strong. **But the loading state is a bare serif "Loading…"** (`ours/*-00-load.png`), the spec says *never a bare spinner; content-shaped skeletons*. Empty state on home is "0 / 0 / 0/95 / 0", deflating, well short of the encouraging empty-state the spec mandates. |
| 9 | Studio = Whop model, Apple restraint | N/A | Not in scope yet. |
| 10 | Shareable concept card at the success peak | ❌ Not seen | The growth loop isn't surfaced in the daily flow. |

**Three drifts dominate:** **#1** (no zero-decision route, we show a menu), **#2** (intro carousel in place of do-first), and the **reading-first default** (#3) over retrieval-first.

---

## 2. The language deck

Why it's confusing.

Read from `learning/app/js/app.js` (`renderLangAtom`, `langDrill`, `langSettings`). Five compounding problems:

1. **It isn't a course, it's a *branch*.** Languages is one entry in the same top dropdown as Biophysics, and selecting it drops you into the **same generic shell** (a concepts list + `STUDY & LEARN`). There is no language-course mental model: **no level (A1/A2), no units, no topics, no path, no "where am I."** A learner expects a *course*; they get a word list.
2. **Silent language defaults.** `langSettings()` auto-picks **target = first non-English language (Spanish), known = [English]** with **no clear "I want to learn ___ / I already know ___" picker** surfaced first. The learner never *chose* Spanish, they're just suddenly in it.
3. **The polyglot framing is cognitively heavy for a beginner.** Each card shows the word **"in the languages you know"** across multiple known languages at once. That's our differentiator (learn via the languages you have), but for a beginner it **blurs the single source→target mapping** Duolingo deliberately keeps clean, and reads as clutter.
4. **One exercise type: cold typed recall.** The only drill is *"How do you say 'gold' (English: gold) in Spanish?" → type `oro`*. **No listen, match, select, tap-the-pairs, or speak.** Typing a foreign word from nothing is the *hardest* possible first rep, Duolingo rotates an easy format every 10-20s precisely to avoid this wall. (Optional sentence cloze follows, but it's still typing.)
5. **Honesty gap we already flagged.** `CLAUDE.md`: *"Languages status: working pieces, still short of a finished course (small deck, TTS-not-recorded audio, residual sense-noise)."* The UI doesn't *say* that, so it reads as a broken course rather than an experiment.

**Net:** the language deck violates the Duolingo lessons our bible is built on, guided path, one clean source→target, format variety, "am I doing this right?" confidence, while leading with our most advanced idea (polyglot) to absolute beginners.

---

## 3. Platform patterns we are NOT following

| Platform | The pattern | What we do instead |
|---|---|---|
| **Duolingo** | A **guided linear path** = the zero-decision home; **do-first** onboarding (you learn in the first 60s, signup deferred); **format variety** every 10-20s; **inline reward** the instant you answer. | Home is a **menu** + a **reading view**; onboarding is a **6-slide explainer**; language has **one** exercise type. |
| **Math Academy** | A **diagnostic that *drives* the path**, placement is the spine, then the knowledge graph sequences every task. (`refs/d-mathacademy-how.png`) | We *have* a diagnostic ("Know some already?") but it's a **secondary card** instead of the spine; the path it would feed doesn't exist yet. |
| **Brilliant** | **Interactive "do-to-learn"** first screen (manipulate, predict, get feedback), never "read then quiz." | Our primary action is **"Study & learn" = read straight through.** |
| **Anki** | **Pure retrieval** is the default and only loop. | We *have* FSRS but **bury it behind a reading view**; retrieval isn't the default verb. |
| **Apple HIG** | **One obvious next action**; **never a bare spinner** (skeletons). | Home offers **many** actions (a list of LEARN buttons); load screen is a **bare "Loading…"**. |

The through-line: **every best-in-class platform makes the next action singular and makes you *do* immediately. Our shell makes you *choose* and then *read*.**

---

## 4. What's good

- The **aesthetic**: parchment + serif + generous whitespace + calm chrome is real, differentiated, and on-brand. Don't gamify it into Duolingo's candy.
- The **engine**: FSRS, two-layer graph, mastery, the diagnostic, amber non-punishing feedback, all present and correct.
- **Depth tabs** (LESSON/PLAIN/CORE/DEEP) = the 3-depth progressive disclosure, built.
- **Verifiable credentials** (just shipped), the moat layer is real.

The problem is **routing and defaults**. The parts are fine.

---

## 5. Prioritized fixes

**P0, make the default a route in place of a menu.** Replace the home's `STUDY & LEARN` + concept list with **"Today's Route"**: one computed sequence (due FSRS reviews interleaved with the next new nucleus atom) and **one primary button** ("Start" / "Continue"). The concept list becomes the LIBRARY/MAP, never the home. *(Bible decision #1; the single highest-impact change.)*

**P0, onboarding = do the first atom, kill the carousel.** Cut the 6-slide intro to ≤1 screen; drop the learner straight into one real atom (Boltzmann) → a drill they get right → the **opening reveal** → deferred signup. *(Decision #2.)*

**P1, retrieval-first default.** The primary verb is **drill**, not "Study & learn." Reading becomes the secondary "go deeper." *(Learning science + decision #3.)*

**P1, language deck: make it a course instead of a word list.** (a) An explicit **"I want to learn ___ / I already know ___"** picker before anything; (b) a **leveled path** in place of a flat list; (c) **exercise variety**, lead with listen/match/select/tap-pairs, *then* typed recall; (d) **default to one source language** for beginners, with polyglot as an *advanced toggle*; (e) an **"experiment in progress"** banner until it is a course.

**P1, fix the four states.** Content-shaped **skeletons** instead of bare "Loading…"; an **encouraging empty state** (not "0 / 0 / 0").

**P2, light up the unique payoff.** The **"Opens →"** line + a **post-drill map animation** (node lights, edges draw), the edge no competitor has. *(Decision #7.)*

**P2, surface the diagnostic as the spine** (Math Academy pattern) and add the **shareable concept card** at the success peak (decision #10).

---

## 6. Recommended next step: the headed logged-in deep-dive

To turn this into pixel-level case studies, drive a **headed browser the founder is logged into** (no passwords typed by the agent) and capture the real in-app flows we can't reach headless:
- **Duolingo** logged-in: the path home, a lesson's format rotation, the reward/streak moment, the unit guidebook.
- **Math Academy**: the diagnostic → path handoff and a task screen.
- **Brilliant**: an interactive lesson's do-to-learn loop.
- **Our own** language deck (behind the branch dropdown) at full fidelity.

Then annotate side-by-side against §1, §3 here. (Pattern: `chromium-session.sh` persistent profile + Playwright over CDP.)

---

## Evidence
- `ours/m-00-first.png`, onboarding welcome (6-slide intro carousel)
- `ours/clean-10-home.png`, the home: menu + "Study & learn" where a route belongs
- `ours/clean-30-lang-card.png`, the "Study & learn" reading view (depth tabs)
- `refs/{m,d}-duolingo-home.png`, `refs/d-mathacademy-how.png`, `refs/m-brilliant-home.png`, `refs/m-khan-home.png`, `refs/m-anki-manual.png`, reference surfaces
