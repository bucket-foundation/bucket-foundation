# Bucket Academy — Onboarding, Retention & Community

**Pillar:** Customer Success · **Bead:** bkt-xo0 · **Domain pilot:** biophysics · 2026-06-11

> Founder mandate: *not fast — correct and amazing.* It must be **FUN and shareable with
> friends**, and as a Bucket Foundation product (a nonprofit teaching the *foundations* of
> each field), it must be **healthy by design** — we deliberately build the ethical version
> of every habit mechanic Duolingo pioneered.

This deliverable maps the canonical onboarding/retention/community playbooks (Duolingo
foremost, plus Strava, BeReal, Whop, and the behavioral-design literature) and translates
each into a concrete recommendation for Bucket Academy's biophysics pilot. Every mechanic
that crosses into manipulation is flagged **[MANIPULATIVE — use ethical variant]** so we
choose deliberately.

The single most important framing decision up front:

**We are a Facilitator, not a Dealer.** Nir Eyal's *Manipulation Matrix* asks two questions
of any habit-forming product: (1) *does it materially improve the user's life?* and (2)
*does the maker use it?* A "Facilitator" answers yes to both; a "Dealer" answers no to both
and is "manipulative and exploitative." Gian is building this as his own general-exam prep
(maker uses it), and learning the nucleus of biophysics is unambiguously life-improving
(materially improves life). That puts us squarely in the Facilitator quadrant — and it
gives us a hard test for every feature: **if a mechanic only boosts our metrics without
improving the learner's actual understanding, we don't ship it.**
([Hotjar — manipulation matrix](https://www.hotjar.com/blog/what-kind-of-product-creator-are-you/),
[Designli](https://designli.co/blog/using-the-manipulation-matrix-for-ethical-behavioral-design/))

---

## 1. Case study — Duolingo onboarding (screen-by-screen)

Duolingo's onboarding is widely treated as the gold standard because it inverts the normal
SaaS funnel: **it delivers value before it asks for anything.** The defining move is that
*the first lesson happens before account creation* — the app defers signup until the user
is already invested and has data they don't want to lose.
([UserGuiding](https://userguiding.com/blog/duolingo-onboarding-ux),
[Appcues/GoodUX](https://goodux.appcues.com/blog/duolingo-user-onboarding),
[Juno School](https://www.junoschool.org/article/duolingo-onboarding-experience/))

### The flow, in order

| # | Screen | What's shown | Why it works |
|---|--------|--------------|--------------|
| 1 | **Mascot welcome** | Duo greets you; no friction, no form | Personality + warmth before any ask; sets emotional tone |
| 2 | **Goal / language selection** | "What do you want to learn?" | The user states a *goal* — this is a self-authored intention, the seed of commitment |
| 3 | **Motivation question** | "Why are you learning?" → Travel / Career / Brain training / School | Segments the user *and* surfaces their own *why*; the app later mirrors this back ("you're closer to your travel goal") |
| 4 | **Prior-knowledge fork** | "New to [X]?" vs. "I already know some" | Respects the experienced user; routes them to a placement test instead of baby steps |
| 5 | **Placement test (conditional)** | Quick adaptive quiz for returning learners | Lets them *skip* what they know — competence respected, no boredom |
| 6 | **Daily-goal commitment** | "How much per day?" 5 / 10 / 15 / 20 min, framed Casual→Intense | A **commitment device**: the user picks their own target, increasing ownership (autonomy) |
| 7 | **Course preview / path** | A glimpse of the journey ahead | Sets expectation; shows the path is finite and walkable |
| 8 | **THE FIRST LESSON — before signup** | A real, completable lesson with instant feedback and a celebration | The aha moment. Value is *delivered*, not promised. Now the user has progress (XP, a nascent streak) to protect |
| 9 | **Notification opt-in** | Asked *after* the win, often framed as "Duo will remind you" | Timed to peak goodwill — opt-in rates are far higher right after a success than at cold start |
| 10 | **Signup wall (soft)** | "Create an account to save your progress" — skippable | Loss aversion does the work: you don't want to lose the streak/XP you just earned. Asked at the moment of maximum investment |

([Mobbin flow capture](https://mobbin.com/explore/flows/0acc27c7-4e01-481c-83b2-99f8d741bef1),
[Page Flows](https://pageflows.com/post/ios/onboarding/duolingo/),
[Braingineers neuromarketing study](https://www.braingineers.com/post/user-experience-design-a-neuromarketing-evaluation-of-duolingos-onboarding-flow))

### Why each principle transfers to Bucket

1. **Value before account.** A learner should *complete a real biophysics micro-lesson*
   (e.g. the Boltzmann distribution atom: read the Feynman-level explanation, see the art
   anchor, answer 3 recall/cloze prompts, get instant feedback with the *why*) **before we
   ask for an email.** This is the activation moment. It also proves the differentiator:
   "you're learning from the actual foundations, with a citation to the primary source."
2. **Self-authored goal + motivation.** Our equivalent of "why are you learning?" is
   richer and on-brand: *"What are you here for?"* → **General exam prep / Curiosity /
   Polymathy (collect nuclei across branches) / Teach myself a field.** Mirror it back in
   copy and in the path. This is autonomy (SDT need #1) from the first 30 seconds.
3. **Prior-knowledge fork is critical for us.** Our users skew *expert-adjacent* (Gian is
   prepping a PhD general exam). A placement quiz over the nucleus graph lets us **start a
   strong learner mid-graph**, not at "what is energy." Boredom is our #1 churn risk with a
   sophisticated audience — Duolingo's experienced-learner fork is the antidote.
4. **Commitment device = daily goal, but framed as concepts not minutes.** "How many
   nucleus concepts per day?" (1 / 3 / 5) maps better to deep learning than minutes.
5. **Soft signup wall.** Skippable, loss-framed: "Save your progress so tomorrow's review
   targets exactly what you got wrong." The promise is *the FSRS scheduler working for you*
   — a benefit, not a gate.

**Flag:** Duolingo's signup wall, notification ask, and goal-commitment are all healthy as
implemented (the user consents, the value is real). The only edge is screen 6's "Intense"
framing, which can nudge over-commitment. **Ethical variant:** default to a *sustainable*
goal and explicitly tell the user "you can lower this anytime — consistency beats
intensity." Under-promise the daily load; over-deliver on depth.

---

## 2. Retention mechanics — the habit engine, decomposed

### 2a. The Hook Model applied to learning

Nir Eyal's loop is **Trigger → Action → Variable Reward → Investment**, run repeatedly until
the behavior becomes automatic and *internal* triggers (an emotion) replace external ones.
([Nir & Far](https://www.nirandfar.com/how-to-manufacture-desire/),
[Amplitude](https://amplitude.com/blog/the-hook-model),
[MindTools](https://www.mindtools.com/aapqtdb/the-hook-model-of-behavioral-design/))

Mapped to Bucket Academy:

| Hook stage | Duolingo | Bucket Academy (biophysics) | Ethical note |
|---|---|---|---|
| **External trigger** | Push notification, email | A *well-timed* "X concepts due for review today" reminder | Healthy if it surfaces real, due FSRS reviews — not fake urgency |
| **Internal trigger** | Boredom, FOMO, "I should study" | Curiosity, exam anxiety converted to agency, the polymath itch | We want the internal trigger to be **mastery-seeking**, not anxiety |
| **Action** | One 5-min lesson | One 5–20 min session: due reviews + the next nucleus concept | Keep the floor *tiny* (1 review) so the action is always easy |
| **Variable reward** | Variable XP, surprise chests, combos, Duo's reactions | Variable: a new **concept art card** unlocked, a downstream node lighting up on the graph, a "you can now derive X" moment, occasional rare/holo card | Reward the *understanding*, surface real progress, not just points |
| **Investment** | Building a streak, vocab, friends | Your **knowledge portfolio** grows, your FSRS memory model gets smarter, you author atoms (Scholar tier), you add friends | Investment that makes the *next* session better for the learner is the healthy kind |

**The "investment" stage is our strongest ethical position.** Eyal's healthiest hooks are
ones where the user's investment *loads the next trigger* and *improves the product for
that user*. Every review you do makes our FSRS model schedule your next review better; every
weak atom feeds the "what to study next" engine. The learner's effort compounds into *their
own* better outcomes — not just our DAU. That's the Facilitator pattern.

### 2b. Streaks + streak-freeze psychology

Streaks are Duolingo's single most powerful retention lever, and the mechanism is **loss
aversion**: losses feel ~2× as painful as equivalent gains. A user with a 180-day streak
isn't chasing day 181 — they're terrified of losing the 180.
([Just Another PM](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature),
[Trophy.so case study](https://trophy.so/blog/duolingo-gamification-case-study),
[Medium / Bootcamp](https://medium.com/design-bootcamp/duolingo-and-the-psychology-of-streaks-why-you-cant-stop-learning-e926b190acaa))

Reported effects (vendor/case-study figures — directional, not peer-reviewed):
- Users with **7+ day streaks retain at ~2.4×** the rate of users who never form one.
  ([Darewell](https://darewell.co/en/duolingo-streaks-retention-secret/))
- Duolingo's own stat: a learner with a **7-day streak has ~90% D30 retention** vs ~20%
  without. ([Amplitude 7% rule](https://amplitude.com/blog/7-percent-retention-rule))
- **Streak Freeze reduced churn ~21%** for at-risk users.
  ([Trophy.so](https://trophy.so/blog/duolingo-gamification-case-study))
- A **streak wager → +14% D14 retention**. ([StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo))

**The danger (flag): the streak can become the point.** "Speed-running an easy lesson to
protect a streak activates the retention mechanism *without the learning*."
([dev.to](https://dev.to/pocket_linguist/why-duolingos-gamification-works-and-when-it-doesnt-1d4))
For a deep-foundations product this is fatal — a streak of empty sessions is anti-mission.

**[MANIPULATIVE — use ethical variant]** A raw streak that punishes any missed day and
rewards trivial activity is the manipulative version. Bucket's ethical streak:
1. **Streak counts *learning*, not logins.** A day counts only if you complete your due
   FSRS reviews *with genuine recall attempts* (not a 2-second skip). Tie the streak to the
   thing that's actually good for the user.
2. **Streak Freeze, generously.** Freezes/"rest days" remove the anxiety while keeping the
   identity. Frame it as healthy: "Rest is part of learning — your memory consolidates
   during sleep." This is the rare case where the mechanic is *more* ethical *and* more
   retentive.
3. **Streak Repair / "Earn Back."** Let a lapsed learner reclaim a lost streak by doing
   extra reviews in a window. Duolingo found this both lifts retention *and* makes the
   streak feel earned. ([Darewell](https://darewell.co/en/duolingo-streaks-retention-secret/))
   For us, "earn back" = catching up on overdue reviews — which is *exactly what the learner
   should do anyway.* Perfect alignment.
4. **Never weaponize the streak count for upsell.** Don't sell "streak insurance" that
   exploits a 500-day investment. (Duolingo's framing — "losing a 500-day streak feels like
   losing part of your identity" — is precisely the leverage we must not monetize.)

### 2c. The daily-goal / XP loop

XP is the universal currency: one lesson advances your streak, feeds your league rank, and
moves achievements — all at once.
([Orizon](https://www.orizon.co/blog/duolingos-gamification-secrets),
[The PM Repo](https://www.thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users-lessons-in-habit-formation))
Letting users **set their own daily goal** is an autonomy lever that raises intrinsic
motivation and lowers resistance.
([Uladzislau Shauchenka case study](https://www.uladshauchenka.com/p/duolingo-case-study-the-gamification))

**Bucket variant:** XP is fine as a *secondary* currency, but our primary progress signal
should be **mastery of nucleus concepts** (nodes turning from grey → mastered on the branch
graph). XP without understanding is a vanity metric; the graph lighting up *is* the
understanding. Tie XP to mastery events (first correct derivation, reaching FSRS stability),
not raw taps.

### 2d. Notification strategy — the famous (and notorious) reminders

Duolingo's notifications are run by a **bandit algorithm** that learns each user's pattern
and sends the message/timing most likely to re-engage *that person* (e.g. evenings if you
study at night). The infamous "guilt-trip" tone ("Don't let Duo down!") tested **5–8% more
effective** than neutral reminders, and ~60% of users report the emotional reminders as
*motivating* (25% neutral, 15% negative).
([Tino Mwadeyi](https://tinomwadeyi.substack.com/p/how-duolingo-perfected-the-art-of),
[Chantelle Marcelle case study](https://chantellemarcelle.com/duolingo-growth-marketing-case-study/),
[WebdesignerDepot](https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/))

**Where the ethical line is.** Brignull's original "dark pattern" definition is about
*deception*. Duolingo isn't hiding fees or blocking cancellation — so most critics conclude
the notifications aren't a classic dark pattern, but the *guilt* framing and the
deliberately sad/crying mascot art are emotional manipulation that some users find
off-putting enough to quit.
([Opinions & Conditions](https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt))

**[MANIPULATIVE — use ethical variant]** Guilt-tripping ("you're letting Duo down,"
crying-mascot-about-to-die imagery) is the manipulative edge. Bucket's notification ethics:
- **Notify about real value, not manufactured guilt.** "3 concepts are due — review them
  now to lock them into long-term memory" (true, useful) beats "Duo is crying."
- **Smart timing, opt-in, easy to dial down.** Adopt the bandit-style "send when *this*
  user actually studies" — that's genuinely respectful (right message, right time). Offer
  granular controls and a one-tap "fewer reminders."
- **Encouraging, never shaming.** Tone = a good tutor, not a passive-aggressive pet. Our
  mascot can be warm and funny without weaponizing sadness.
- **Cap frequency.** No nagging cascades. One well-timed daily nudge, max.

### 2e. Leagues, leaderboards & loss aversion

Weekly **leagues** = a 7-day XP competition across 10 tiers up to Diamond, with matchmaking
that pairs you against similarly-active users so it *feels winnable.* Effects: leagues
lifted lesson completion ~25%; leaderboard engagers complete ~40% more lessons/week.
([Trophy.so](https://trophy.so/blog/duolingo-gamification-case-study),
[StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo),
[Orizon](https://www.orizon.co/blog/duolingos-gamification-secrets))

**Flag / cautions for a deep-learning product:**
- Competition can corrupt the goal: people grind easy XP to climb, not to learn (same
  failure mode as streaks).
- Leaderboards can demotivate the bottom of the pack (violates SDT *competence* if you're
  always losing). The matchmaking-for-winnability fix matters.

**Bucket variant (lean co-op over competition):** For a foundations product, **co-op beats
cutthroat.** Default social = *Friend Streaks* and *cohort/reading-group* progress (Section
4), where you advance *together*. Make competitive leagues **opt-in** and scored on
*mastery-weighted* XP (deriving a hard concept > 20 cloze taps), so the leaderboard rewards
depth. This keeps the SDT *relatedness* benefit of social play without letting competition
eat the learning.

---

## 3. The "fun" engine — variable reward, surprise & delight

Duolingo's fun comes from four sources we can replicate and improve on:

**1. Variable reward.** Rewards are *unpredictable* — variable XP, surprise chests, combo
bonuses, the mascot's varied reactions. Uncertainty drives dopamine/anticipation and is
what keeps the loop compelling.
([Amplitude Hook Model](https://amplitude.com/blog/the-hook-model),
[Blake Crosley — Duolingo design language](https://blakecrosley.com/guides/design/duolingo))

**2. The mascot as a character with real personality.** Duo is "passive-aggressive and
funny — not 'educational,'" and expresses a full emotional range (happy, proud, excited,
sad, crying, dead). Anthropomorphizing the app turns a software interaction into a
**parasocial relationship** — users feel Duo is "personally holding them accountable,"
which is a major DAU driver. The design trick: Duo is a modular geometric "rig," so the
team animates thousands of expressions without losing brand consistency.
([Ziggle — the Duolingo effect](https://ziggle.art/the-duolingo-effect),
[Duolingo design system — Duo](https://design.duolingo.com/illustration/duo),
[Duolingo blog — building character](https://blog.duolingo.com/building-character/))

> **Flag:** the *crying / dying* mascot states are exactly the guilt mechanic from §2d. We
> adopt the warm/proud/excited/curious range and **deliberately omit guilt-shaming states.**
> Our mascot is a delighted fellow-scholar, not a hostage.

**3. Celebration moments + progress visualization.** Lesson-complete fanfare, streak-
milestone celebrations, the path filling in. These are the punctuation that makes effort
feel rewarded. ([Blake Crosley](https://blakecrosley.com/guides/design/duolingo))

**4. Collectible concept-art cards — Bucket's unfair "fun" wedge.** This is in PRODUCT.md
and it's the key differentiator: every nucleus concept gets an AI-generated **visual
anchor** (the `art_prompt` field). This does triple duty:
- **Learning science (dual coding):** image + words encodes far better than words alone —
  the art isn't decoration, it's a *mnemonic*.
- **Variable reward:** unlocking a beautiful (occasionally rare/holographic) card per
  concept *is* the surprise-and-delight chest — but the reward is tied to real mastery.
- **Viral loop:** the cards are screenshot-native and link back to the app — the
  share-with-friends acquisition engine Duolingo never fully built (§4).

**The governing rule — "the game must not eat the learning."** Every fun mechanic must be
*causally downstream of understanding*: you unlock the art by mastering the concept; the
graph lights up because you can now derive the next thing; the celebration fires on a real
learning event (first derivation, FSRS stability reached), never on a hollow tap. If a
mechanic can be farmed without learning, it's a dark pattern in disguise — redesign it so
the only path to the reward runs through comprehension.

---

## 4. Community / social — "share with friends," done healthily

This is the founder's headline requirement, and it is also — independently — one of the
strongest retention levers in the data. **Social visibility changes the psychology of
consistency:** apps with social streak features show avg streak length **5.69 days vs 4.25**
without. ([Trophy — Strava case study](https://trophy.so/blog/strava-gamification-case-study))

### 4a. What the social leaders teach

**Duolingo Friend Streak** (launched Aug 2024) — the most directly applicable mechanic:
- Maintain a *shared* streak with up to 5 friends; each must do one daily lesson to keep it
  alive. Learners with ≥1 Friend Streak are **22% more likely** to complete the daily
  lesson, rising with more streaks.
  ([Duolingo blog — Friend Streak](https://blog.duolingo.com/friend-streak/))
- Product lessons Duolingo published: the magic is **"social without interaction"** — "like
  studying next to a friend at the library"; accountability drives engagement with *zero*
  required collaboration. The **invite step is the biggest funnel bottleneck** (optimize
  that, not power-user retention). And **57% of users already had a friend on-platform**,
  which made social viable at all.
  ([Duolingo — 5 product lessons](https://blog.duolingo.com/product-lessons-friend-streak/))

**Strava — the social layer of fitness:**
- **Kudos** (a lightweight "like" on an activity) is a social-validation loop: 14B+ kudos
  given in 2025 (+20% YoY). Cheap to give, disproportionately motivating to receive.
- **Clubs** anchor weekly routines; runners *mimic the volume/frequency* of the friends
  they give kudos to — peer behavior is contagious. Network effects compound: more athletes
  → more segments/kudos/routes → more engagement → more referrals.
  ([Latterly — Strava strategy](https://www.latterly.org/strava-marketing-strategy/),
  [ScienceDirect — kudos study](https://www.sciencedirect.com/science/article/pii/S0378873322000909))

**BeReal — authenticity + a daily synchronous prompt:** a once-a-day, everyone-at-once
trigger creates a shared ritual and FOMO without leaderboards. The lesson: a *shared daily
moment* (a cohort all doing today's concept) builds relatedness cheaply.

**Whop / Discord / Skool — paid community + cohort mechanics:**
- The proven structure: **free Discord for discovery/culture, paid community (Whop/Skool)
  for cohorts, structured delivery, and progress tracking.** Daily engagement (questions,
  events, member interaction) is what reduces churn; cohort launches create revenue spikes
  ($10–50k) while memberships create predictable MRR.
  ([Whop — monetize a community](https://whop.com/blog/monetize-a-community/),
  [Whop — community for your course](https://whop.com/blog/create-an-online-community/),
  [AdvLaunch — Discord monetization](https://advlaunch.us/blog/discord-monetization-creators))

### 4b. Bucket Academy's social design (from PRODUCT.md §5, validated)

| Mechanic | Source pattern | Bucket implementation | Ethical/depth note |
|---|---|---|---|
| **Friend Streak** | Duolingo | Shared streak with up to 5 friends; counts only on a real review day | "Study next to a friend." Optimize the *invite* step (the bottleneck). Healthy: no guilt, you support each other |
| **Co-op leagues** | Duolingo leagues + Strava clubs | Opt-in, **mastery-weighted** XP; advance together | Co-op default; competitive opt-in only |
| **Challenge-a-friend quiz** | Duolingo + trivia apps | Send a 5-question quiz from any concept; compare scores | Fun, shareable, low-stakes; quiz pulls from the *real* atom |
| **Shareable concept cards** | (Bucket-native) | AI art card → screenshot → links back to app | The acquisition loop; the card teaches even out of context |
| **Cohorts / reading groups** | Whop/Skool cohorts + BeReal ritual | A group walks a branch's nucleus path together, with a shared daily concept | Relatedness (SDT #3); the deepest, most on-mission social mode |
| **Public knowledge portfolio** | Strava profile + GitHub contribution graph | Public profile showing mastered nuclei across branches — "the polymath flex" | Identity investment that's *true* (you really mastered it) |
| **Kudos on mastery** | Strava kudos | Lightweight cheer when a friend masters a hard concept or finishes a branch | Cheap to give, motivating to receive; celebrates *learning* |

**Why cohorts/reading-groups are the strategic bet.** They combine the three highest-value
patterns: BeReal's shared daily ritual + Whop's cohort structure + Strava's peer
contagion — all pointed at *walking a nucleus path together.* This is the most on-mission
social mode (a reading group is literally how scholars have always learned foundations) and
the most defensible (Duolingo can't do "read the primary papers together"). It's also the
natural bridge to the **Scholar tier** (Story Protocol minting): a cohort that masters a
branch can collectively author/refine atoms.

**Viral mechanics, ethical version.** Share because the artifact is *genuinely good and
useful* (a beautiful card that teaches a concept; a real score to compare), never via
forced-invite friction or fake "your friend tagged you" notifications. The Duolingo finding
that the *invite step* is the bottleneck means we should make sharing **delightful and
one-tap**, not coercive.

---

## 5. First-session → habit (activation, the D7 path, churn prevention)

### 5a. The activation metric

Activation = the % of new users who reach the **aha moment** (first experience of core
value) in a set window. It's the single best leading indicator of retention — "users who
activate are dramatically more likely to retain."
([Appcues — onboarding metrics](https://www.appcues.com/blog/user-onboarding-metrics-and-kpis),
[Chameleon — aha moment](https://www.chameleon.io/blog/successful-user-onboarding))

**The mature definition** isn't a single event — it's the **first completed habit loop**:
the aha moment *repeated several times at the desired frequency.*
([June — activation playbook](https://www.june.so/blog/activation-playbook))

**Proposed Bucket activation metric (the North Star input):**
> **A new learner who completes ≥3 nucleus concepts across ≥2 distinct days in week 1
> AND establishes a 3-day learning streak.**

Rationale: one lesson is the aha; *3 concepts over 2 days* is the habit loop forming; the
3-day streak is the loss-aversion hook engaging. This is the leading indicator we
instrument and optimize relentlessly.

### 5b. Day-7 as the habit checkpoint

D1 / D7 / D30 are the standard checkpoints; D7 and D30 reflect *genuine habit formation.*
Just **7% of users returning on day 7 puts a product in the top 25%** for activation —
retention is rare and hard. ([Amplitude — 7% rule](https://amplitude.com/blog/7-percent-retention-rule))
And recall the Duolingo data point: a 7-day streak → ~90% D30 retention. **So the entire
first-week job is: get the learner to a real 7-day streak.**

**The install → D7-habit path:**
1. **Session 0 (onboarding, §1):** goal + motivation + placement → **complete one real
   biophysics concept before signup.** Aha delivered. Soft signup wall (loss-framed).
   Notification opt-in *after* the win.
2. **Day 1–2:** FSRS surfaces yesterday's concept for review (spacing) + one new nucleus
   concept. The review *succeeds* (we scheduled it for ~90% retrievability) → competence
   reinforced. Streak = 2. Friend-streak invite prompt appears (the bottleneck — make it
   one-tap).
3. **Day 3:** 3-day streak → unlock the **Streak Society**-style milestone + first rare art
   card. Activation metric hit.
4. **Day 4–6:** the loop runs; the branch graph visibly fills; a "you can now derive X"
   moment fires when prerequisites complete. Cohort/reading-group suggestion surfaces.
5. **Day 7:** 7-day streak celebration; show projected exam-readiness date (Pro teaser);
   the learner now has identity investment (a streak, a portfolio, maybe a friend streak).

### 5c. Churn prevention & win-back

- **Streak Freeze / rest days** (§2b) — pre-empt the break before it happens. The single
  best churn-prevention mechanic, and the *ethical* one.
- **Streak Repair / "Earn Back"** (§2b) — recover a lapsed learner by having them clear
  overdue reviews — which is exactly the right learning behavior.
- **Win-back campaigns:** the right message at the right time recovers **5–15%** of churned
  users; **act fast** (effectiveness drops sharply after ~a month); **1 in 4 new subs come
  from previously-churned users** — lapsed users are a top acquisition channel. Lead with
  *value demonstration, not discounts.*
  ([Sequenzy](https://www.sequenzy.com/for/win-back-churned-users),
  [Braze — winback](https://www.braze.com/resources/articles/what-is-a-win-back-campaign-anyway),
  [Recurly](https://recurly.com/blog/customer-winback-strategies-for-subscriptions/))
- **Bucket win-back sequence (value-led, ethical):**
  1. **Day 2 of lapse:** "Your streak is frozen — pick up where you left off, [N] concepts
     are due." (Pre-churn save.)
  2. **Day 7:** "Here's what you mastered + what it unlocks next — [the graph image]." Show
     the portfolio they built; remind them of sunk value (true sunk value, not manufactured).
  3. **Day 14:** a *new* hook — "[New frontier paper / a polymath bridge you haven't seen]."
     Lead with novel value, not guilt.
  4. **Day 30:** feedback ask — "What made you stop?" (collect VOC; route to Product) — and
     then let go gracefully. No dark-pattern "are you sure?" cancel-traps, ever.

---

## 6. Support automation — AI-native help, FAQ & feedback at scale

As an AI-native product we should run support the way 2025 best-practice prescribes:
**reduce friction, not contact**, with a **RAG (retrieval-augmented) help assistant** over
our own docs/atoms.
([Crisp — self-service at scale](https://crisp.chat/en/blog/ai-self-service-support-at-scale/),
[Chatbase — AI support 2025](https://www.chatbase.co/blog/ai-customer-support-in-2025))

- **Accurate, source-attributed AI chat deflects ~40–50% of routine tickets**, freeing
  humans for the hard cases. ([Wonderchat — RAG benchmark](https://wonderchat.io/blog/rag-ai-customer-support-2025))
- ~**80% of CS orgs** are expected to use AI by 2025; the modern assistant interprets
  intent and pulls from docs/CRM rather than following scripted trees.
  ([LiveChatAI stats](https://livechatai.com/blog/ai-revolution-in-customer-support-statistics))

**Bucket's advantage: the support corpus already exists.** Our Concept Atoms, PRODUCT.md,
and KNOWLEDGE-ARCHITECTURE.md are structured markdown — perfect RAG ground truth. And we
*already have* a Socratic AI tutor in the product; the support assistant is the same
infrastructure pointed at "how the app works" instead of "how biophysics works."

**Recommended support stack (P1→P2):**
1. **In-app RAG help assistant** over docs + a curated FAQ. Source-attributed answers
   (cite the doc), so it can't hallucinate policy. Always offer "talk to a human" escape.
2. **Self-service FAQ** seeded from predictable questions: billing/Viatika metering, "how
   does the streak count," "what is FSRS / why this review now," "how do I import my own
   PDF" (the legal-boundary question — route to the canonical Operations answer), "how do
   friend streaks work."
3. **Feedback routing (VOC).** Every "this card is wrong / this explanation is unclear"
   becomes a structured signal: **content errors → Data** (atom quality), **bugs →
   Engineering**, **feature requests → Product**, **pedagogy complaints → People.** File as
   beads; this is how CS closes the loop.
4. **Content-accuracy guardrail (critical for an educational product).** Unlike a normal
   support bot, *wrong answers here teach wrong physics.* The RAG assistant must refuse to
   improvise on factual content — for "is this concept correct?" it cites the atom's primary
   source or escalates, never freelances. (Coordinate with People on AI-tutor hallucination
   safety.)

---

## Manipulative-mechanic register (the ethical-variant cheat sheet)

| Mechanic | Manipulative form | Bucket's ethical variant |
|---|---|---|
| Streak | Punishes any miss; rewards trivial activity; streak-insurance upsell | Counts *real reviews*; generous freezes/rest days; earn-back = clearing overdue reviews; never monetize the streak count |
| Notifications | Guilt-trips, crying/dying mascot, nagging cascades | Value-based ("N due"), smart-timed, opt-in, capped, encouraging tone |
| Mascot | Weaponized sadness to coerce | Warm/proud/curious only; no guilt-shaming states |
| Leaderboards | Cutthroat; demotivates the bottom; rewards XP-farming | Co-op default; competitive opt-in; mastery-weighted scoring |
| XP / points | Vanity metric farmable without learning | Tied to mastery events; the graph is the true progress signal |
| Signup wall | Coercive, hides the skip | Skippable, loss-framed around *real* saved progress |
| Cancellation / win-back | "Are you sure?" cancel-traps, dark-pattern friction | One-tap cancel; value-led win-back; graceful let-go |
| Sharing/virality | Forced-invite friction, fake tag notifications | One-tap, delightful; share because the artifact is genuinely good |

**The one test that catches them all (Manipulation Matrix):** *would Gian, the maker, be
happy receiving this mechanic himself, and does it make the learner's understanding
genuinely better?* If no to either → it's the Dealer move → redesign or cut.

---

## Sources

- Duolingo onboarding: [UserGuiding](https://userguiding.com/blog/duolingo-onboarding-ux) · [Appcues/GoodUX](https://goodux.appcues.com/blog/duolingo-user-onboarding) · [Juno School](https://www.junoschool.org/article/duolingo-onboarding-experience/) · [Braingineers](https://www.braingineers.com/post/user-experience-design-a-neuromarketing-evaluation-of-duolingos-onboarding-flow) · [Mobbin](https://mobbin.com/explore/flows/0acc27c7-4e01-481c-83b2-99f8d741bef1) · [Page Flows](https://pageflows.com/post/ios/onboarding/duolingo/)
- Hook Model & ethics: [Nir & Far](https://www.nirandfar.com/how-to-manufacture-desire/) · [Amplitude](https://amplitude.com/blog/the-hook-model) · [MindTools](https://www.mindtools.com/aapqtdb/the-hook-model-of-behavioral-design/) · [Hotjar — manipulation matrix](https://www.hotjar.com/blog/what-kind-of-product-creator-are-you/) · [Designli](https://designli.co/blog/using-the-manipulation-matrix-for-ethical-behavioral-design/)
- Streaks / retention data: [Just Another PM](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature) · [Trophy.so — Duolingo](https://trophy.so/blog/duolingo-gamification-case-study) · [Darewell](https://darewell.co/en/duolingo-streaks-retention-secret/) · [StriveCloud](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo) · [Orizon](https://www.orizon.co/blog/duolingos-gamification-secrets) · [Amplitude — 7% rule](https://amplitude.com/blog/7-percent-retention-rule) · [dev.to](https://dev.to/pocket_linguist/why-duolingos-gamification-works-and-when-it-doesnt-1d4)
- Notifications & dark patterns: [Tino Mwadeyi](https://tinomwadeyi.substack.com/p/how-duolingo-perfected-the-art-of) · [Chantelle Marcelle](https://chantellemarcelle.com/duolingo-growth-marketing-case-study/) · [WebdesignerDepot](https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/) · [Opinions & Conditions](https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt)
- Mascot & fun: [Ziggle](https://ziggle.art/the-duolingo-effect) · [Duolingo design — Duo](https://design.duolingo.com/illustration/duo) · [Duolingo blog — characters](https://blog.duolingo.com/building-character/) · [Blake Crosley](https://blakecrosley.com/guides/design/duolingo)
- SDT & ethical gamification: [Springer meta-analysis](https://link.springer.com/article/10.1007/s11423-023-10337-7) · [TheoryHub — SDT](https://open.ncl.ac.uk/theories/20/self-determination-theory/)
- Community / social: [Duolingo — Friend Streak](https://blog.duolingo.com/friend-streak/) · [Duolingo — 5 product lessons](https://blog.duolingo.com/product-lessons-friend-streak/) · [Trophy — Strava](https://trophy.so/blog/strava-gamification-case-study) · [Latterly — Strava](https://www.latterly.org/strava-marketing-strategy/) · [ScienceDirect — kudos](https://www.sciencedirect.com/science/article/pii/S0378873322000909) · [Whop — monetize](https://whop.com/blog/monetize-a-community/) · [Whop — community](https://whop.com/blog/create-an-online-community/) · [AdvLaunch — Discord](https://advlaunch.us/blog/discord-monetization-creators)
- Activation & churn: [Appcues](https://www.appcues.com/blog/user-onboarding-metrics-and-kpis) · [Chameleon](https://www.chameleon.io/blog/successful-user-onboarding) · [June](https://www.june.so/blog/activation-playbook) · [Sequenzy](https://www.sequenzy.com/for/win-back-churned-users) · [Braze](https://www.braze.com/resources/articles/what-is-a-win-back-campaign-anyway) · [Recurly](https://recurly.com/blog/customer-winback-strategies-for-subscriptions/)
- Support automation: [Crisp](https://crisp.chat/en/blog/ai-self-service-support-at-scale/) · [Chatbase](https://www.chatbase.co/blog/ai-customer-support-in-2025) · [Wonderchat — RAG](https://wonderchat.io/blog/rag-ai-customer-support-2025) · [LiveChatAI](https://livechatai.com/blog/ai-revolution-in-customer-support-statistics)

*Note on data: many retention percentages above come from vendor/case-study blogs, not
peer-reviewed studies — treat them as directional. The mechanism claims (loss aversion,
SDT, the Hook Model) rest on the stronger academic/primary sources cited.*
