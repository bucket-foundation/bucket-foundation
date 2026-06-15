# EPIC — Bucket Academy: the strongest learning system + the verifiable mastery map

**Bead:** bkt-jh0 · 2026-06-14 · Synthesized by Nucleus from 4 deep-research deliverables
(`research/landscape/PRODUCT-LANDSCAPE.md`, `MARKET-MONETIZATION.md`, `ADAPTIVE-SOTA.md`,
`MASTERY-PROFILE.md`) on top of the prior 7-pillar synthesis (`research/_synthesis/`).

---

## 1. The thesis (the white space)

No learning product spans more than **two** of the four capabilities that actually
produce durable, provable learning. Lay every competitor on the grid:

| Capability | Who has it | Who's missing it |
|---|---|---|
| **1. Per-learner retention engine** (spaced repetition) | Anki, SuperMemo | Brilliant, Khan, Duolingo-tutor |
| **2. Typed, directed prerequisite knowledge-graph** (doubles as navigation) | Math Academy, ALEKS | everyone else (Obsidian = broken untyped hairball) |
| **3. Thorough AI lessons for ANY topic** | (nobody at quality) | Math Academy (hand-authored, math-only), everyone |
| **4. Verifiable, canon-grounded mastery profile** | **nobody** | everyone |

**Bucket targets all four at once** — genuinely unoccupied. The wedge user is the serious
autodidact who today stitches together Anki + Brilliant + 3Blue1Brown + Obsidian + a
chatbot and *still* feels nothing accumulates into a structure they can prove they own.

**The product in one line:** *Learn anything from thorough lessons, retain it with adaptive
review over a real knowledge graph, and turn what you've mastered into a verifiable
resume — backed by primary-source canon.*

---

## 2. The differentiator: the map IS a verifiable digital resume

The learning map stops being a private dashboard and becomes a **public Mastery Profile** —
the best resume you can have, because it's *evidence*, not a claim:

- **What it shows:** your mastered concepts across the canon branches (the concentric-shell
  map), a per-branch **Mastery Rating with visible uncertainty** (Glicko-style: rating +
  how *proven* + how *current*), per-concept depth (Recall→Apply→Derive→Teach), recency,
  and an **evidence trail of the actual work** (derivation transcripts, teach-backs), plus
  durable **"title-style" milestones** you proved once and hold.
- **Why it's trustworthy (the moat):** a credential is only trustworthy if *the score is
  mechanically inseparable from doing the real thing* (chess Elo, the Duolingo English Test,
  Kaggle's hidden test set all have this; GitHub stars, LinkedIn endorsements, completion
  certificates do not). Bucket's retrieval-with-feedback loop already produces exactly this.
- **The economics (why nonprofit *wins* here):** in every credentialing market the
  **verifier (employer) pays, never the learner**. So Bucket gives away the learning *and*
  the credential, and charges the employer-verification side. A nonprofit with no incentive
  to inflate grades is the *trusted instrument* the skills-based-hiring market lacks
  (~85% of firms want it; ~0.14% of hires actually use it — no trusted instrument exists).
  The credential is also the strongest viral loop in the landscape — people self-broadcast
  credentials (Credly→LinkedIn, GitHub-as-resume).

---

## 3. Architecture (the engine that makes it real)

**Knowledge layer (Data):**
- **Two-layer graph:** `requires` (prerequisite) + separately-weighted **encompassing**
  edges, enabling **FIRe** (Fractional Implicit Repetition — mastering an advanced concept
  credits its prerequisites *down* the graph). This is Math Academy's proven fix for the
  review-backlog explosion our current one-deck-per-atom design doesn't handle.
- **Diagnostic:** ALEKS-style binary-search-over-states (~10–25 questions) so experts start
  mid-graph, not at "what is energy."
- **Mastery score (credential-grade):** per concept, fuse **proficiency** `P = σ(a(θ−b))`
  from IRT/Elo *at the lower confidence bound* (certify what you're sure of) with
  **retention** `R = R(T,S)` (FSRS retrievability at a fixed horizon, e.g. 90 days),
  **multiplicatively**: `M = P^α · R^β`. Aggregate conjunctively (weighted geometric mean).
  Spine moves **BKT → IRT/Elo** (Elo = online IRT, solves cold-start).

**Assessment & trust (Engineering + People):**
- **Generate transfer items by construction** (template skeletons + LLM scenario wrappers,
  multi-hop from the graph, Bloom-targeted, distractors from error models).
- **Grade deterministically where possible** (SymPy symbolic equivalence); LLM-judge only
  with ensembles + adversarial canaries.
- **Practice/credential firewall:** practice allows SR, retries, self-report; the
  **credential comes only from a sealed, held-out checkpoint of freshly-generated transfer
  items the learner has never seen**, effort-filtered (guesses can't raise it),
  exposure-controlled, and **time-decaying** (must be re-demonstrated). Self-report affects
  scheduling only, never credit. Every farming strategy then earns practice points that
  don't convert to mastery.

**Content layer:** thorough lessons (shipped) + **any-topic AI generation** (shipped,
grounded, validated) + canon grounding (human-reviewed T0 canon vs. generated personal decks).

**Profile layer (Engineering + Product):** public `bucket.foundation/m/<handle>` →
**Open Badges 3.0 / W3C VC 2.0** signed credential (machine-verifiable without our servers,
`Alignment`-linked to canon skill IDs, `Evidence`-embedded), cryptographically signed by
Bucket as issuer. Optional durable anchor = a content-hash timestamp (e.g. a transparency
log), **not** an NFT/chain mint. Path: **learn → master → author → share**.

> **Decision (2026-06-14): no Story Protocol.** Credentials use Open Badges 3.0 / W3C VC
> only (issuer-signed, no blockchain). The creator rail is author + share + attribution —
> no on-chain mint, no token royalties. Anywhere the research docs reference Story Protocol
> minting/attestation, treat it as superseded by signed VCs + plain attribution.

**Monetization (Revenue + Operations):** four objects, none paywalls knowledge —
(1) knowledge free forever (grant-funded, Khan model); (2) **Pro $12/mo** = AI horsepower +
PDF-import + Exam-Simulator + analytics (needs the 3 cost controls: caching, cheap-default
routing, frontier cap); (3) **verified credentials free to the learner, monetized on the
verifier side** (recruiter verification API + institutional issuance); (4) **Scholar creator
rail** ~2% cost-recovery (author + share decks; attribution, no on-chain mint/royalties).

---

## 4. Roadmap (phases → beads under bkt-jh0)

**Phase 0 — DONE (shipped to production):** thorough lessons on 358 atoms + Study mode
lesson rendering · email-OTP auth on self-hosted Supabase · any-topic/any-language
generation + dynamic deck manifest + per-user library · polyglot mode.

**Phase 1 — Adaptive core** (make the engine genuinely strong):
- Two-layer graph (`requires` + encompassing edges) + edge data.
- FIRe scheduling on top of FSRS (review propagates down the graph).
- Diagnostic (ALEKS-style binary search) → start experts mid-graph.
- Mastery model: IRT/Elo proficiency × FSRS retention fusion `M=P^α·R^β`, per concept.

**Phase 2 — Assessment & trust** (make the credential real):
- Transfer-item generation by construction (Bloom-targeted, distractors).
- Deterministic grading (SymPy) + LLM-judge with ensembles/canaries.
- Practice/credential firewall (sealed held-out checkpoint, effort filter, exposure control).
- Anti-gaming (gaming/wheel-spinning/copy detectors + sybil gate).

**Phase 3 — Mastery Profile (the resume):**
- Public Mastery Profile page (map + honest rating + evidence) at `/m/<handle>` — **MVP**.
- Open Badges 3.0 / W3C VC issuance + verify flow (issuer-signed, no blockchain).
- Optional content-hash transparency-log anchor (durable timestamp; NOT an NFT mint).
- Recruiter/employer verification API + skill search (the revenue line).

**Phase 4 — Product polish & growth** (the 12 moves not yet covered):
- "Unlocks →" leverage line + post-mastery unlock animation.
- Functional art anchor per atom (build-time, cached) — dual-coding.
- Grounded non-punishing "Explain my answer" feedback moment.
- AI tutor inside the scheduler+graph (S1–S7 safety, SymPy/CAS split).
- Comprehensible-input "learn from the actual papers" mode + known-concepts counter.
- Scholar/Studio creator rail — author + share decks + attribution (no on-chain mint).
- Onboarding commitment ladder + placement quiz before signup.

**Phase 5 — Trust / ops / monetization:**
- **Validate the mastery rating against real exam performance** (HARD GATE before any
  public rating ships — our `M=P^α·R^β` fusion is a synthesis, not yet a cited result).
- Pricing/tiers (Pro $12, verifier-pays credential, Scholar) + Viatika metering.
- Compliance (GDPR/13+ for a public credential, EU AI Act Art. 50 provenance marking due
  2026-08-02, AERA/APA/NCME validity posture).

---

## 5. The one hard guardrail

**Never ship a public mastery rating that hasn't been validated against real exam
performance**, and never overclaim efficacy (cite only the replicated ~0.5–0.8σ band, never
Bloom's 2σ). The credential's entire value is that it's *trustworthy*; a nonprofit with no
incentive to inflate grades is the moat — squander that and there's nothing left.
