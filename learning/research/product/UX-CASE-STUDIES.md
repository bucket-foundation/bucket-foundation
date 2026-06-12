# Bucket Academy (codename *Polymath*) — The UX Bible

**Pillar:** Product · **Bead:** bkt-xo0 · **Author:** Product (Nucleus) · 2026-06-11
**Mandate:** Not fast — *correct*. Apple-grade UX. Depth over speed. Pilot domain: biophysics general-exam prep.
**Sources:** open / legal only. Every claim cited inline.

> This document is the unified UX specification for Bucket Academy. It rigorously dissects three case
> studies — **Apple Human Interface Guidelines**, **Duolingo**, **Whop** — extracts concrete,
> replicable patterns, and synthesizes them into a buildable IA + flows + components spec.
> Read with `KNOWLEDGE-ARCHITECTURE.md` (the Concept Atom + dependency graph) and `PRODUCT.md` (tiers).

---

## 0. The thesis in one paragraph

Bucket Academy teaches the **nucleus** of a field — the smallest set of load-bearing foundations that
unlock the most adjacent understanding — by walking a learner along a **dependency graph** of Concept
Atoms, drilling each with **FSRS spaced repetition**, wrapped in a product that is **as rigorous as Anki,
as fun as Duolingo, and as beautiful as something Apple shipped.** The differentiator is the *graph of
foundations* (you always know *why* you're learning this and *what it unlocks*), a *real citeable corpus*
(learn from the actual papers), *AI-generated content + art* (kills authoring friction; dual-codes memory),
and a *contributor rail* (learn → author atoms → mint to Story Protocol → earn citation fees). The three
case studies map to the three jobs the UX must do: **Apple = make it feel inevitable and trustworthy**,
**Duolingo = make the daily habit form and feel rewarding**, **Whop = make the creator/Scholar economy
legible and frictionless.**

---

# PART I — CASE STUDIES (what to steal, what to avoid, with mechanics)

## 1. APPLE — Human Interface Guidelines: deference, clarity, depth

Apple's HIG is organized around three load-bearing principles — **Clarity, Deference, Depth** — plus a
fourth, **Consistency**, across platforms.
([developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines/),
[netguru.com/blog/ios-human-interface-guidelines](https://www.netguru.com/blog/ios-human-interface-guidelines))

### 1.1 The three principles, operationalized

- **Clarity** — every element is legible, precise, unambiguous. The canonical example: a button labeled
  **"Send Payment"** beats one labeled **"Submit"** because it removes the need to recall context.
  ([brilworks.com/blog/apple-human-interface-guidelines](https://www.brilworks.com/blog/apple-human-interface-guidelines/))
  - **Replicate:** never label a drill button "Submit" or "Next" generically. Label by *consequence*:
    "Check answer", "Reveal derivation", "Mark as mastered", "Schedule for tomorrow".
- **Deference** — the UI recedes so the *content* is front and center; minimize chrome and decoration.
  ([developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines/))
  - **Replicate:** the Concept Atom (the explanation + the equation + the art) is the hero of every
    screen. Navigation, XP counters, streak chrome, and the AI tutor all sit *around* the content,
    never on top of it. The atom screen is mostly whitespace and one beautiful idea.
- **Depth** — visual layers + realistic motion convey hierarchy and meaning; transitions are
  *informative*, not decorative.
  ([developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines/))
  - **Replicate:** when a concept is mastered and *unlocks* a downstream concept, the motion must
    *show the dependency* — the new node lights up and an edge animates from the just-mastered node to
    it. Depth = the graph literally getting deeper.

### 1.2 Concrete numbers and rules to enforce (Apple-grade quality gate)

| Rule | Spec | Source |
|---|---|---|
| **Minimum tap target** | 44×44 pt — *including* secondary actions | [HIG / search synthesis](https://moldstud.com/articles/p-a-comprehensive-guide-to-apple-human-interface-guidelines-for-ios-apps) |
| **Minimum font size** | 11 pt (iOS/iPadOS); avoid light weights — use medium/semibold/bold for readability | [netguru](https://www.netguru.com/blog/ios-human-interface-guidelines) |
| **Dynamic Type** | Support it — text scales to the user's accessibility setting; never hard-code pixel type | [netguru](https://www.netguru.com/blog/ios-human-interface-guidelines) |
| **Feedback latency** | Visual or haptic confirmation within **100 ms** of any interaction | [search synthesis](https://moldstud.com/articles/p-a-comprehensive-guide-to-apple-human-interface-guidelines-for-ios-apps) |
| **Transition duration** | 200–500 ms; longer fatigues, shorter feels janky | [search synthesis](https://moldstud.com/articles/p-a-comprehensive-guide-to-apple-human-interface-guidelines-for-ios-apps) |
| **Color semantics** | Blue = primary action, Red = destructive only ("Delete") | [netguru](https://www.netguru.com/blog/ios-human-interface-guidelines) |
| **Haptics** | Use *system-defined* haptics consistently (`UIImpactFeedbackGenerator`, `UINotificationFeedbackGenerator`); users lean on them most when not looking at the screen | [developer.apple.com/.../feedback](https://developer.apple.com/design/human-interface-guidelines/patterns/feedback/) |
| **Iconography** | Use **SF Symbols** — thousands of weights/scales/rendering modes that align to the SF system font automatically | [developer.apple.com/.../sf-symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) |

**The 8-point grid** is the discipline that produces Apple's "it just works" calm: all spacing,
padding, and component dimensions are multiples of 8 (4 for fine adjustments). We adopt an **8-pt
spacing scale** (4, 8, 16, 24, 32, 48, 64) as a hard token set; nothing ships off-grid.

### 1.3 Progressive disclosure (the most important Apple pattern for *us*)

Apple's broader design language repeatedly favors **revealing complexity only on demand** — show the
simple thing first, let depth unfold as the user reaches for it. This is the literal UX expression of
our pedagogy: the **3-depth explanation** (ELI5 → undergrad → grad). The atom opens at Feynman level;
a tap reveals the formal statement; a tap reveals the full derivation; a tap opens the primary source.
Each layer is *deferred* until requested. This is Apple's progressive disclosure mapped onto Bucket's
"learn the nucleus, derive the rest."

### 1.4 "It just works" inevitability — what it actually means to build

"Inevitability" is the *absence of decisions the user shouldn't have to make.* Operationalized:
- **One obvious next action per screen.** The daily loop never presents a menu; it presents *the next
  card* and a single primary button.
- **State is always saved, never lost.** (Mirror Duolingo's "your progress is saved" reassurance.)
- **Defaults are correct.** FSRS picks what's due; the user doesn't configure intervals.
- **Errors are recoverable and never punishing.** A wrong answer schedules a sooner review — it does
  not delete progress or shame the learner.

### 1.5 The 2026 layer: Liquid Glass

Apple's current design direction ("Liquid Glass") emphasizes **Hierarchy, Harmony, and Consistency**
through translucent, layered materials that keep content primary while letting the UI sit as a
deferential glass layer above it.
([createwithswift.com/liquid-glass-redefining-design](https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/))
- **Replicate sparingly:** use translucent material *only* for transient chrome (the tutor sheet, the
  bottom drill bar, the share-card composer) so the atom content shows through and stays the hero.
  Do **not** make the learning content itself glassy — readability of equations and explanations is
  non-negotiable.

---

## 2. DUOLINGO — the engagement engine, decomposed

### 2.1 The 2022 path redesign — *why they killed the skill tree* (this is our key precedent)

In November 2022 Duolingo replaced the branching **skill tree** with a single linear **path** for all
learners. ([blog.duolingo.com/new-duolingo-home-screen-design](https://blog.duolingo.com/new-duolingo-home-screen-design/))

**The stated reasons (verbatim rationale):**
1. Learners "weren't sure whether they were using the app correctly." The tree's freedom of choice
   created **decision paralysis and doubt** — *am I doing this right?*
   ([blog.duolingo.com](https://blog.duolingo.com/new-duolingo-home-screen-design/))
2. The path "removes the guess-work" by guiding learners so they can be "confident that each step…is
   the best for reaching their language goals."
   ([blog.duolingo.com](https://blog.duolingo.com/new-duolingo-home-screen-design/))
3. **Ordering is grounded in spaced repetition** — instead of finishing all five crown levels of one
   skill before moving on, concepts from different skills are *interspersed* and revisited on an
   expanding schedule.
   ([blog.duolingo.com](https://blog.duolingo.com/new-duolingo-home-screen-design/),
   [duolingo.fandom.com/wiki/Language_tree](https://duolingo.fandom.com/wiki/Language_tree))

**What the path added:** embedded Stories (moved into the path at the right difficulty), unit-level
**Guidebooks** (tips consolidated per unit instead of per-lesson pop-ups), and Practice built into the
daily path rather than being optional maintenance.
([blog.duolingo.com](https://blog.duolingo.com/new-duolingo-home-screen-design/))

**The cost / the controversy:** power users were "massively outraged" at losing customization and the
ability to choose what to study; Duolingo "chose accessibility over customization, beginners over
experts."
([duoplanet.com/duolingo-new-learning-path-review](https://duoplanet.com/duolingo-new-learning-path-review/))

**The lesson for Bucket — the central tension of our whole product:**
> Duolingo's evidence says a **guided linear path** beats a free-choice tree for *confidence and habit*,
> **but** Bucket's whole thesis is the **dependency graph** (the nucleus, the bridges, the polymath
> flex). We cannot abandon the graph — it *is* the product. **Resolution: the graph is the map; the
> path is the route.** Default experience = a Duolingo-style linear "today's route" the engine computes
> for you (zero decisions, confidence). The full dependency graph is a *second view* you can open to
> see where you are, what's unlocked, and to deliberately jump (the power-user affordance Duolingo
> removed — we keep it, but it is never the default). This directly answers the "hardest UX problem"
> below.

### 2.2 The session / lesson loop (the unit of habit)

- A lesson is **8–10 parts, completed in 3–5 minutes**; each part takes **10–20 seconds** and varies
  format (matching, construction, speaking) to prevent boredom.
  ([deconstructoroffun.com](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth))
- Difficulty sits in the **"Goldilocks Zone"** — at the edge of ability, neither too easy nor too hard
  ([deconstructoroffun.com](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth)) —
  which is *exactly* FSRS's "desirable difficulty / target retention" framing. Our scheduler already
  produces this; the UX just has to *surface* the right-sized challenge.

### 2.3 The feedback moment (the dopamine hinge)

- **XP is delivered before the user can leave the lesson screen** — the reward signal is tightly coupled
  to the behavior; immediate positive feedback.
  ([orizon.co/blog/duolingos-gamification-secrets](https://www.orizon.co/blog/duolingos-gamification-secrets))
- Feedback is "instantaneous" and praise is "frequent — within sessions, after sessions, and between
  players."
  ([deconstructoroffun.com](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth))
- **Variable rewards** (XP boosts, streak freezes, timer boosts, gems) are dispensed *randomly* after
  lessons — the unpredictability is what compels repetition more than a fixed reward would.
  ([deconstructoroffun.com](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth),
  [strivecloud.io/blog/gamification-examples...duolingo](https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo))

### 2.4 Streak, XP, leagues — the retention surfaces (with measured impact)

| Mechanic | What it is | Measured effect | Source |
|---|---|---|---|
| **Streak** | Consecutive days with the daily goal met; loss aversion intensifies as it grows | iOS streak **widget → +60%** commitment | [orizon.co](https://www.orizon.co/blog/duolingos-gamification-secrets) |
| **XP** | Points per lesson, shown immediately | Active leaderboard users do **+40%** lessons/week | [trophy.so/blog/duolingo-gamification-case-study](https://trophy.so/blog/duolingo-gamification-case-study) |
| **Leagues** | Weekly tiers (Bronze→Diamond etc.), promote/demote by XP within matched bands | Introducing leagues **+25%** lesson completion | [trophy.so](https://trophy.so/blog/duolingo-gamification-case-study) |
| **Streak Freeze** | Forgiveness item that protects a streak for one missed day | Reduces the "rage quit on breaking" churn | [deconstructoroffun.com](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth) |
| **Daily / Friend Quests** | Time-boxed goals; friend streaks & co-op quests | Adds variety + social loss aversion | [deconstructoroffun.com](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth) |

### 2.5 The Hook loop (Nir Eyal model, as Duolingo runs it)

**Trigger** (push notification with Duo's emotion / internal streak anxiety) → **Action** (open app,
near-zero friction, 3–5 min) → **Variable reward** (XP, streak kept, league climb, surprise chest,
hearts saved) → **Investment** (longer streak = more loss aversion, league position at stake, friends
see your progress).
([thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users](https://www.thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users))
Duolingo sends **>1 billion notifications/year**, personalized per user's historical response patterns,
streak status, and behavior.
([orizon.co](https://www.orizon.co/blog/duolingos-gamification-secrets))

### 2.6 Duo the mascot — emotional design

Duo expresses **happiness** (correct / streak kept), **sadness** (in notifications), **frustration**
(multiple wrong), **celebration** (lesson complete), and **crying** (streak about to break). The
"threatening owl" meme began as user-generated content and Duolingo's social team leaned into it
aggressively, turning the mascot into a viral cultural object.
([medium.com/.../duolingo-streak-system](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f),
[orizon.co](https://www.orizon.co/blog/duolingos-gamification-secrets))

### 2.7 Onboarding *before* signup (the commitment ladder)

The flow, in order, *all before any account is created*:
([goodux.appcues.com/blog/duolingo-user-onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding),
[junoschool.org/article/duolingo-onboarding-experience](https://www.junoschool.org/article/duolingo-onboarding-experience/))
1. Friendly mascot welcome.
2. **Goal selection** (what do you want to learn / why) — motivation question (Travel / Career / Brain
   training) personalizes future nudges without being intrusive.
3. **"First time or already know some?"** → optional **placement test** to skip basics.
4. **Daily goal commitment** (5 / 10 / 15 min) — a small commitment that creates ownership.
5. **The first lesson IS the onboarding** — you *do* the thing immediately and feel successful; you are
   not shown how to learn, you learn.
   ([junoschool.org](https://www.junoschool.org/article/duolingo-onboarding-experience/))
6. **Signup is deferred and made compelling by sunk cost** — "create an account to save your progress"
   appears *after* you've earned XP you don't want to lose.
   ([userguiding.com/blog/duolingo-onboarding-ux](https://userguiding.com/blog/duolingo-onboarding-ux))

### 2.8 What to AVOID from Duolingo (founder mandate: depth over streak)

- **Gamification eating the learning** — optimizing streak over understanding. Our content is *deep
  foundations*; the metric of success is **mastery + transfer**, not streak length. Guardrails in §13.
- **Dark-pattern guilt** — the crying-owl notification is funny once and manipulative at scale. We use
  Duo-style personality but the notification *leads with the learning value* ("Boltzmann is due — 90s
  to keep it solid"), not pure guilt.
- **Shallow ceiling** — Duolingo plateaus. Our frontier shell + derive/teach mastery levels + Exam
  Simulator give a real ceiling.

---

## 3. WHOP — the creator/marketplace engine (for our Scholar/Studio tier)

Whop is the model for the **Scholar tier**: learners author atoms/decks → list them → others discover,
buy/subscribe, and access them; authors earn (via Story Protocol citation fees in our case).

### 3.1 Products & access passes

Whop organizes everything as **products** gated by **Access Passes** (unique IDs that gate features).
One storefront can sell memberships, one-time downloads, courses, community access, SaaS licenses, and
coaching — *each product gets its own access flow*.
([docs.whop.com/supported-business-models/saas](https://docs.whop.com/supported-business-models/saas),
[ecommerceguide.com/apps/whop](https://ecommerceguide.com/apps/whop/))
- **Replicate:** a Bucket "deck" or "atom pack" or "branch path" is a *product*; access is granted by an
  **Access Pass** (free, one-time, or subscription). The same primitive covers a free community deck and
  a paid Scholar deck — one mental model.

### 3.2 Checkout & access flow

Whop handles the **entire payment flow** — global VAT, multi-currency, payouts — without the creator
wiring Stripe; access is validated **server-side** (`checkIfUserHasAccessToAccessPass`).
([docs.whop.com](https://docs.whop.com/supported-business-models/saas),
[insightraider.com/.../whop-marketplace-guide](https://insightraider.com/en/blog/whop-marketplace-guide))
- **Replicate:** checkout is a clean, conversion-optimized modal — *not* a page navigation. Access is a
  server-side entitlement check, never client-trusted. (Our metering routes through **Viatika** per org
  policy; Whop is the *UX* reference, not the billing backend.)

### 3.3 Marketplace discovery (the part that matters most for us)

- "The marketplace **sends buyers to you**. Discovery algorithm, categories, trending lists, search.
  People come to Whop looking to spend money, like browsing Amazon."
  ([insightraider.com](https://insightraider.com/en/blog/whop-marketplace-guide))
- Whop **eliminated the 30% marketplace fee → 0%**, with **instant marketplace approval**, prioritizing
  GMV/creator-acquisition over marketplace rake.
  ([dodopayments.com/blogs/whop-fees-explained](https://dodopayments.com/blogs/whop-fees-explained))
- Creators design a store page with a **clear name, headline, compelling description, logo, gallery
  images, and a category** to be browsable.
  ([docs.whop.com](https://docs.whop.com/supported-business-models/saas))
- A native **affiliate system**: trackable referral links, creator-set commission, dashboard tracking;
  default **30% recurring** commission, 30k+ active affiliates.
  ([insightraider.com](https://insightraider.com/en/blog/whop-marketplace-guide))

### 3.4 Communities

Whop bundles **forum-style channels, DMs, announcements**, and gates external Discord/Telegram via
purchase. Communities live *next to* the product.
([ecommerceguide.com/apps/whop](https://ecommerceguide.com/apps/whop/))
- **Replicate (lightly):** a Bucket "reading group" or "cohort" is a community attached to a branch
  path — shared streak, co-op league, a thread per atom. We do *not* need full Discord parity at launch;
  we need the *cohort-around-a-path* primitive.

### 3.5 What to AVOID from Whop

- The dashboard is described as **cluttered / overwhelming** because of modular app-store sprawl.
  ([fritz.ai/whop-app-review](https://fritz.ai/whop-app-review/))
  Our Scholar dashboard must stay **deferential and minimal** (Apple principle) — one storefront, one
  earnings number, one "publish an atom" button. Resist app-store sprawl.
- Real fees are **higher than the 3% headline** (FX, payout charges → ~7%).
  ([dodopayments.com/blogs/whop-fees-explained](https://dodopayments.com/blogs/whop-fees-explained))
  Be radically transparent about the author's take in the mint/earn UI — show net, not gross.

---

# PART II — SYNTHESIS: THE BUCKET ACADEMY UX SPECIFICATION

## 4. Information architecture (the whole app)

Five top-level surfaces. A bottom tab bar (mobile) / left rail (web), **deferential**, content is hero.

```
┌─────────────────────────────────────────────────────────────────┐
│  TODAY            the daily loop — the default, the home          │
│  (the "route")    due reviews + next nucleus concept; one button  │
│                                                                   │
│  MAP              the dependency-graph view (the nucleus)         │
│  (the "graph")    where am I, what's unlocked, deliberate jumps    │
│                                                                   │
│  LIBRARY          branches, paths, decks, the corpus, imports     │
│                   browse all 10 branches + community/Scholar decks │
│                                                                   │
│  PROFILE          knowledge portfolio, streak, leagues, analytics │
│                   the polymath flex; settings; accessibility       │
│                                                                   │
│  STUDIO (Scholar) author atoms → mint (Story Protocol) → earn     │
│   [tab appears only when the Scholar entitlement is active]       │
└─────────────────────────────────────────────────────────────────┘
```

**IA rationale (Apple deference + Duolingo confidence):** TODAY is the default because the path removes
guess-work (Duolingo's core 2022 lesson). MAP is the *second* view that preserves Bucket's graph thesis
without making the graph the daily burden. LIBRARY is discovery (Whop marketplace pattern). STUDIO is the
creator surface (Whop products/access) and is **progressively disclosed** — it does not exist in the UI
until you become a Scholar.

**Navigation depth rule:** no surface is more than **3 taps** from TODAY. Atom → drill → feedback →
progress is a *linear flow*, not a navigation tree (Duolingo path discipline).

---

## 5. Onboarding flow — screen by screen (commitment before signup)

Adapted directly from Duolingo's commitment ladder
([goodux.appcues.com](https://goodux.appcues.com/blog/duolingo-user-onboarding),
[junoschool.org](https://www.junoschool.org/article/duolingo-onboarding-experience/)),
re-skinned for foundations + polymathy. **No account required until step 8.**

| # | Screen | Content | Why (case-study basis) |
|---|---|---|---|
| 1 | **Welcome** | The Bucket mascot (a curious owl-of-Minerva / "Newton's bucket" character) + one line: *"Learn the nucleus of any field — the few ideas everything else rests on."* | Friendly mascot welcome (Duolingo §2.7) |
| 2 | **Pick a branch** | The 10 branches as beautiful cards (biophysics is the live pilot, others "coming"); pick one. | Goal selection (Duolingo) |
| 3 | **Why** | *"Why this field?"* → General exam / Curiosity / Career / Polymath quest. Single tap. | Motivation personalizes nudges, non-intrusive (Duolingo) |
| 4 | **Calibrate** | *"New here, or do you already know some?"* → optional **3-question placement** to skip prereq atoms. | Placement test to skip basics (Duolingo) |
| 5 | **Daily commitment** | *"How much per day?"* 5 / 10 / 20 min. Sets the FSRS daily load + reminder. | Small commitment → ownership (Duolingo) |
| 6 | **The first atom — DO it** | Immediately teach one *real* nucleus atom (e.g. **Boltzmann distribution**): Feynman explanation + the art anchor + one recall drill they get *right*. | The first lesson IS onboarding; feel successful immediately (Duolingo §2.7) |
| 7 | **The reveal** | After they answer: the MAP briefly animates — *"You just unlocked the door to folding, binding, and kinetics"* — an edge lights from Boltzmann to 3 downstream nodes. | Depth = showing the dependency (Apple §1.1); this is Bucket's unique "why am I learning this" payoff |
| 8 | **Save your progress** | *"You've earned your first atom + 15 XP. Create a free account to keep it."* Sign in (Dynamic web3 auth or email). | Deferred signup, sunk-cost compelling (Duolingo §2.7) |
| 9 | **Notifications opt-in** | *"Want a nudge when Boltzmann is due for review?"* — framed as *learning value*, not guilt. | Avoid dark-pattern (our guardrail §2.8) |

**Empty-state-as-onboarding:** for branches not yet live, the card says *"Mathematics nucleus — in
construction. Get notified."* — honest, never a dead end.

---

## 6. The daily learning loop — screen by screen

This is the heart. It must feel like Duolingo's 3–5 min session
([deconstructoroffun.com](https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth))
but carry PhD-grade content, and obey Apple's "one obvious next action."

```
TODAY screen
 └─ Header: streak flame · today's XP ring · "12 min left of your goal"   (chrome, deferential)
 └─ HERO CARD: "Today's route" — a horizontal ribbon of ~6–10 nodes
     • due reviews (FSRS) interleaved with the next NEW nucleus atom
     • node states: due (glowing) · new (outlined) · done (filled)        (Duolingo path, interspersed)
 └─ PRIMARY BUTTON: "Start" (or, mid-route, "Continue")                   (single action, Apple §1.4)
```

The route itself (tap Start):

1. **DUE REVIEW (FSRS-scheduled)** — surfaces a card at the *mastery level* the engine targets
   (recall → cloze → apply → derive → teach). One concept, one prompt. *(Goldilocks/desirable
   difficulty — Duolingo §2.2, FSRS target retention.)*
2. **DRILL** — answer. Input type matches mastery level: tap (recall), fill-in (cloze), free-text +
   AI-graded (apply/derive), record-or-type explanation (teach-back).
3. **FEEDBACK MOMENT (the dopamine hinge — copy Duolingo exactly):**
   - **Correct:** green wash, a *light* success haptic (`UINotificationFeedbackGenerator.success`), a
     short rising sound, **XP awarded inline before you can leave** (Duolingo §2.3), and a one-line
     *why-it's-right* reinforcement.
   - **Incorrect:** *non-punishing* — gentle amber (never harsh red; red = destructive only, Apple §1.2),
     a soft error haptic, the **correct answer + the misconception named by the AI tutor**, and a
     *"we'll bring this back sooner"* note (FSRS reschedules; failure is a *feature*, not a punishment —
     Apple §1.4 recoverable errors).
4. **NEW NUCLEUS ATOM** (once per route) — the full atom screen (§8): learn → one starter drill.
5. **PROGRESS / END-OF-ROUTE SCREEN (copy Duolingo's reward screen):**
   - XP tally counts up; streak increments with a flame animation; **variable reward** may appear
     (a surprise: a streak freeze, an art-card unlock, an XP boost — *randomly*, Duolingo §2.3).
   - **The Bucket-unique payoff:** a small MAP animation shows the node(s) you just mastered lighting up
     and the **edges to newly-reachable concepts** drawing in — *"3 new concepts unlocked."* This is the
     "depth shows the dependency" principle (Apple §1.1) and the thing no competitor has.
   - League delta if applicable; "come back tomorrow — Michaelis–Menten is next."
6. **GAPS → brain:** weak atoms feed the Nucleus brain so tomorrow's route targets them and the Exam
   Simulator pulls from the weak set (already in `PRODUCT.md` §3; the UX surfaces it as "Your weak
   spots" on PROFILE, never as a wall of shame).

**Session-length honesty (founder mandate):** because our atoms are deep, a route may legitimately take
longer than 3 min when it includes a *derive* or *teach* drill. The fix is **format variety within the
route** (Duolingo's 10–20s-per-part principle, §2.2): never two heavy free-text derivations back to
back; interleave a quick recall/cloze between them so the *rhythm* stays Duolingo-fast even though the
*content* is PhD-deep.

---

## 7. The nucleus / dependency-graph visualization (the hardest UX problem)

This is where most knowledge-graph products fail. The research is unambiguous about *how* they fail.

### 7.1 The failure mode we must avoid: the hairball

Obsidian's global graph view is the canonical cautionary tale: **"beautiful and almost completely
useless"** past ~200 notes; the force-directed layout "pushes them into dense clusters… visually
impressive and navigationally useless."
([codeculture.store/.../obsidian-graph-view-useful](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful))
The root causes: **no hierarchy, no filtering, all edges weighted equally**, so the graph can't tell you
*what you need right now*. The community fix (Excalibrain) was to **add hierarchy via typed links**
(parent/child/sibling).
([codeculture.store](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful))

**We are structurally better positioned than Obsidian**, because our edges are *already typed and
directed* (`requires` / `unlocks` in the Concept Atom front-matter — `KNOWLEDGE-ARCHITECTURE.md` §2) and
we *already compute centrality* (the nucleus = high-betweenness/out-degree core — `KNOWLEDGE-ARCHITECTURE.md`
§1). We have the hierarchy Obsidian lacked. The UX job is to *use* it.

### 7.2 The principle: the graph is the MAP, the path is the ROUTE (resolves Duolingo vs Bucket)

- **Default = the route** (TODAY, §6): a *linearized* topological walk through the graph that the engine
  computes. Zero decisions. This is Duolingo's confidence win.
- **On demand = the MAP**: the graph view, opened deliberately, never the default daily surface.

### 7.3 Three zoom levels of the MAP (focus + context, the graph-UX consensus)

Graph-UX best practice: predictable visual language (same color = same type, same shape = same category),
a **limited palette (2–3 shapes max)**, **size encodes importance** (big node = high-centrality nucleus),
and core interactions = **highlight paths, filter by type/importance, progressive disclosure on demand,
lens/focus tools, search, hover tooltips.**
([yfiles.com/.../visualizing-knowledge-graphs](https://www.yfiles.com/resources/how-to/guide-to-visualizing-knowledge-graphs),
[datavid.com/blog/knowledge-graph-visualization](https://datavid.com/blog/knowledge-graph-visualization))
And critically: a **local graph (only the current node's neighbors) stays useful at any size** where the
global graph dies.
([codeculture.store](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful))

So the MAP is **three nested views**, never one hairball:

1. **L1 — Constellation (branch overview).** Not a raw force-directed graph. A **curated, hand-laid-out
   "shells" diagram** of the branch: three concentric rings = Prereq → Nucleus → Frontier
   (`KNOWLEDGE-ARCHITECTURE.md` §1.3). Nodes sized by centrality, colored by shell, your progress shown
   as fill. This is a *designed* layout, not an emergent one — that is the whole point. (Think a subway
   map / tech-tree, not a tangle.)
2. **L2 — Neighborhood (local graph).** Tap any node → a clean **focus+context** view: the node in the
   center, its `requires` to the left (what it depends on), its `unlocks` to the right (what it opens).
   Max ~12 nodes on screen. This is the *always-useful* local graph the Obsidian critique endorses.
3. **L3 — Atom (the leaf).** Tap the node → the atom screen (§8).

### 7.4 Concrete visual grammar (the design tokens of the graph)

| Encoding | Meaning | Source basis |
|---|---|---|
| **Node size** | Centrality / leverage (the nucleus core is biggest) | size encodes importance ([yfiles](https://www.yfiles.com/resources/how-to/guide-to-visualizing-knowledge-graphs)) |
| **Node color** | Shell: prereq / nucleus / frontier (3 colors, fixed) | limited palette, color = type ([datavid](https://datavid.com/blog/knowledge-graph-visualization)) |
| **Node fill %** | Your mastery (FSRS stability) — empty → glowing-full | progress made legible |
| **Node shape** | Atom type: concept (circle) / equation (diamond) / method (square) — **3 shapes max** | ≤3 shapes ([yfiles](https://www.yfiles.com/resources/how-to/guide-to-visualizing-knowledge-graphs)) |
| **Edge direction** | `requires` (incoming) vs `unlocks` (outgoing), arrowed | typed/directed edges (our advantage over Obsidian) |
| **Edge brightness** | Cross-branch **bridge** edges glow gold (the polymath payoff) | path highlighting ([yfiles](https://www.yfiles.com/resources/how-to/guide-to-visualizing-knowledge-graphs)) |
| **Locked nodes** | Dimmed, with a "requires X first" tooltip on hover | progressive disclosure ([datavid](https://datavid.com/blog/knowledge-graph-visualization)) |

**Interactions (the consensus set):** pinch/scroll zoom between L1↔L2; tap = focus; long-press = preview
tooltip; **search** jumps to any node; **filter chips** (show only nucleus / only weak / only unlocked);
a **"Where am I?"** button recenters on your frontier. Motion between zoom levels is a *shared-element
transition* (the node you tapped grows into the next view — Apple depth/continuity, 200–500 ms §1.2).

**The graph is read-only at launch** (you walk it, you don't edit it). Authoring edges is a Scholar/Studio
feature (§10). This keeps the MAP curated and beautiful rather than user-tangled — sidestepping Obsidian's
"manual link discipline" problem entirely.

---

## 8. The Concept Atom screen (the content hero)

The atom is the product's soul. It must be **deferential** (mostly whitespace + one idea — Apple §1.2)
and **progressively disclosed** (§1.3).

```
┌──────────────────────────────────────────────┐
│  ← branch        Boltzmann distribution    •••│   (minimal chrome)
│                                                │
│        ╔══════════════════════════════╗        │
│        ║   THE ART ANCHOR (hero)      ║        │   AI-generated visual,
│        ║  "a ladder of energy levels  ║        │   the art_prompt field
│        ║   fading exponentially up"   ║        │   (dual-coding win)
│        ╚══════════════════════════════╝        │
│                                                │
│   p_i = e^{-E_i/kT} / Z                        │   the equation, large, beautiful
│                                                │
│   ┌─ Feynman ─┬─ Formal ─┬─ Derivation ─┐      │   3-depth tabs (progressive
│   │ Plain-English explanation shown first│      │   disclosure §1.3): ELI5 →
│   └──────────────────────────────────────┘      │   undergrad → grad on demand
│                                                │
│   "Unlocks: two-state folding, partition fn"   │   the WHY (Bucket-unique)
│   "Sources: OpenStax · LibreTexts · arXiv"     │   citeable corpus links
│                                                │
│  [ Ask the tutor ]            [ Drill this → ] │   two clear actions (Apple §1.1)
└──────────────────────────────────────────────┘
```

- **Art anchor first** (the wedge, `PRODUCT.md` §2): the generated image *is* the mnemonic and the
  shareable object (§11). It loads with a graceful skeleton → fade (never a spinner-only blank).
- **3-depth explanation = progressive disclosure** of *pedagogy*, mapping Apple's pattern to our
  ELI5/undergrad/grad model. Default tab = Feynman; the learner reaches for depth.
- **AI tutor = a deferential sheet** (Liquid-Glass translucent, §1.5) that slides up *over* the atom,
  Socratic ("can you tell me why Z is in the denominator?"), catches misconceptions, and *never*
  obscures the equation while you reason.
- **"Unlocks"** is the line no competitor has — it makes leverage visible and ties the atom back to the
  MAP (tap it → L2 neighborhood).
- **Sources** are real, citeable, open (the corpus advantage, `PRODUCT.md` §1) — tapping opens the
  primary paper. This is the trust/"it just works" credibility Apple-grade products earn.

**AI-content safety surface (deferred detail to People/Ops, flagged here):** every AI-generated
explanation/drill carries a subtle "AI-generated · verify against source" affordance and a one-tap
"report error" that files to the brain. Educational hallucination is a real risk; the UX must make
correction frictionless rather than hide the AI's fallibility.

---

## 9. Micro-interactions, motion, haptics, and the four states

### 9.1 Motion & haptics budget (Apple-grade, enforced)

| Event | Motion | Haptic | Sound | Timing |
|---|---|---|---|---|
| Tap a button | 0.96 scale press-in | light impact | — | <100 ms ([Apple feedback latency](https://moldstud.com/articles/p-a-comprehensive-guide-to-apple-human-interface-guidelines-for-ios-apps)) |
| Correct answer | green wash + checkmark draw | `notification.success` | short rising chime | 200–300 ms |
| Incorrect answer | amber underline, gentle shake | `notification.error` (soft) | low soft tone | 200–300 ms |
| XP award | counter rolls up, ring fills | light impact per tick | coin-ish tick | 300–500 ms |
| Concept unlocked | node lights + edge draws on MAP | medium impact | warm "unlock" tone | 400–500 ms |
| Streak increment | flame grows + particles | success | flame whoosh | 300–500 ms |
| Zoom L1↔L2 graph | shared-element node growth | — | — | 200–400 ms |
| Variable reward reveal | chest/card flips open | medium impact | sparkle | 400–600 ms |

All durations sit in Apple's **200–500 ms** band; all confirmations land within **100 ms**
([synthesis](https://moldstud.com/articles/p-a-comprehensive-guide-to-apple-human-interface-guidelines-for-ios-apps)).
Haptics use **system-defined generators** for consistency
([developer.apple.com/.../feedback](https://developer.apple.com/design/human-interface-guidelines/patterns/feedback/)).
**Respect `prefers-reduced-motion`** — replace transforms with cross-fades (accessibility, §12).

### 9.2 The four states (Apple-grade means designing all four, not just "success")

- **Empty:** never a blank. A new branch = "in construction, get notified." Zero due reviews =
  *"You're caught up. Learn something new?"* + the next nucleus atom (turn empty into the next action —
  Apple "it just works"). No streak yet = "Day 1 starts now."
- **Loading:** content-shaped skeletons + fade-in, never a bare spinner. Art generates async with a
  "painting your anchor…" shimmer; the rest of the atom is usable meanwhile (progressive loading).
- **Error (system):** human copy, a clear recovery action, and *progress is never lost* (Apple §1.4).
  Network loss → offline mode for cached atoms (engineering dependency, §14).
- **Error (answer):** see §6.3 — non-punishing, names the misconception, reschedules sooner. This is the
  single most important emotional-design decision: **failing a card must feel like the system helping
  you, not the system judging you.** (Counter to Duolingo's heart-loss frustration, §2.8.)
- **Success:** the reward screen (§6.5) — XP, streak, variable reward, and the unlock animation.

---

## 10. STUDIO — the Scholar/creator surface (Whop pattern, Apple restraint)

The "learn → contribute → earn" loop (`PRODUCT.md` §4). Whop is the UX model; **Bucket's restraint** is
the differentiator from Whop's "cluttered dashboard" failure (§3.5).

- **One storefront, one mental model:** an atom, a deck, or a branch-path is a **product** gated by an
  **Access Pass** (free / one-time / subscription) — the Whop primitive (§3.1).
- **Author flow (progressive disclosure):** write atom (markdown + front-matter, the existing Concept
  Atom shape) → preview as a learner sees it → **generate art** → **mint to Story Protocol** (the IP NFT)
  → publish. Each step is one screen; minting shows the **author's net citation-fee economics
  transparently** (counter to Whop's hidden-fee critique, §3.5).
- **Discovery (Whop marketplace, §3.3):** LIBRARY surfaces community + Scholar decks with
  trending/categories/search; *"the marketplace sends learners to you."* Approval is fast (Whop's
  instant-approval move). Decks carry name/headline/description/cover-art/category/branch — the Whop
  store-page fields.
- **Communities/cohorts (Whop §3.4, lightly):** a reading group = a community attached to a branch path,
  with shared streak + co-op league + a thread per atom. Not full Discord — just cohort-around-a-path.
- **Earnings:** citation fees accrue when others *learn from* your atom (the canon's flywheel). Show
  **net, lifetime, and per-atom** — radical transparency.
- **Affiliate/referral (Whop §3.3):** "challenge a friend" + shareable concept cards (§11) double as the
  referral rail; trackable links bring the acquisition loop.

This tab **does not appear** until the Scholar entitlement is active (progressive disclosure of the whole
surface) — keeping the learner experience deferential and uncluttered.

---

## 11. The shareable concept card (the viral art loop)

The single biggest *growth* lever and the thing Duolingo "never fully exploited" (`PRODUCT.md` §2).

- **The object:** the atom's **art anchor + title + equation + "I just mastered this on Bucket"** composed
  into a **screenshot-native, beautiful 1:1 / 9:16 card.** The art is the hook; the equation signals
  depth; the branding signals where to get it.
- **The trigger:** offered at the *peak moment* — the success/unlock screen (§6.5), when emotion is
  highest (Duolingo's reward-moment timing).
- **The loop:** card → shared to social → links back to the *exact atom* (deep link) → recipient lands in
  the atom screen (§8) mid-flow → onboarding §5 with that atom pre-loaded. Acquisition closes on the
  content itself, not a generic landing page.
- **Collectibility (Duolingo-style delight):** mastered atoms become a **collectible card set** on
  PROFILE — the "knowledge portfolio / polymath flex" (`PRODUCT.md` §5). Pro/custom-art cards are
  higher-fidelity (a Pro perk, not a content gate — on-mission, foundations stay free).
- **Quality gate (Apple):** the composer auto-lays-out on the 8-pt grid, uses SF-grade typography, and
  never lets the user produce an ugly card — *generated beauty by default* is the brand.

---

## 12. Accessibility as part of Apple-grade quality (WCAG; defer detail to Ops)

Apple treats accessibility as table stakes — VoiceOver, Dynamic Type, contrast, alt text are *in* the HIG,
not bolted on. ([netguru](https://www.netguru.com/blog/ios-human-interface-guidelines),
[medium.com/.../apples-hig-on-accessibility](https://medium.com/design-bootcamp/apples-human-interface-guidelines-on-accessibility-e9c3945b2ec5))
Product-level commitments (Ops owns the full WCAG 2.2 AA audit, flagged as a cross-pillar dependency §14):
- **Contrast:** meet WCAG AA (4.5:1 text / 3:1 large+UI). The amber-not-red error choice helps here.
- **Dynamic Type:** all text scales; layouts reflow, never truncate equations.
- **VoiceOver / screen reader:** every node, drill, and the graph have meaningful labels; the MAP needs a
  **list-mode alternative** (a structured outline of the dependency graph) — non-visual users get the
  *route* as an ordered list (this is also the Obsidian "Dataview list beats graph" insight, §7.1).
- **Motion:** honor `prefers-reduced-motion` (§9.1).
- **Color independence:** never encode mastery/shell by color alone — pair with shape + fill % (§7.4).
- **Tap targets:** 44×44 pt minimum, everywhere (§1.2).
- **Captions/alt text:** every AI-generated art anchor gets generated alt text describing the mnemonic.

---

## 13. Guardrails: keeping depth from being eaten by the streak

Founder mandate is explicit (`PRODUCT.md` §1): *guard against the streak becoming the point.*
- **Mastery, not streak, is the headline metric** on PROFILE: "nuclei mastered across branches" is the
  number we celebrate; streak is secondary chrome.
- **Quality gates on XP:** XP for a *derive*/*teach* mastery event ≫ XP for a recall tap, so the reward
  gradient points at *understanding*, not volume.
- **No streak-gambling dark patterns:** notifications lead with *learning value* ("Boltzmann is due —
  keep it solid"), not pure guilt (counter to Duolingo §2.8). Streak freeze is generous and free.
- **"Caught up" is a valid, celebrated end state** — we never manufacture busywork to extend a session.

---

## 14. Cross-pillar dependencies (what must exist for this UX to ship)

| Need | Owner | Why |
|---|---|---|
| **Curated graph layout data** (L1 constellation is hand-laid, not force-directed) | Data + Product | Avoids the Obsidian hairball (§7.1); requires per-branch x/y or shell-ring layout, not just edges |
| **Centrality scores per atom** (node size = leverage) | Data | The nucleus computation (PageRank/betweenness) already specced in KNOWLEDGE-ARCHITECTURE §1 |
| **FSRS scheduler exposing mastery level + "due route"** | Engineering + Data | The TODAY route (§6) is a linearized FSRS walk; needs an API that returns the ordered route, not just due cards |
| **AI art pipeline with async + alt-text + caching** | Engineering + Ops | Art anchor (§8) + share cards (§11) + cost model (Ops owns the variable-cost budget) |
| **AI tutor with misconception detection + source grounding** | Engineering + People | Socratic sheet (§8); People owns hallucination-safety; UX needs a "report error" → brain hook |
| **Story Protocol mint + citation-fee accounting in UI** | Engineering | STUDIO earnings transparency (§10) |
| **Viatika metering for Pro/AI caps** | Engineering + Ops | Per org policy; the "daily AI cap" UX (§ free tier) reads from Viatika |
| **Offline cache of atoms + FSRS state** | Engineering | Error/offline state (§9.2); PWA-vs-native decision is Engineering's |
| **WCAG 2.2 AA audit + screen-reader graph list-mode** | Operations | Accessibility (§12) |
| **Deep links to individual atoms** | Engineering | The viral loop (§11) lands recipients in-flow |

---

# PART III — THE 10 HIGHEST-LEVERAGE UX DECISIONS

1. **The graph is the MAP; the path is the ROUTE.** Default daily surface = a Duolingo-style linear
   route the engine computes (zero decisions, confidence); the dependency graph is a *second* view, never
   the default. This resolves the core tension between Duolingo's 2022 "kill the tree" evidence and
   Bucket's graph thesis. *(Duolingo §2.1; Obsidian §7.)*
2. **Onboarding teaches a real atom and shows the unlock — before signup.** The first nucleus concept is
   learned in the onboarding, then the MAP animates the dependency unlock; signup is deferred until sunk
   cost makes it compelling. *(Duolingo §2.7, §5.)*
3. **The atom screen leads with AI-generated art + 3-depth progressive disclosure.** Art anchor is the
   hero (dual-coding + shareable); ELI5→undergrad→grad tabs are Apple progressive disclosure applied to
   pedagogy. *(Apple §1.3; PRODUCT art wedge; §8.)*
4. **The feedback moment is non-punishing.** Wrong answers are amber (never red), name the misconception,
   and reschedule sooner — failure feels like help, not judgment. The single most important emotional
   decision. *(Apple recoverable errors §1.4; §6.3, §9.2.)*
5. **XP is awarded inline before you leave; variable rewards are random.** Copy Duolingo's dopamine
   coupling exactly, but gate XP magnitude on *mastery depth* (derive ≫ recall) so the reward gradient
   points at understanding. *(Duolingo §2.3; guardrail §13.)*
6. **The graph uses a curated, hand-laid "shells" layout — never raw force-directed.** Three concentric
   rings (prereq/nucleus/frontier), size=centrality, color=shell, fill=mastery, with an always-useful
   local-neighborhood (L2) view. This is the explicit fix for the Obsidian hairball. *(§7.)*
7. **The "Unlocks" line + post-route unlock animation** make leverage visible — the one thing no
   competitor (Anki/Duolingo) has. Mastering a node visibly opens downstream concepts. *(Apple depth §1.1;
   §6.5, §8.)*
8. **Apple-grade quality gate, enforced by tokens:** 8-pt grid, 44pt tap targets, 200–500 ms motion,
   <100 ms feedback, system haptics, SF-grade type, all four states designed (empty/loading/error/
   success). *(Apple §1.2, §9.)*
9. **STUDIO/Scholar = Whop's product+access-pass model with Apple restraint.** One storefront, atoms/decks
   as access-gated products, transparent net citation-fee economics, marketplace discovery — but a
   *minimal* dashboard (counter to Whop's clutter). Progressively disclosed (tab appears only for
   Scholars). *(Whop §3; §10.)*
10. **The shareable concept card is the growth engine.** Offered at the peak success moment, beautiful by
    default (generated, grid-aligned), deep-links back to the exact atom — closing the acquisition loop on
    the content itself. *(PRODUCT art wedge; Duolingo reward timing; §11.)*

---

## Sources

- Apple Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines/
- Apple HIG · Feedback — https://developer.apple.com/design/human-interface-guidelines/patterns/feedback/
- Apple HIG · SF Symbols — https://developer.apple.com/design/human-interface-guidelines/sf-symbols
- Liquid Glass (Create with Swift) — https://www.createwithswift.com/liquid-glass-redefining-design-through-hierarchy-harmony-and-consistency/
- iOS HIG overview (Netguru) — https://www.netguru.com/blog/ios-human-interface-guidelines
- Apple HIG essentials (Brilworks) — https://www.brilworks.com/blog/apple-human-interface-guidelines/
- Comprehensive HIG guide (Moldstud) — https://moldstud.com/articles/p-a-comprehensive-guide-to-apple-human-interface-guidelines-for-ios-apps
- Apple HIG on accessibility (Medium/Bootcamp) — https://medium.com/design-bootcamp/apples-human-interface-guidelines-on-accessibility-e9c3945b2ec5
- Duolingo · new learning path (official) — https://blog.duolingo.com/new-duolingo-home-screen-design/
- Duolingo path review (Duoplanet) — https://duoplanet.com/duolingo-new-learning-path-review/
- Duolingo language tree (Fandom wiki) — https://duolingo.fandom.com/wiki/Language_tree
- Duolingo gaming principles (Deconstructor of Fun) — https://www.deconstructoroffun.com/blog/2025/4/14/duolingo-how-the-15b-app-uses-gaming-principles-to-supercharge-dau-growth
- Duolingo gamification secrets (Orizon) — https://www.orizon.co/blog/duolingos-gamification-secrets
- Duolingo gamification case study (Trophy) — https://trophy.so/blog/duolingo-gamification-case-study
- Duolingo habit formation (The PM Repo) — https://www.thepmrepo.com/articles/how-duolingo-gamified-monthly-active-users
- Duolingo streak system breakdown (Medium) — https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f
- Duolingo gamification (StriveCloud) — https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo
- Duolingo onboarding (Appcues/GoodUX) — https://goodux.appcues.com/blog/duolingo-user-onboarding
- Duolingo onboarding masterclass (Juno School) — https://www.junoschool.org/article/duolingo-onboarding-experience/
- Duolingo onboarding UX (UserGuiding) — https://userguiding.com/blog/duolingo-onboarding-ux
- Whop SaaS / access passes (official docs) — https://docs.whop.com/supported-business-models/saas
- Whop marketplace guide (InsightRaider) — https://insightraider.com/en/blog/whop-marketplace-guide
- Whop fees explained (Dodo Payments) — https://dodopayments.com/blogs/whop-fees-explained
- Whop review (Ecommerce Guide) — https://ecommerceguide.com/apps/whop/
- Whop review (Fritz AI) — https://fritz.ai/whop-app-review/
- Knowledge graph visualization guide (yFiles) — https://www.yfiles.com/resources/how-to/guide-to-visualizing-knowledge-graphs
- Knowledge graph visualization guide (Datavid) — https://datavid.com/blog/knowledge-graph-visualization
- Obsidian graph view critique (Code Culture) — https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful
