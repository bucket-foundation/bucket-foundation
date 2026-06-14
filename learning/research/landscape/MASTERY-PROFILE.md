# Bucket Academy — The Mastery Profile (the verifiable digital resume)

**Pillar:** People · **Bead:** bkt-cgv (child of epic **bkt-jh0**) · **Author:** People pillar (Nucleus) · 2026-06-14
**Pilot domain:** biophysics general-exam prep (extends to all seven canon branches)
**Reads on top of:** `research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md` (the evidence base), `research/_synthesis/UX-SPEC.md` (IA + the "Profile / Knowledge Portfolio" view), `research/_synthesis/DECISIONS.md` (stack: Next.js + Supabase + Dynamic + **Story Protocol**, FSRS-6, BKT-per-(atom,signal)).

> **The thesis in one sentence.** Today Bucket's learning map shows *you* your own mastery.
> This document turns it into a **public, credential-grade, employer/PI-verifiable proof of
> what you actually know** — grounded in Bucket's canon, measured by mechanisms that are
> *impossible to increment except by genuinely learning*, and anchored (optionally) on Story
> Protocol so it outlives Bucket itself. **The best digital resume you can have, and you
> built it by learning.**

---

## 0. The one structural insight that decides everything

Across every credential and rating system researched, the trustworthy ones share a single
property and the worthless ones all lack it:

> **The score must be mechanically inseparable from doing the real thing.**

- You cannot raise your **chess Elo/Glicko** without beating real rated players — which *is*
  the skill ([Glicko — Wikipedia](https://en.wikipedia.org/wiki/Glicko_rating_system)).
- You cannot raise your **Duolingo English Test** score without demonstrating English under
  adaptive proctoring; a leaked answer key is near-useless because the test is item-calibrated
  and adaptive ([DET scoring](https://blog.englishtest.duolingo.com/how-is-the-duolingo-english-test-scored/),
  [Settles et al., TACL 2020](https://research.duolingo.com/papers/settles.tacl20.pdf)).
- You cannot make **Kaggle Grandmaster** without beating thousands of others on a *hidden test
  set*, including a solo-gold (no coattail-riding)
  ([Kaggle progression](https://www.kaggle.com/progression)).

And the failure mode — **GitHub stars, LinkedIn endorsements, completion certificates** — all
let the metric be incremented *independently of the underlying work*: stars are bought,
endorsements are reciprocal and costless, a "completion certificate" proves only attendance
([Brookings: credentials vs employer demand](https://www.brookings.edu/articles/exploring-the-disconnect-digital-credentials-and-employer-demand),
[GitHub fake-star economy](https://dev.to/dev_tips/the-fake-github-economy-no-one-talks-about-stars-followers-and-5k-accounts-43pn),
[LinkedIn endorsements are noise](https://www.liseller.com/linkedin-growth-blog/linkedin-endorsements)).

Bucket already has the rare raw material to satisfy this: the learning loop is **retrieval-first
with feedback** (`LEARNING-SCIENCE-AND-AI-SAFETY.md` §1.3) and mastery is **BKT fused with FSRS
stability** so "mastered" literally means "retained" (`DECISIONS.md` #11). That means the
number behind a Bucket Mastery Profile is *already* "you keep correctly retrieving this against
calibrated difficulty over time" — the chess-rating property, applied to knowledge. The
Mastery Profile is the act of **exposing that earned signal as a verifiable, shareable
credential** — not bolting a badge on after the fact.

---

## 1. What the Mastery Profile shows

The profile is the public, shareable face of the **Profile / Knowledge Portfolio** view already
in the IA (`UX-SPEC.md`). It is *not* a wall of badges. It is a **map + a rating + an evidence
trail**, in three reading depths (skim / inspect / verify) for three audiences (a peer, a
hiring manager, a PI doing due diligence).

### 1.1 The map (the headline — the "polymath flex")
The learner's mastered concepts rendered across Bucket's **seven canon branches** (mathematics,
physics, chemistry, information, biophysics, cosmology, mind), using the *same* concentric-shell
encoding as the in-app nucleus map (`UX-SPEC.md`): node *size* = centrality (Leverage Score),
*color* = branch, *fill* = mastery. A public viewer sees, at a glance, **the shape of a mind** —
which nuclei are lit, how deep, across how many fields. This is the thing no PDF resume can
show: granular, visual, branch-spanning command of foundations.

Accessibility (release gate, `DECISIONS.md` #19): a screen-reader **list-mode** renders the same
map as an ordered, grouped list — non-visual viewers get the identical credential.

### 1.2 The rating (the credible scalar — borrowed from chess)
Per branch (and an aggregate), a **Mastery Rating** with **visible uncertainty**, modeled on
Glicko-2's three numbers ([Glicko-2](https://www.emergentmind.com/topics/glicko2-rating-system)):

| Component | Source in Bucket | What it means to a viewer |
|---|---|---|
| **Rating (R)** | IRT ability estimate (θ) over the branch's calibrated item bank, fused with BKT mastery | "How much of this branch they command, and at what difficulty" |
| **Deviation (RD) / confidence** | inverse of evidence volume + recency; rises with inactivity | "How *proven* this is" — a high rating with high RD is shown as **unproven**, never hidden |
| **Recency / live form** | **FSRS stability** = days for retrievability to fall 100%→90% ([FSRS stability](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)) | "Is this *current* or stale?" — knowledge they last retrieved 18 months ago is shown decaying |

This directly imports chess's two-layer trust model: a **volatile "current level"** (live
rating + FSRS recency) *and* a **durable "peak credential"** (see §1.4). Showing RD as a
first-class value is the single most credibility-defining UI choice — an honest credential
shows its own confidence, and an *unproven* high score looks exactly as unproven as it is.

> **Anti-vanity guard (People + SDT, `LEARNING-SCIENCE-AND-AI-SAFETY.md` §3–4).** The rating is
> **informational, not controlling** — it must read as a *diagnostic* of command, never a
> leaderboard prize, or it crowds out intrinsic motivation (Deci/Koestner/Ryan 1999, d≈−0.3 to
> −0.4). No fake encouragement; the number is true or it is nothing.

### 1.3 Depth, recency, evidence per concept (the inspect layer)
Tap any lit node → its **per-concept dossier**:
- **Depth** — the highest mastery signal demonstrated on the R/A/D/T ladder (Recall → Apply →
  **Derive** → **Teach-back**). *Derive* and *Teach-back* are the deep retrieval levels
  (`LEARNING-SCIENCE-AND-AI-SAFETY.md` §1.3); the profile weights them far above Recall so the
  signal points at *understanding*, not card-flipping.
- **Recency** — FSRS retrievability right now (a live forgetting-curve readout).
- **Evidence trail** — *this is the differentiator employers actually inspect.* Not "earned a
  badge" but the **actual work**: the timestamped retrieval/derivation transcripts, the
  teach-back explanation the learner gave, the adaptive-assessment session, the canon citation
  the concept grounds to. Bucket's edge — genius work with AI, primary derivations — means the
  *artifact itself* is the evidence (the Credly/EDCI lesson: verify the work, not just the
  signature, [Credly issuer-vetting](https://learn.credly.com/blog/not-all-digital-badging-platforms-can-do-what-credly-does),
  [European Digital Credentials](https://europass.europa.eu/en/european-digital-credentials-learning)).

### 1.4 Durable mastery milestones (the "FIDE title" layer)
On top of the live, decaying rating sit **permanent milestones** the learner once *demonstrated*
— e.g. "Derived the full nucleus of 05-biophysics" or "Taught-back every frontier atom in
information theory." Like a FIDE title held for life vs a live rating that fluctuates
([FIDE titles](https://en.wikipedia.org/wiki/FIDE_titles)), these record **what you once
proved** even as current form decays — revocable only for detected fraud. This is what makes
the profile a *resume* (durable claims) and not just a *dashboard* (today's state).

### 1.5 Machine-readable skill alignment (so it's not just pretty)
The decade-long reason badges get ignored is the **meaning gap**: an employer can't map "earned
a badge" to "can do this job" ([Brookings](https://www.brookings.edu/articles/exploring-the-disconnect-digital-credentials-and-employer-demand)).
Bucket closes it by giving every mastered concept a **stable, machine-readable skill ID** —
the canon atom ID *is* the skill descriptor (Rich-Skill-Descriptor pattern,
[Open Skills Network RSD](https://www.openskillsnetwork.org/rsd)), exposed via the Open Badges
3.0 `Alignment` field. A profile is then *searchable and comparable*, not a wall of opaque
tokens. (Bucket's atoms are already markdown + front-matter with stable IDs and `canon_ref` —
`KNOWLEDGE-ARCHITECTURE.md` §2 — so the skill layer is *free*.)

---

## 2. How mastery is measured *credibly* (the anti-gaming core)

This is the section that decides whether a Mastery Profile is a credential or a participation
trophy. The central question an employer/PI asks: **"How do I know they didn't just click
through?"** Bucket's answer is a stack, cheapest-and-highest-leverage first. None of it requires
heavy surveillance.

### 2.1 The loop is already retrieval-with-feedback (the foundation)
A click-through can't generate a Bucket mastery signal because **every study surface is a *test
with feedback*, never rereading** (`LEARNING-SCIENCE-AND-AI-SAFETY.md` req. 2–3). You cannot
"complete" an atom by scrolling; you raise mastery only by *correctly retrieving* it. This is
the structural difference from a Coursera-style "completion certificate."

### 2.2 Adaptive, item-calibrated assessment (the DET move) — kills cram & key-leaks
Mastery that feeds the *public* rating must come from a **large, continuously-rotating adaptive
item bank scored by Item Response Theory** — the Duolingo English Test architecture
([DET scoring](https://blog.englishtest.duolingo.com/how-is-the-duolingo-english-test-scored/),
[CAT/IRT overview](https://www.emergentmind.com/topics/item-response-theory-irt)). Properties
that matter:
- IRT estimates **ability (θ) separately from item difficulty**, so two learners on different
  paths get **comparable** ratings, and the score reflects the *difficulty* of what you can do.
- Adaptive selection + **item-exposure control** means no two sessions are alike → a leaked
  answer key is near-worthless, and the test climbs to your true ceiling.
- This is the cheapest psychometric anti-gaming primitive and needs **no proctoring to add
  value** — it makes the *score itself* statistically meaningful. (Bucket already plans IRT for
  question-difficulty calibration, `DECISIONS.md` #11 — this extends it to the public rating.)

### 2.3 A continuously-earned rating beats any one-time test (the chess move)
A one-time proctored exam proves you knew it *on one day*. A **rating that updates as you keep
performing against calibrated difficulty over time** proves you *keep* knowing it — there is no
single moment to cheat past ([Glicko](https://en.wikipedia.org/wiki/Glicko_rating_system)).
Fused with **FSRS spaced verification**, the rating is literally "you re-demonstrated this at
the edge of forgetting, repeatedly." The **RD and volatility terms are built-in fraud
detectors**: a bought/boosted account shows a suspicious rating jump with anomalous volatility;
sandbagging is caught by rating floors and statistical fingerprints
([sandbagging/boosting detection](https://www.chess.com/forum/view/site-feedback/sandbagging-control)).
**This is Bucket's differentiator** — everyone ships badges; almost no learning product ships a
continuously-earned, deviation-bearing *competence rating*.

### 2.4 "How do I know they didn't just click through?" — the explicit answer trail
For each public mastery claim, the profile can surface (employer-gated, see §3):
1. **The retrieval/derivation transcripts** — not a pass/fail, the *work*: their teach-back
   explanation, their derivation steps, graded by the canon-grounded tutor.
2. **Spaced verification history** — *when* and *how often* they re-demonstrated it (FSRS),
   proving durability, not a one-shot.
3. **Adaptive-assessment provenance** — which calibrated items, at what difficulty.

This is the EDCI/Open-Badges-3.0 **evidence** field done right: embed *artifacts of actual
work*, not a token ([Open Badges 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0) — the
`Evidence` + `Result`/`ResultDescription` model captures *where on the scale*, not binary
earned/not-earned).

### 2.5 Account-integrity (defeating CAMEO multi-account harvesting)
The landmark MOOC-cheating study (MIT/HarvardX, 1.9M learners) found **CAMEO** — "Copying
Answers using Multiple Existences Online": harvester accounts farm correct answers, fed to a
clean master account; ~25% of heavy certificate-earners used it
([Harvard Gazette](https://news.harvard.edu/gazette/story/2015/08/study-identifies-new-cheating-method-in-moocs/),
[arXiv 1508.05699](https://arxiv.org/pdf/1508.05699)). Two structural defenses, both cheap:
- **Adaptive rotating bank (§2.2)** — there's no stable answer key to harvest.
- **Account-linkage analytics** — timestamp/IP/behavioral correlation across accounts (the
  CAMEO detection signature), plus a **Gitcoin/Human-Passport-style humanity score as a sybil
  gate on account creation** ([Human Passport](https://human.tech/blog/human-passport-proof-of-personhood-and-sybil-resistance-for-web3))
  — neutralizes multi-account farming without Bucket building KYC.

### 2.6 Proctoring only as a *backstop*, only human-final (avoid the surveillance trap)
For the *highest-stakes* tier (a publicly-asserted credential a PI relies on), an optional
**lightweight AI screen + human-final review** — the DET model — can gate a "proctored" badge
variant ([DET security whitepaper](https://duolingo-papers.s3.amazonaws.com/other/det-security-proctoring-whitepaper.pdf)).
But heavy AI proctoring is a reputational landmine: ~30% false-analysis rates and documented
**bias against women and darker-skinned test-takers**
([Watching the Watchers, arXiv 2205.03009](https://arxiv.org/pdf/2205.03009)). **Decision: the
adaptive bank + rating do the anti-cheat work; proctoring is an opt-in backstop on the top tier
only, always human-final, never the default.** Most of Bucket's credibility should come from the
*structure of the measurement*, not from watching people.

### 2.7 The "can't be farmed without learning" test (the binding rule)
Every component that feeds the public rating must pass the rule already in `DECISIONS.md` #20:
**if it can be incremented without genuine retrieval, it does not feed the rating.** Streaks,
app-opens, time-on-task → *engagement* signals, shown separately, **never** part of the
credential. Only mastery-weighted, spaced-verified, adaptively-assessed retrieval feeds it.
(This also satisfies the SDT guardrail: tie everything to *competence-informational* mastery
events, not controlling rewards.)

---

## 3. How it's verified & shareable (the credential mechanics)

The profile is built in three trust layers an outsider can weigh **independently** — the EDCI
lesson (integrity / identity / quality kept separate,
[European Digital Credentials](https://europass.europa.eu/en/how-issue-european-digital-credentials)).

### 3.1 Layer 1 — A public URL (the shareable surface)
`bucket.foundation/m/<handle>` — a clean, fast, screenshot-native public page (the
laptop-sticker / "share at the success peak" growth loop from `UX-SPEC.md`). Deep-links back
into Bucket = the acquisition engine. Privacy-by-default: the learner chooses which branches and
which evidence are public (selective disclosure, §3.4). This alone is the **MVP** and needs no
credential standard — it's just a great, honest, public profile.

### 3.2 Layer 2 — Open Badges 3.0 / W3C Verifiable Credential (the interoperable credential)
Issue each durable mastery milestone (§1.4) as an **Open Badges 3.0 `OpenBadgeCredential`**,
which *is* a **W3C Verifiable Credential** (VC Data Model 2.0 reached W3C Recommendation
2025-05-15, [W3C VC 2.0 press release](https://www.w3.org/press-releases/2025/verifiable-credentials-2-0/);
[Open Badges 3.0](https://www.1edtech.org/1edtech-article/new-open-badges-30-standard-provides-enhanced-security-and-mobility/411060)).
Why this format and not a proprietary one:
- **Cryptographically signed → tamper-evident → machine-verifiable with no central authority.**
  An employer's wallet/verifier checks the signature against Bucket's published key; no call to
  a Bucket server required (fixes Mozilla Open-Badges-1.0's fatal "hosted assertion" fragility —
  a credential died when the issuer's URL died,
  [Open Badges history](https://openbadges.org/about/history)).
- **`Result`/`ResultDescription`** natively expresses *graded* mastery (where on the scale) —
  most platforms emit binary "earned it"; Bucket's depth signal needs the scale
  ([Open Badges 3.0 spec](https://www.imsglobal.org/spec/ob/v3p0)).
- **`Alignment`** points each claim at the canon-atom skill ID (§1.5) → comparable, job-matchable.
- **`Evidence`** embeds the work trail (§2.4).
- **Interoperable** with Credly, Canvas Credentials, LinkedIn, and emerging HR tooling — it can
  flow *into* systems employers already use, instead of being a dead-end island.
- **Selective disclosure** via SD-JWT — prove one branch without exposing your whole history.

### 3.3 Layer 3 — Story Protocol attestation (the optional notary, not the filing cabinet)
The expert consensus: **off-chain VCs are the right default; put on-chain *only* the narrow
functions where it genuinely beats a signed badge** — durable timestamp, cross-boundary
revocation registry, and survival-beyond-the-issuer ([VC vs blockchain credentials, arXiv
2209.09584](https://arxiv.org/pdf/2209.09584); [blockchain-credential decision matrix](https://sertifier.com/blog/blockchain-credentials-decision-matrix/)).
Bucket already runs **Story Protocol**, whose metadata model is *exactly* this hybrid: it
**anchors off-chain file hashes on-chain for tamper-evidence** while the files live off-chain
([Story whitepaper](https://www.story.foundation/whitepaper.pdf); [Story IP/PIL explainer](https://chainflow.io/story-protocol-explained/)).
So:
- **Anchor only a hash/commitment** of the issued credential as a Story IP Asset → a
  censorship-resistant, vendor-independent "this mastery milestone existed at block T," durable
  even if **Bucket the company disappears** (a real trust argument for a young nonprofit).
- This unifies with Bucket's existing loop: a learner who *authors* a canon atom mints it on
  Story (Scholar tier, `PRODUCT.md` §4); a learner who *masters* atoms anchors their proof on
  the **same rail**. Authoring and mastery share one provenance layer.
- **Keep all credential data and PII off-chain.** Never put the raw claim on a public ledger
  (permanence + privacy + key-loss failure modes of naive SBTs,
  [Decentralized Society / SBT paper](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763)).
- Optionally bind the anchor **non-transferably** (SBT-semantics, on the *pointer* only) so a
  mastery credential **can't be sold** — you can't buy someone else's proven mind.

> **Why not EAS instead of Story?** [Ethereum Attestation Service](https://docs.attest.org/)
> would also work as the notary and is worth a thin adapter. But Story is *already in Bucket's
> stack and license/provenance model*, and unifies "I authored canon" with "I mastered canon"
> on one rail. **Decision: Story for the anchor; keep an EAS adapter as a portability hedge.**

### 3.4 What an employer / PI actually clicks
1. Open `bucket.foundation/m/<handle>` → see the map, the per-branch rating *with its
   confidence band*, the durable milestones.
2. Click **"Verify"** on a milestone → the verifier checks the **OB 3.0 / W3C VC signature**
   (tamper-evidence + issuer identity) and resolves the **Story Protocol anchor** (durable
   timestamp). Green check = "intact, issued by Bucket, existed since T."
3. Click **"Inspect evidence"** (learner-gated) → the *work trail*: derivation transcripts,
   teach-back, spaced-verification history, the canon citation. **This is the part no normal
   resume offers** — the employer reads the actual proof, not a claim.
4. (Optional) the rating's **RD/recency** tells them how *proven* and how *current* it is — an
   honest credential that flags its own staleness.

---

## 4. Why this beats a normal resume (and ties to Bucket's mission)

| A normal resume | The Bucket Mastery Profile |
|---|---|
| **Self-asserted** ("proficient in X") | **Earned** — the score is inseparable from genuine retrieval (§0, §2) |
| **Static snapshot**, instantly stale | **Continuous & live** — updates as you learn; recency is shown, not hidden (FSRS) |
| **Coarse** ("knows physics") | **Granular** — concept-level, depth-graded (Recall→Derive→Teach), branch-spanning |
| **Unverifiable** (reference calls, trust) | **Verifiable** — cryptographic signature + Story anchor; one click checks it |
| **No evidence** | **Evidence-first** — the *actual work* (derivations, teach-backs) is embedded |
| **Written *about* you** | **Built *by* you, by learning** — the artifact *is* the learning |
| **Issuer brand = everything** (degree proxy) | **Evidence transparency** — an employer inspects the work, not just the seal |

**The mission tie-in.** Bucket exists for *"the small number of people who can do genius work
with AI"* — people who reach a layer of reality nobody has reached before (CLAUDE.md). A normal
resume cannot represent that person; a Mastery Profile can, because it shows **command of
foundations** (the canon: axioms, real math, primary derivations) at concept granularity, with
the work attached. It also **closes Bucket's loop**: foundations are free to *learn*; mastering
them produces a verifiable, mintable credential on the *same Story Protocol rail* used to publish
canon — so a learner's path runs **learn → master → (Scholar) author → mint**, all on one
provenance layer. "Build the past. Build history." becomes literal: your profile is the
accreting, citeable, permanent record of the foundations you rebuilt in your own mind.

**Nonprofit-consistent (GOVERNANCE.md).** The credential is **free** — Bucket never sells *access
to knowledge* or *the proof of knowing it*. Paid tiers sell AI horsepower / exam tooling, not the
Mastery Profile. Anchoring is optional and learner-controlled.

---

## 5. Phased build plan

Sequenced to ride the existing P0→P3 plan (`DECISIONS.md`), MVP-first, each phase shippable and
independently valuable. **Trust comes from the measurement structure (Phase 0–1); the credential
wrappers (Phase 2–3) are interoperability and durability, added once the signal is real.**

### Phase 0 — Honest signal first (rides P0/P1; no credential tech)
- Compute and **store** the per-(atom, signal) mastery (BKT × FSRS) the loop already produces.
- Define the **Mastery Rating** = IRT θ over the calibrated bank, fused with BKT/FSRS, **with
  RD/recency**. Validate it tracks real exam performance before showing it publicly.
- *No sharing yet.* This is the internal "is the number real?" gate. **Do not ship a rating we
  can't defend** (the `[verify]` discipline from the evidence base).

### Phase 1 — MVP shareable profile (rides P1)
- Public `bucket.foundation/m/<handle>`: the **map + per-branch rating with confidence band +
  per-concept depth/recency + the evidence trail**, learner-controlled visibility.
- Screen-reader list-mode (release gate). Share-at-success-peak growth loop.
- **No credential standard yet** — this is "the best honest public profile," already a
  differentiator and a viral acquisition surface. *Anti-gaming already present* via §2.1–2.3
  (retrieval loop + adaptive bank + continuous rating), §2.5 sybil gate, §2.7 binding rule.

### Phase 2 — Verifiable credential (rides P2/P3)
- Issue durable milestones (§1.4) as **Open Badges 3.0 / W3C VC** — signed, `Result`-graded,
  `Alignment`-linked to canon-atom skill IDs, `Evidence`-embedded.
- Public **"Verify"** flow (signature + issuer identity); selective disclosure (SD-JWT).
- Now it's **interoperable** (Credly/LinkedIn/HR tooling) and **machine-verifiable without
  Bucket's servers**.

### Phase 3 — Attested & durable (rides P3, with Scholar/Story)
- **Anchor credential hashes on Story Protocol** (durable timestamp, survives-the-issuer,
  optional non-transferable binding). EAS adapter as portability hedge.
- Unify with Scholar minting: one provenance rail for *master* and *author*.
- (Optional, top tier only) a **proctored** credential variant — DET-style lightweight AI screen
  + **human-final** review — for the highest-stakes external use. Never the default.

---

## 6. Cross-pillar dependencies

- **→ Data (heaviest).** Owns the **IRT item-bank calibration** and the **Mastery Rating math**
  (θ estimation, the Glicko-style RD/volatility model, FSRS-stability fusion) — the credibility
  of the whole credential rests here. Also: the **canon-atom → skill-ID** mapping for
  `Alignment` (RSD pattern), and the **account-linkage / CAMEO-detection analytics** (§2.5).
  People supplies the *spec* (what makes the rating honest, the anti-gaming requirements);
  Data builds and validates the model against real exam-performance data **before** any public
  rating ships.
- **→ Engineering.** Owns the **OB 3.0 / W3C VC issuance + signature verification**, the public
  profile route + verify flow, **Story Protocol anchoring** (reuse the existing IP-mint path)
  and the EAS adapter, selective disclosure (SD-JWT), the **sybil gate** on account creation,
  and the optional human-final proctoring backstop. Must keep the rating computation
  interpretable (a displayed number must be explainable — `DECISIONS.md` #11).
- **→ Product.** Owns the **Profile / Knowledge Portfolio UI** (map encoding, the confidence-band
  rating display, the "Verify"/"Inspect evidence" affordances, share-at-peak loop). Binding
  constraint: the rating is **informational, not controlling** (no leaderboard vanity), RD is
  shown not hidden, and the credential is free.
- **→ Operations.** **Privacy/compliance** of a *public* credential: GDPR data-minimization, the
  13+ age gate (and that minors get no public profile by default), the legal posture of
  non-transferable on-chain anchors, and the cost of issuance/anchoring (Story gas + signing).
  Also: the proctoring backstop's **bias/false-positive liability** (§2.6) — Ops must gate any
  AI-proctoring vendor on documented fairness, or we don't ship it.
- **→ Revenue.** The Mastery Profile is a **free, mission-consistent acquisition + retention
  engine**, not a SKU. Any external claim about what the rating *means* must cite the
  measurement, not overclaim — same discipline as the efficacy-claim rule (cite replicated
  numbers, `DECISIONS.md` #15). The credential's value is the *moat* (it makes leaving Bucket
  costly — your proven mind lives here), which Revenue should weigh in retention modeling.
- **→ Customer Success.** Onboarding must frame the profile as **"a credential you build by
  learning"** so the honest-progress UI (RD shown, recency decaying) reads as *integrity*, not
  the product being stingy — the same "desirable difficulty" mindset already in their mandate.

---

## 7. Sources

**Verifiable credentials & open badges**
- [Open Badges 3.0 — enhanced security & mobility (1EdTech)](https://www.1edtech.org/1edtech-article/new-open-badges-30-standard-provides-enhanced-security-and-mobility/411060) ·
  [Open Badges 3.0 spec (IMS/1EdTech)](https://www.imsglobal.org/spec/ob/v3p0) ·
  [Open Badges history](https://openbadges.org/about/history)
- [W3C publishes Verifiable Credentials 2.0 (Recommendation, 2025-05-15)](https://www.w3.org/press-releases/2025/verifiable-credentials-2-0/) ·
  [VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [Credly — what it does (issuer vetting)](https://learn.credly.com/blog/not-all-digital-badging-platforms-can-do-what-credly-does) ·
  [Badgr Pathways (Instructure)](https://www.instructure.com/canvas/blog/introducing-badgr-pathways)
- [European Digital Credentials for Learning (Europass)](https://europass.europa.eu/en/european-digital-credentials-learning) ·
  [How to issue EDCs](https://europass.europa.eu/en/how-issue-european-digital-credentials)
- [Mozilla — reflecting on the Open Badges journey](https://www.mozillafoundation.org/en/blog/reflecting-on-the-open-badges-journey/)
- [Open Skills Network — Rich Skill Descriptors](https://www.openskillsnetwork.org/rsd) ·
  [CTDL / RSD (Credential Engine)](https://credentialengine.org/resources/open-skills-and-rich-skill-descriptors-ctdl-enables-connections-and-collaboration/)

**Rating-as-resume & skill profiles**
- [Glicko rating system](https://en.wikipedia.org/wiki/Glicko_rating_system) ·
  [Glicko-2 overview](https://www.emergentmind.com/topics/glicko2-rating-system) ·
  [FIDE titles](https://en.wikipedia.org/wiki/FIDE_titles)
- [Duolingo English Test — scoring (CAT + IRT)](https://blog.englishtest.duolingo.com/how-is-the-duolingo-english-test-scored/) ·
  [Settles et al., TACL 2020](https://research.duolingo.com/papers/settles.tacl20.pdf) ·
  [DET security whitepaper](https://duolingo-papers.s3.amazonaws.com/other/det-security-proctoring-whitepaper.pdf)
- [Kaggle progression system](https://www.kaggle.com/progression)
- [GitHub fake-star economy](https://dev.to/dev_tips/the-fake-github-economy-no-one-talks-about-stars-followers-and-5k-accounts-43pn) ·
  [Stack Overflow badges explained](https://stackoverflow.blog/2021/04/12/stack-overflow-badges-explained/) ·
  [LinkedIn endorsements are noise](https://www.liseller.com/linkedin-growth-blog/linkedin-endorsements)

**Anti-gaming & assessment integrity**
- [Item Response Theory overview](https://www.emergentmind.com/topics/item-response-theory-irt) ·
  [Adaptive item selection / exposure control](https://www.emergentmind.com/topics/adaptive-item-selection)
- [CAMEO MOOC cheating — Harvard Gazette](https://news.harvard.edu/gazette/story/2015/08/study-identifies-new-cheating-method-in-moocs/) ·
  [Northcutt/Chuang/Ho, arXiv 1508.05699](https://arxiv.org/pdf/1508.05699)
- [AI-proctoring bias — Watching the Watchers, arXiv 2205.03009](https://arxiv.org/pdf/2205.03009) ·
  [Sandbagging/boosting detection (chess.com)](https://www.chess.com/forum/view/site-feedback/sandbagging-control)
- [Building trust & rigor in microcredentials (EDUCAUSE)](https://er.educause.edu/articles/2025/10/building-trust-and-rigor-in-microcredentials-synthesizing-standards-taxonomy-and-frameworks)

**Web3 credentials**
- [Story Protocol whitepaper](https://www.story.foundation/whitepaper.pdf) ·
  [Story Protocol explained (IP Assets / PIL / metadata anchoring)](https://chainflow.io/story-protocol-explained/)
- [Ethereum Attestation Service docs](https://docs.attest.org/) ·
  [Decentralized Society / Soulbound Tokens (Weyl, Ohlhaver, Buterin)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763)
- [VC vs blockchain credentials, arXiv 2209.09584](https://arxiv.org/pdf/2209.09584) ·
  [Blockchain-credential decision matrix](https://sertifier.com/blog/blockchain-credentials-decision-matrix/) ·
  [Human Passport — proof-of-personhood / sybil resistance](https://human.tech/blog/human-passport-proof-of-personhood-and-sybil-resistance-for-web3)

**Internal grounding**
- `research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md` (FSRS, retrieval, R/A/D/T, SDT, calibration)
- `research/_synthesis/UX-SPEC.md` (Profile / Knowledge Portfolio view, map encoding, accessibility)
- `research/_synthesis/DECISIONS.md` (#11 BKT×FSRS×IRT, #19 accessibility, #20 can't-be-farmed rule)
- `KNOWLEDGE-ARCHITECTURE.md` §2 (Concept Atom = markdown + stable ID + canon_ref = the skill descriptor)
- CLAUDE.md / GOVERNANCE.md (mission: genius work with AI; nonprofit — knowledge & its proof are free)

---

### Verification flags (page-check before external publication)
1. Kaggle tier medal thresholds (e.g. Competitions GM = 5 gold incl. 1 solo) — confirm against
   the live progression page before quoting exact counts externally.
2. CAMEO "~25% of heavy certificate-earners" — from the 2015 MIT/HarvardX study; cite the figure
   as that study's finding, not a universal rate.
3. AI-proctoring "~30% incorrect analysis" — secondary-cited; page-check the primary before
   external use. (Used here only to justify *not* defaulting to heavy proctoring — safe as
   directional.)
