# Bucket Learning
Unified UX Specification.

**Bead:** bkt-xo0 · 2026-06-11 · Synthesized by Nucleus from Product (UX bible) + the
Cross-pillar constraints from People (learning science), Customer Success (onboarding /
retention), Operations (accessibility), and Data (route generation).

Source of truth for the long form: `research/product/UX-CASE-STUDIES.md`. This is the
reconciled, buildable summary with the non-Product constraints folded in.

---

## Design principles

1. **Deference**, the content (the concept, its art, the equation) is the hero; chrome recedes.
2. **Clarity**, one primary action per screen; legibility and the 8-pt grid are non-negotiable.
3. **Depth via progressive disclosure**, the atom explains itself at **3 depths** (ELI5 → undergrad → grad), revealed on demand. This is Apple progressive disclosure *and* the pedagogically-correct way to meet a learner's level.
4. **Inevitability**, motion 200-500 ms, feedback < 100 ms, system haptics, all four states (empty / loading / error / success) designed. Nothing feels broken or abrupt.
5. **Informational, never flattering**, progress *informs* the learner and controls nothing (People + SDT). No fake "you're doing great." The graph lighting up *is* the reward.

## Information architecture

- **Home = Today's Route** (default; zero decisions). Due reviews + the next frontier atom, as an ordered list the engine computed. *Not* the graph.
- **Map** (deliberate second view), the nucleus dependency graph, concentric shells, navigable. Never the home screen.
- **Atom**, the learning unit screen.
- **Profile / Knowledge Portfolio**, mastery across branches (the polymath flex; shareable).
- **Studio** (Scholar tier only; progressively disclosed, the tab appears only for Scholars), author + sell + mint atoms/decks.

## Onboarding

1. Mascot welcome (warm, no form).
2. **Goal**, "What are you here for?" → exam prep / curiosity / polymathy / teach-myself (self-authored intention = autonomy).
3. Motivation mirrored back into later copy.
4. **Prior-knowledge fork → placement quiz over the nucleus graph**, critical for expert-adjacent users; start strong learners mid-graph, never at "what is energy." Boredom is the #1 churn risk.
5. **Daily goal** as *concepts/day* (1/3/5), defaulted sustainable ("consistency beats intensity").
6. **THE FIRST REAL LESSON, before signup**, one nucleus atom (e.g. Boltzmann distribution): functional art anchor + Feynman explanation + 3 recall/cloze prompts + instant *why* feedback + a citation to the primary source. **This is the activation/aha moment; it proves the differentiator and creates the sunk-cost that makes deferred signup compelling.**
7. **Notification opt-in** asked *after* the win (peak goodwill), value-framed.
8. **Soft, skippable signup wall**, loss-framed: "Save your progress so tomorrow's review targets exactly what you got wrong" (the FSRS benefit, framed as a reason to stay).

**Activation metric:** ≥3 nucleus concepts across ≥2 days in week 1 + a 3-day streak.

## The daily learning loop

1. **Learn**, functional art anchor first (dual-coding), then the explanation at the depth the learner picks; optional "go deeper" (next depth) and "ask the tutor" (Socratic, grounded, cites the corpus).
2. **Drill**, retrieval at the mastery level due: **Recall → Apply → Derive → Teach-back** (R/A/D/T). Every surface is a *test with feedback*, never rereading.
3. **Feedback moment**, non-punishing: wrong = amber (never red), name the misconception, reschedule sooner. Process-level, not just right/wrong (Hattie: bad feedback is net-negative).
4. **Progress**, XP awarded inline before you leave, **mastery-weighted** (derive ≫ recall) so the gradient points at understanding, well away from streak-farming. The atom lights up on the branch map; the **"Opens →"** line shows what just became available (the edge Anki/Duolingo lack).
5. **Optional share**, at the success peak, offer the shareable concept-art card (deep-links back to the atom = the growth loop).

## The nucleus map

- **Three concentric shells:** prerequisite (outer) → nucleus (mid) → frontier (inner), or rendered as rings by `shell`.
- **Encoding:** node *size* = centrality (Reach Score), *color* = shell, *fill* = your mastery.
- **Never raw force-directed** (the Obsidian "beautiful and useless hairball"). Curated layout (precomputed x/y or ring positions from Data).
- **Always-useful local view:** tap a node → its neighborhood (requires ← node → opens), scoped tighter than the whole graph.
- **Accessibility (Operations):** a screen-reader **list-mode** renders the route/graph as an ordered list, non-visual users get the same path.

## Components & micro-interactions

- 8-pt grid; 44pt min tap targets (24px WCAG floor, 44 for comfort); SF-grade type scale.
- Motion 200-500 ms with `prefers-reduced-motion` honored; feedback < 100 ms; system haptics on correct/incorrect/opened.
- All four states designed for every surface (empty/loading/error/success).
- Contrast ≥ 4.5:1; full keyboard nav + visible focus; dyslexia-friendly type option.

## The load-bearing-art contract

Art is the wedge **only if functional**. Decorative/seductive art *hurts* novices (≈ −0.3 to −0.5σ). Every art anchor must: depict the actual concept/mechanism (not a vibe), be referenced by the explanation, avoid irrelevant detail, carry alt-text, and survive the 8-point checklist in the People deliverable. Collectible cards inherit these rules. Decorative art is banned by the design system.

## Scholar / Studio

- One **minimal** storefront (vs Whop's cluttered dashboard); access-pass model for decks/cohorts.
- Transparent net economics surfaced to the author (citation-fee royalties, ~2% fee, 0% on royalties).
- Progressive disclosure, Studio exists only for Scholars; invisible to everyone else.

## The 10 highest-impact UX decisions
1. Graph = map, path = route; the computed route is the zero-decision default.
2. Onboarding teaches a real atom + animates the opening *before* signup.
3. Atom screen leads with functional art + 3-depth progressive disclosure.
4. Non-punishing amber feedback that names the misconception.
5. Inline, variable, **mastery-weighted** XP (depth not streak).
6. Curated concentric-shell graph, never force-directed; always a local-neighborhood view.
7. The "Opens →" line + post-route opening animation make reach visible.
8. Apple-grade quality enforced by design tokens (grid, targets, motion, haptics, type, four states).
9. Scholar/Studio = Whop's product model with Apple restraint + transparent economics.
10. Shareable concept card offered at the success peak, deep-linking back = the growth engine.
