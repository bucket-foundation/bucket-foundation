# Bucket Learning — Product Design

**Bead:** bkt-xo0 · **Working name:** *Bucket Academy* (codename **Polymath**) · 2026-06-11

A learning product built on Bucket's canon corpus. Personal study tool first (Gian's
general-exam prep), shareable with friends second, a Bucket Foundation product third.
Principle: **as rigorous as Anki, as fun as Duolingo, as deep as a PhD reading list.**

---

## 1. Case studies (what to steal, what to avoid)

### Anki — the retention engine
- **Steal:** spaced repetition actually works (active recall + spacing = the two
  highest-evidence learning techniques). Cloze deletion. Cards as the atomic unit.
  Open formats. Free core.
- **Use the modern algorithm:** **FSRS** (Free Spaced Repetition Scheduler) — supersedes
  SM-2, fits a per-user memory model (difficulty, stability, retrievability), schedules
  the next review at a target retention (e.g. 90%). This is our scheduler.
- **Avoid:** intimidating UI, lonely experience, *you* must author every card (huge
  friction), no curation/quality signal, no sense of progress or fun, ugly.

### Duolingo — the engagement engine
- **Steal:** the **skill tree** (a visible path, units unlock in order); **streaks** +
  daily goal + push reminders (habit formation); **XP / leagues / leaderboards**
  (social competition); bite-sized lessons (5 min); a **mascot** with personality;
  immediate feedback; freemium where the paid tier removes friction (hearts) not content.
- **Avoid:** gamification eating the learning (optimizing streak over understanding);
  shallow ceiling; manipulative dark-pattern notifications. Our content is *deep*, so we
  must guard against the streak becoming the point.

### Synthesis — Bucket's unfair advantages
1. **A curated dependency graph of foundations** (the nucleus), not a flat card pile —
   you always know *why* you're learning this and *what it unlocks*.
2. **The corpus is real and citeable** (arXiv/PMC/canon) — every atom links to primary
   sources; "learn from the actual papers," which Anki/Duolingo can't offer.
3. **AI generates the content** — cards, quizzes, explanations at 3 depths, mnemonic art —
   so the authoring-friction that kills Anki disappears.
4. **Polymathy** — cross-branch bridges no single-subject app has.
5. **Bucket IP rail** — a learner who writes a great atom/derivation can mint it (Story
   Protocol) and earn citation fees. Learning → contributing → canon.

---

## 2. AI leverage (especially art)

| Surface | AI does | Why it matters |
|---|---|---|
| **Card generation** | Turn a paper/section/atom into recall + cloze + derivation cards | Kills Anki's #1 friction (authoring) |
| **3-depth explanations** | Same concept at ELI5 / undergrad / grad level on demand | Meet the learner where they are |
| **Socratic AI tutor** | Conversational, asks *you* questions, catches misconceptions | A patient 1:1 tutor per learner |
| **Auto-difficulty** | Calibrate question hardness to FSRS state | Always in the desirable-difficulty zone |
| **Quiz from corpus** | Generate exam-style questions from frontier papers | Cutting-edge stays current |
| **Mnemonic ART** | Generate a memorable visual anchor per concept/equation | Dual-coding: images + words = far better recall |
| **Equation illustration** | Animate/diagram a master equation's terms | Makes math intuitive |
| **Concept "trading cards"** | Beautiful, collectible art per nucleus concept | Shareable, viral, fun — the Duo-style delight |
| **Mascot** | A Bucket character that reacts, encourages, quizzes | Personality + habit |

**Art is the wedge.** Every nucleus concept gets a generated **visual anchor** (the
`art_prompt` field on each Concept Atom). Equations become images; abstract ideas become
collectible "cards." This is the dual-coding learning-science win *and* the
screenshot-it-and-share viral loop Duolingo never fully exploited.

---

## 3. The learning loop (one session)

1. **Daily path** — FSRS surfaces today's due reviews + the next nucleus concept on your
   path. 5–20 min, your choice.
2. **Learn** — read the atom (Feynman-level first), see the art anchor, optionally ask the
   AI tutor to go deeper or quiz you Socratically.
3. **Drill** — recall / cloze / apply / **derive** / teach-back, scaled to your mastery.
4. **Feedback** — instant, with the *why*; misconceptions caught by the tutor.
5. **Progress** — XP, streak, the concept lights up on your branch tree; the graph shows
   what just got unlocked downstream.
6. **Gaps → Nucleus brain** — weak atoms feed back so tomorrow targets them; future
   sessions and the exam-simulator pull from your weak set.

---

## 4. Tiers

### Free — "you can actually learn here, for real"
- Full access to the **nucleus paths** of every branch (the foundations are free —
  on-mission for a nonprofit).
- FSRS spaced repetition, streaks, XP, branch skill-trees.
- Community decks (shared, upvoted).
- A **daily cap** on AI generations (tutor messages, custom cards, art) — generous enough
  to learn, capped enough to cost-control.
- Public concept art (pre-generated) — no per-user art beyond the cap.

### Pro — "the friction disappears" (target ~$8–12/mo, Duolingo-Super range)
- **Unlimited AI tutor** + unlimited card/quiz generation.
- **Import your own PDFs** (the textbooks *you legally own*) → auto-extracted into atoms +
  a personal deck. *(This is also the legal answer to the copyrighted-textbook problem:
  the user supplies what they own; we never host bootlegs.)*
- **Custom mnemonic art** generated to your prompts; collectible high-res concept cards.
- **Exam-Simulator mode** — timed, mixed-topic, exam-style (e.g. "biophysics general exam")
  with AI grading + a gap report.
- Advanced analytics (forgetting curves, mastery heatmap, projected exam-readiness date).
- Offline export (Anki-compatible).

### Scholar / Studio — "learn → contribute → earn" (higher tier or rev-share)
- Author atoms/derivations; **mint to Story Protocol** (Bucket IP), earn citation fees
  when others learn from your contribution. Closes Bucket's loop: learners become the
  canon's authors.
- Group/classroom mode for friends, cohorts, reading groups (shared streak, co-op leagues).

> Nonprofit framing: foundations are free forever. Paid tiers sell **AI horsepower,
> personalization, and exam tooling**, not access to knowledge — consistent with
> GOVERNANCE.md.

---

## 5. Social / viral (share with friends, make it fun)

- **Co-op leagues & shared streaks** — study with friends, climb together.
- **Challenge a friend** — send a 5-question quiz from any concept; compare scores.
- **Shareable concept cards** — the AI art anchors are screenshot-native; each card links
  back to the app (acquisition loop).
- **Public profiles / "knowledge portfolio"** — show which nuclei you've mastered across
  branches (the polymath flex).
- **Reading groups** — a cohort takes a branch's nucleus path together.

---

## 6. Build phases

- **P0 (now):** content + a CLI/markdown loop. Biophysics syllabus → ~40 atoms → a
  terminal quiz that schedules with FSRS. No UI yet; proves the engine + pedagogy.
- **P1:** web app (Next.js — Bucket is already Next on Vercel) — skill tree, daily loop,
  AI tutor, art anchors. Free tier only.
- **P2:** Pro tier — PDF import, exam simulator, custom art, analytics, Stripe billing
  (route metering through Viatika per org policy).
- **P3:** social + Scholar tier (Story Protocol minting), mobile.

Honest scope: P0 is days; P1 is the real product; P2/P3 are roadmap. Start P0 against the
biophysics nucleus so it earns its keep as *your* exam prep immediately.
