# Bucket Academy
Operations: Cost, Compliance & Risk.

**Bead:** bkt-xo0 · **Pillar:** Operations · **Author:** Ops/CISO (Nucleus-dispatched) · 2026-06-11
**Scope:** AI cost model, Viatika metering, copyright, privacy, content moderation, accessibility, security.
**Founder mandate:** not fast, *correct and amazing*. Open/legal sources only.

> One-line thesis: the variable cost of Bucket Academy is **AI image/art generation**, well ahead of LLM tokens.
> Get the art-caching architecture right and a free learner costs **fractions of a cent/month**; get it
> wrong (art per user, per session) and it costs dollars. Everything else (compliance, accessibility,
> security) is a *correctness* obligation a nonprofit serving minors and EU learners cannot skip.

---

## 0. Executive summary

| Area | The decision | The number / requirement |
|---|---|---|
| **LLM cost** | gpt-4o-mini / Haiku-class for gen + tutor; cache aggressively | ~$0.15/$0.60 per 1M tokens (in/out), rounding error per user once cached |
| **Art cost** | **Pre-generate shared concept art ONCE, cache forever**; per-user art is Pro-only and capped | Shared art: one-time ~$0.003-0.04/image. Per-user art: the only real variable cost |
| **Free user / month** | Sustainable | **~$0.01-0.05/active free user/month** (mostly cached) |
| **Pro user / month** | Profitable at $8-12/mo | **~$0.50, $2.50/active Pro user/month** AI cost; >80% gross margin |
| **Metering** | Route ALL of it through **Viatika vendor API** (Cedar policy + atomic budget + x402/Stripe). **No duplicate ledger.** | Per org policy #6 |
| **Copyright** | Open-access corpus only; **facts/equations are not copyrightable** (write atoms in our own words); PDF-import = user's owned copy, never hosted/shared; DMCA agent + safe harbor | Idea/expression dichotomy + Feist |
| **Privacy** | COPPA (under-13), FERPA (school use), GDPR (EU) all in scope. **Data-minimize learning records.** | COPPA compliance deadline **2026-04-22** (already passed) |
| **Moderation** | UGC atoms (Scholar tier) get quality + safety + **IP-ownership** checks BEFORE Story Protocol mint | Human-in-loop gate |
| **Accessibility** | **WCAG 2.2 AA** is a hard design requirement | 4.5:1 contrast, full keyboard, SR semantics, reduced-motion, dyslexia mode |
| **Security** | Dynamic web3 + email auth, encrypt learning data, **rate-limit AI generation hard** (abuse = cost) | Per-user + per-IP gen quotas enforced at Viatika budget layer |

---

## 1. AI Cost Model
The big variable cost.

### 1.1 LLM token costs

| Model class | Input ($/1M tok) | Output ($/1M tok) | Use in Bucket |
|---|---|---|---|
| **gpt-4o-mini** | $0.15 | $0.60 | Card/quiz/cloze gen, RAG answers, routine tutor turns |
| **Claude Haiku 4.5** | $1.00 | $5.00 | Higher-quality tutor / grading where mini is too shallow |
| **Claude Sonnet 4.6** | $3.00 | $15.00 | Exam-grading, derivation-checking (Pro only, sparing) |
| GPT-4o / Opus | $2.50, $5 / $10, $25 | - | Avoid for per-user loops; reserve for offline atom authoring |

Cost levers (all real, all 2026):
- **Prompt caching:** Anthropic cuts cached input **90%**; OpenAI **50%**. For RAG with shared document/atom context, real-world savings are **60-95%**. Our atoms and system prompt are *static and shared across all users*, this is the single largest lever.
- **Batch API:** 50% off both directions for non-interactive jobs (nightly atom extraction, deck regeneration).
- **Cached-input pricing (OpenAI):** $0.075/1M for cached gpt-4o-mini input.

**Token budgets per operation (engineering estimates, conservative):**

| Operation | In tokens | Out tokens | gpt-4o-mini cost | Notes |
|---|---|---|---|---|
| Generate 1 atom's card set (recall+cloze+derive) | ~2,500 | ~800 | ~$0.0009 | **Done once, cached/stored, shared across users** |
| Quiz question from atom | ~1,500 | ~300 | ~$0.0004 | Cacheable per atom |
| RAG tutor turn (atom context cached) | ~4,000 (mostly cached) | ~500 | ~$0.0006-0.0009 | Cached prefix → ~$0.0002 effective |
| Exam grading (Pro, Sonnet) | ~6,000 | ~1,200 | ~$0.036 | Pro-only, infrequent |
| 3-depth explanation | ~2,000 | ~900 | ~$0.0008 | Cache the ELI5/UG/grad triplet per atom |

**Conclusion on tokens:** with caching + storing generated cards as durable artifacts (not regenerating per user),
LLM token cost per active learner is **well under $0.05/month even for heavy Pro users**. Tokens are *not* the cost risk.

### 1.2 Image / ART generation
The cost wildcard.

This is where money is made or lost. Per-image API costs (2026):

| Tier | Models | $/image | Use |
|---|---|---|---|
| **Hosted aggregator (cheapest)** | Flux Schnell, SDXL on fal/Replicate/Together | **$0.003, $0.01** | **Shared concept art, our default** |
| Open-weight production | Flux 2 Pro, SD 3.5, Recraft V3 | $0.02, $0.10 | High-res collectible "trading cards" (Pro) |
| Premium | GPT Image 1.5, Imagen 4, DALL·E 4 | $0.03, $0.20 | Only if quality demands it; reserve |
| Self-hosted (A100) | Flux/SDXL on own GPU | ~$0.003/img (500-1000 img/hr) | If volume justifies a GPU; later |

**The architecture decision that makes the whole product viable:**

> **Concept art is a property of the *atom*, shared across every *user*.** A biophysics nucleus has ~30-60 atoms per
> branch × 10 branches ≈ **300-600 nucleus atoms**. Each atom's `art_prompt` (already a field in the data model)
> is rendered **once**, stored, CDN-served, and shown to *every* learner forever.

**One-time shared-art capitalization cost:**
- 600 nucleus atoms × $0.01 (Flux Schnell) = **$6.00 total, one time.**
- Even at premium $0.10/image for hero cards: 600 × $0.10 = **$60 one time.**
- Re-rolls / variants for quality curation: budget 3× → still **<$200 one-time for the entire shared art library.**

This is a *fixed* cost (cap-ex), amortized across the entire user base. It does **not** scale with users.

**Per-user (variable) art** = the only art cost that scales:
- **Free tier:** sees ONLY pre-generated shared art. **$0 marginal art cost.** (Daily cap on any custom gen = 0, small.)
- **Pro tier:** "custom mnemonic art generated to your prompts" + high-res collectible cards. This is the variable line item. At $0.02, $0.10/image and a **soft monthly cap** (see §1.4), a Pro user generating 20 custom images/month = **$0.40, $2.00/month**.

### 1.3 Cost-per-active-user model

Assumptions: gpt-4o-mini for gen/tutor with caching; shared art pre-generated; Pro custom art at $0.05/img avg, capped at ~30/mo; tutor heavy-user 300 turns/mo.

| Line item | Free (capped) | Pro (uncapped tutor, capped art) |
|---|---|---|
| Tutor turns (cached RAG) | 30/mo × $0.0003 = $0.009 | 300/mo × $0.0005 = $0.15 |
| Card/quiz gen (mostly from cache of shared atoms) | ~$0.00 (served from cache) | ~$0.05 (some personal-deck gen) |
| Exam grading (Sonnet) | n/a | 4/mo × $0.036 = $0.14 |
| Custom art | $0 (shared only) | 30/mo × $0.05 = $1.50 (capped) |
| PDF-import extraction (per import, gpt-4o-mini, batch) | n/a | ~$0.10-0.30 per textbook, occasional |
| **Total AI cost / active user / mo** | **~$0.01, $0.05** | **~$0.50, $2.50** |

At a Pro price of **$8-12/mo**, AI COGS of $0.50, $2.50 leaves **>80% gross margin** even for a heavy user.
The free tier at **~1-5¢/active user/month** is sustainable for a nonprofit *provided* the caps in §1.4 hold
and shared-art caching is enforced. **Coordinate the exact price point and conversion assumptions with Revenue's
unit-economics deliverable**, this model gives Revenue the COGS floor.

> Cross-check: the dominant risk is not the steady-state numbers above but **abuse** (a script hammering the
> tutor/art endpoints). That is a *security + metering* problem, solved in §2 and §7, one layer away from pricing.

### 1.4 Caching strategy + usage caps

**Cache / pre-generate (do once, serve to all):**
1. **Shared concept art**, render every nucleus atom's `art_prompt` once at content-build time; store in object storage (Walrus/Supabase storage/CDN); never per-user.
2. **Atom card sets**, generate recall/cloze/derive cards once per atom, store as durable artifacts in the deck, version with the atom. Regenerate only when the atom's source changes (nightly batch).
3. **3-depth explanations**, generate ELI5/UG/grad once per atom, cache.
4. **Quiz banks**, generate a pool per atom, sample at runtime (don't regenerate per quiz).
5. **LLM prompt-prefix caching**, keep the system prompt + retrieved atom context as a stable cached prefix so every tutor turn pays cached-input rates.

**Generate per-user (the only variable spend):**
- Live Socratic tutor turns (cached prefix), custom Pro art, exam grading, PDF-import extraction.

**Caps that keep free-tier sustainable (enforced at the Viatika budget layer, §2):**

| Limit | Free | Pro |
|---|---|---|
| AI tutor messages/day | 20-30 | unlimited (fair-use rate-limited) |
| Custom card/quiz gen/day | 10 | unlimited (rate-limited) |
| Custom art/month | 0 (shared art only) | ~30 soft cap, then queue/slow |
| PDF imports/month | 0 | reasonable cap (e.g. 10 books) |
| Exam-simulator runs/month | 0-1 trial | unlimited (Sonnet-gated) |

Caps are **budget policies** sitting above hard-coded app logic, they live in Viatika (§2) so they're auditable and adjustable without a deploy.

---

## 2. Viatika metering

**Org policy (AGFarms CLAUDE.md, Strategic Priority #6 + Viatika architecture):** every metered AI/data
Endpoint in any AGFarms venture **MUST call the Viatika vendor API** in place of its own ledger. Viatika is a
**third-party vendor**, we are a customer. The source at `~/agfarms/viatika` is **READ-ONLY reference**; we
Integrate against the API, we do not modify or fork it.

**What Viatika provides (confirmed from vendor docs `~/agfarms/viatika/docs/`):**
- **Credits subsystem**, `CreditAccount` (one balance ledger per org), `CreditTransaction` (immutable audit trail), `$0.001/credit`, Stripe purchasing + webhooks + daily reconciliation.
- **Policy Engine**, `Policy` (Cedar/JSON), `BudgetPolicy` (spending limits with period enforcement), `Entity` hierarchy (org/team/user), `WhitelistEntry` (provider allow/deny), `PendingApproval` (human approval queue).
- **Rules that matter for us:** *PE-03 hierarchical budget aggregation, most restrictive wins*; *X4-03 policy gate before any signature*. So a per-user daily cap nested under an org monthly budget is exactly the model Viatika already enforces.
- **x402 micropayments**, `/sign-payment` (EIP-712, custodial wallet) → x402 facilitator → Base L2 USDC settlement. **Stripe↔x402 bridge** for human-paid → agent-metered flows.

**How Bucket Academy should route AI spend through Viatika:**

```
Learner action (tutor / art / exam / PDF import)
        │
        ▼
Bucket Academy backend (Next.js API route)
        │  1. classify operation → cost estimate (credits)
        ▼
Viatika Policy Engine  ──►  Cedar policy: is this user/op allowed?
        │                    BudgetPolicy: under daily/monthly cap?  (most-restrictive wins)
        │                    └─ if over cap → 402 / friendly "daily limit reached" (NOT an error)
        ▼  2. ConsumeCredits (atomic deduct, immutable txn)
Run the AI op (LLM / image model)
        │  3. reconcile actual cost vs estimate (daily recon job)
        ▼
CreditTransaction audit trail (per org, per user via Entity hierarchy)
```

**Implementation rules (binding):**
1. **No second ledger in Bucket.** Bucket stores *learning data*; Viatika stores *spend*. Do not duplicate credit accounting in Supabase.
2. Map the §1.4 caps to **Viatika `BudgetPolicy` rows** (per-user daily, per-tier monthly, per-org global) in place of app constants. Free vs Pro = different Cedar policy + budget tier.
3. **Free tier = an org-funded budget** (Bucket the nonprofit pays the small shared cost); Pro tier = the user's subscription funds their budget via the **Stripe→credits bridge**. Scholar/Studio rev-share + Story Protocol citation fees settle over **x402 on Base**, also Viatika's lane.
4. Viatika is also our **x402 data provider** (PubMed/PubChem/OpenAlex via x402-research-gateway). Corpus/RAG fetches that hit metered data go through the same rail, one budget, one audit trail.
5. If Viatika lacks a feature (e.g. A specific per-feature meter), **file a vendor ticket; do not fork** (per org rule).
6. **Credentials** (Viatika API key, wallet) live in Bucket's venture secrets / K3s namespace, never in the Viatika repo, never in git.

---

## 3. Copyright compliance
Where the lines are.

Bucket is a nonprofit whose mission is *"primary research paid-for-once, citeable-forever."* The learning
product must be **bulletproof** on copyright. Lines:

### 3.1 The corpus: open-access only
Confirmed against `ACQUISITION-LEDGER.md`: **no vk.com / PDF Drive / shadow-library pulls.** The legal corpus is
arXiv, bioRxiv/medRxiv, PMC Open Access Subset, LibreTexts, OpenStax, MIT OCW, NCBI Bookshelf (open sections),
Project Gutenberg / public-domain Internet Archive, Wikisource. **This is correct and must stay enforced.**
Each open source carries its own license (CC-BY, CC0, arXiv non-exclusive, OCW CC-BY-NC-SA), *respect
attribution + non-commercial terms per source.* OCW's NC clause matters for a paid tier: cite/link, don't
repackage OCW prose into a paid product. Atoms are written in our own words and *cite* the source.

### 3.2 Facts and equations are NOT copyrightable
The load-bearing legal principle (US): the **idea/expression dichotomy** and **Feist**, *facts and the ideas,
Theories, and facts in any work are free for public use; only the author's particular expression is protected.*
- The **Boltzmann distribution**, a derivation, a master equation, a physical law = **facts/ideas → not protected.**
- A textbook's **specific prose, figures, problem sets, selection-and-arrangement** = **expression → protected.**

**Rule for atom authoring:** write the concept/equation/derivation **in our own words** (Feynman-level explanation
+ formal statement + worked example we author). **Never copy textbook prose, figures, or problem sets.** This is
why `KNOWLEDGE-ARCHITECTURE.md`'s "we never reproduce textbook prose" stance is not just ethics, it's the legal
moat. Equations rendered as our own art/diagrams are our expression of a non-protectable fact.

### 3.3 User PDF-import
The precise legal boundary.

Pro lets a user import a textbook **they legally own**. The lines:

| Allowed | Forbidden |
|---|---|
| User uploads a copy **they own**, for **their own** study | Hosting a shared library of textbook PDFs |
| Extract facts/concepts into **that user's private deck** | Re-distributing extracted text to other users |
| Transient processing to generate **the user's** cards | Making the original PDF (or its full text) downloadable by others |
| User keeps/deletes their own import | Building a searchable corpus of others' copyrighted uploads |

**Design requirements:**
1. **Personal scope only**, an imported PDF and anything extracted from it is private to the importing user; never enters the shared corpus, shared decks, or another user's view.
2. **No hosting-as-distribution**, we are a tool that processes the user's own copy; we are not a file-sharing host. Don't expose the raw PDF or its full extracted text to anyone but the owner.
3. **Attestation at import**, UI checkbox: "I legally own this copy and will use it for personal study." (Establishes the user's representation; supports our posture.)
4. **Transient/minimized retention**, process to atoms, then offer to delete the source PDF; don't retain full copyrighted text longer than needed (also a privacy/data-min win, §4).
5. **Extraction = facts, held clear of expression**, the cards generated are the user's private study aids built from facts; we don't republish the book.

### 3.4 DMCA posture
Because Pro accepts user uploads, Bucket is an **online service provider hosting user content** and should claim
**DMCA §512 safe harbor**:
- **Register a DMCA agent** with the US Copyright Office; publish the agent's contact + a clear notice-and-takedown policy.
- **Notice-and-takedown** workflow: receive valid notices, remove/disable expeditiously, forward to user, support **counter-notice**.
- **Repeat-infringer policy**, terminate accounts of repeat infringers (a §512 condition).
- No "red-flag" knowledge, don't induce or knowingly host infringement (reinforces the §3.3 personal-scope design).
- Safe harbor protects *us* from liability for *user* uploads; it does not cover our own corpus, which §3.1/§3.2 already keep clean.

### 3.5 AI-generated art copyright
Per US Copyright Office guidance + the **Supreme Court cert denial (2026-03-02)** leaving the human-authorship
requirement in place: **purely AI-generated images have no copyright owner** ("belongs to no one"). Implications:
- Our shared concept art (AI-generated from `art_prompt`) is likely **not protectable** as-is, fine for a free shared library, but don't claim exclusive copyright on it.
- For **Story Protocol minting** of user contributions (§5): a mintable IP asset needs **meaningful human authorship** (the human's selection, arrangement, derivation text, creative control), well above a bare AI image. Disclose AI-generated portions. This shapes what's eligible to mint (the human's *atom/derivation*, with the auto-art excluded).

---

## 4. Privacy
COPPA, FERPA, GDPR + data-minimization.

Bucket targets EU learners and may have student/minor users → **all three regimes are in scope.**

### 4.1 COPPA
Deadline already passed.

The FTC's amended COPPA Rule took effect 2025-06-23 with a **compliance deadline of 2026-04-22** (now past, we must be compliant *from launch*). Key obligations if we knowingly collect data from under-13s:
- **Verifiable parental consent (VPC)** before collection, new permitted methods include knowledge-based auth, facial-match to photo ID, and text-plus (for operators not sharing data with third parties).
- **Expanded "personal information"** now includes **biometric data and government IDs**, so don't use facial-recognition VPC unless you're prepared to handle biometrics as PI.
- **Separate consent for third-party sharing**, parents can consent to collection *without* consenting to third-party disclosure. Since we route metering through **Viatika (a third party)**, structure it as *integral to the service* and minimize what user-identifying data ever reaches Viatika (send opaque user/org IDs in place of names/emails).
- **No indefinite retention**, keep children's data only as long as reasonably necessary; delete after.

**Recommended posture:** **Bucket Academy is directed to ages 13+** for self-serve signup (set a neutral age gate). Under-13 access only via the **school/parent path (FERPA/VPC)**, closed to open signup. This narrows COPPA exposure while still serving classrooms.

### 4.2 FERPA
If a school adopts Bucket for students, we become a vendor handling **education records**. To qualify under the
**"school official" exception** (so the school can share student data with us without per-parent consent), we must:
- Perform an **institutional service** the school would otherwise do in-house;
- Be under the school's **direct control** re: use/maintenance of records;
- Use PII **only** for the authorized educational purpose (no secondary use, no ad use, no training general models on it);
- Sign a **FERPA-compliant data agreement** (scope of data, breach-notification, security measures, deletion on termination);
- Support the school's obligation to **log access** to student records.

**Design:** a "classroom/cohort" mode (already in the Scholar/Studio tier) must isolate student data, disable third-party sharing, and ship a standard **Data Privacy Agreement** (DPA) template.

### 4.3 GDPR
- **Legal basis**, pick and document one of the six before processing. *Contract* (delivering the learning service) for core account data; *consent* (freely given, specific, informed, withdrawable as as given) for anything optional (marketing, non-essential analytics).
- **Age of digital consent**, default **16**, member states may lower to **13**. For under-threshold minors, parental consent required → reinforces the 13+/school-path posture.
- **Data minimization**, collect only what's functionally needed. Per the example in the research: an e-learning app requiring DOB + home address + phone "when only an email is needed for course delivery" **violates** minimization. For Bucket: **email + display name is enough**; do not collect DOB beyond a yes/no age gate, address, or phone.
- **Special-category data**, disability/health/SEN data is sensitive. A **"dyslexia-friendly / accessibility needs"** toggle (§6) could reveal a disability → store it as an opaque UI preference, well clear of a health record; don't profile on it.
- **Data-subject rights**, access, rectification, **erasure**, portability (the Anki-export in Pro already helps portability), object/restrict. Build self-serve export + delete.
- **Records of processing, DPA with Viatika** (we're controller, Viatika a processor for spend data), breach notification (72h), privacy notice. If we scale in the EU, assess need for an EU representative / DPO.

### 4.4 Data-minimization for learning records
The FSRS per-user memory model, mastery heatmaps, weak-atom tracking, and tutor transcripts are **rich behavioral
data about how a person thinks and what they struggle with**, sensitive by nature even if not legally "special
Category." Principles:
- Store the **minimum** needed for the scheduler (per-atom stability/difficulty/retrievability + review timestamps), that's a compact numeric model, far smaller than a transcript archive.
- **Don't retain raw tutor transcripts** longer than the session needs; if kept for "continue where you left off," cap retention and let users clear history.
- **Pseudonymize** what goes to analytics; aggregate before it leaves the user's row.
- **Never train shared/general models on individual learning data** without explicit, separate consent, and not at all for under-13s or FERPA records.

---

## 5. Content moderation, UGC atoms/decks

Scholar/Studio users author atoms/derivations and **mint to Story Protocol** to earn citation fees. Minting is
**publishing to the canon**, so the gate before mint is the critical control point.

**Three checks before any Story Protocol mint (human-in-the-loop):**
1. **Quality / canon-fit**, does it meet Bucket's "foundations only" bar (axioms, real math, laws, primary derivations, held above outcomes/opinion)? Route through the existing **Longtail chisel review queue** (`longtail.agfarms.dev/chisel`, already wired for Bucket grant drafts) for fast yes/no/unsure on quality axes. Reuse, don't rebuild.
2. **Safety**, automated screen for prohibited content (hate, harassment, dangerous instructions, sexual content involving minors, PII leakage) + a manual gate for anything flagged. Tutor and gen outputs also need a safety filter (coordinate with **People** pillar's AI-tutor-safety / hallucination deliverable, *educational correctness is a safety issue*).
3. **IP-ownership / originality**, the minter must **own/authored** the contribution. Run plagiarism/similarity checks against the existing corpus and known sources; require an authorship attestation; **disclose AI-assisted portions** (per §3.5, only human-authored expression is mintable IP). Reject atoms that are copied textbook prose (ties back to §3.2).

**Provenance:** record who authored, when, what was AI-assisted, and the review verdict, immutable, so citation
Fees route to the right author and disputes are resolvable. This is the moderation + IP audit trail.

---

## 6. Accessibility
WCAG 2.2 AA.

The founder wants Apple-grade UX; **accessibility is a pillar of that.** Target: **WCAG 2.2 Level
AA** (backwards-compatible with 2.1 AA; meeting 2.2 AA satisfies 2.1 AA). Concrete, testable requirements for design + eng:

**Perceivable**
- **Contrast ≥ 4.5:1** for normal text, **≥ 3:1** for large text and for UI components/graphical objects. The collectible "concept cards" must not rely on color alone to convey meaning; check every art-on-text overlay.
- **Captions + transcripts** for any equation animations / mascot voice / video.
- **Text alternatives**, every concept art image gets meaningful `alt` text (the `art_prompt`/atom title is a natural source); decorative-only art marked decorative.
- **Don't convey state by color alone** (mastery/streak/correct-wrong need a shape/label too).

**Operable**
- **Full keyboard operability**, the whole learning loop (flip card, grade recall, move through the skill tree, send tutor message) works without a mouse; logical focus order; no keyboard traps.
- **Visible focus indicator**, bold, high-contrast, never fully obscured (WCAG 2.2 *Focus Not Obscured* + *Focus Appearance*).
- **Target size ≥ 24×24 CSS px** (WCAG 2.2 *Target Size (Minimum)*), matters for mobile card-grading buttons.
- **`prefers-reduced-motion`**, honor it; disable the variable-reward animations, mascot bounce, card-flip motion when set. (Guards against the "gamification motion" overwhelming sensitive users.)
- **No timing traps**, the exam-simulator's timer must be the *only* place time pressure exists, with accommodation options; everything else untimed or extendable.

**Understandable**
- **Consistent navigation/help** (WCAG 2.2 *Consistent Help*).
- **Accessible authentication** (WCAG 2.2), don't force a cognitive puzzle/memorization-only step; support paste into auth fields, passkeys/email-link, don't break password managers. (Ties to §7, Dynamic + email auth must be accessible.)
- **Plain-language option**, the ELI5 depth already aligns with cognitive accessibility.

**Robust**
- **Semantic HTML + ARIA** so screen readers (NVDA, VoiceOver, JAWS) parse the skill tree, cards, and progress; live-regions announce feedback ("correct", "due tomorrow").

**Bucket-specific accessibility wins (beyond the floor):**
- **Dyslexia-friendly mode**, optional dyslexia-friendly font, increased letter/line spacing, off-white background, left-aligned text. Store as a *UI preference*, well clear of a health record (§4.3).
- **Reduced-motion default for the "deep content"** so the streak/league animations never compete with learning.
- **Test with real assistive tech + automated (axe) in CI**; accessibility is a release gate, above any backlog item.

---

## 7. Security

**Authentication**
- **Dynamic (web3) + email** (already Bucket's stack). Email/passwordless link or passkey path for users who don't want a wallet; wallet path for Scholar/minting + x402 rev-share.
- **Accessible auth** (§6), passkeys/email-link reduce the COPPA/credential-management surface and satisfy WCAG.
- Sessions: short-lived tokens, secure+httpOnly cookies, CSRF protection on state-changing routes.

**Data protection**
- **Encrypt in transit (TLS, already live) and at rest** (Supabase/Postgres encryption) for learning records and any PDF imports.
- **Least privilege**, per-user row-level security (Supabase RLS) so a user can only read their own decks, FSRS state, tutor history, and imports. Critical for the §3.3 personal-scope PDF boundary and §4 privacy.
- **Imported PDFs** stored in per-user private buckets with signed, expiring URLs, never public, never cross-user.
- **Secrets** (Viatika key, Dynamic, image-model keys) in K3s secrets / Vercel env, never in git (per Bucket CLAUDE.md).

**Rate limiting / abuse of AI generation (this is also a cost control, §1.4)**
- AI generation is **the abuse + cost vector**. A script hitting tutor/art endpoints can run up real spend. Defenses, layered:
 1. **Viatika BudgetPolicy** (§2) as the hard backstop, per-user daily + per-tier monthly caps; "most restrictive wins"; over-cap returns a friendly limit message in place of an error or unbounded spend.
 2. **Per-user + per-IP rate limits** at the API gateway (token-bucket) on generation endpoints.
 3. **Auth required** for all generation (no anonymous gen); **email verification** before any AI spend.
 4. **Anomaly detection**, flag accounts whose gen rate spikes; throttle/queue rather than hard-block legitimate heavy Pro users.
 5. **Prompt-injection hardening** on the tutor (it ingests user text + RAG context), system-prompt isolation, output filtering, never let tutor input trigger unmetered tool calls.
 6. **PDF-import safety**, scan uploads (size limits, malware scan, reject non-PDF/oversized), sandbox extraction.

**Operational**
- Audit trail (Viatika `CreditTransaction` for spend; app logs for auth/security events).
- DMCA agent + abuse contact published (§3.4).
- Incident response: breach → 72h GDPR notification path + FERPA breach-notice to schools.

---

## 8. Open risks / things to decide with other pillars

| Risk | Owner / coordinate with | Mitigation |
|---|---|---|
| Free-tier abuse runs up AI cost | Ops + Eng | Viatika budget caps + rate limits (§2, §7), already specced |
| Shared-art caching not enforced → art cost scales per user | Eng | Make art an atom property, render once at build time (§1.2), **architectural, must land in P1** |
| Under-13 signups trigger COPPA/VPC | Ops + Product | 13+ age gate; under-13 only via school/parent path (§4.1) |
| OCW NC-licensed prose in a paid product | Ops + Data | Cite/link, author atoms in own words, never repackage (§3.1) |
| AI-art not copyrightable → minting confusion | Ops + Scholar/Eng | Mint human-authored expression only; disclose AI portions (§3.5, §5) |
| Tutor hallucination = wrong facts taught | **People** pillar | Educational-correctness safety gate; cite sources; coordinate w/ People deliverable |
| Pricing vs COGS | **Revenue** pillar | This doc gives the COGS floor ($0.01-0.05 free / $0.50-2.50 Pro); Revenue sets price + conversion |
| Accessibility slips to "later" | Product + Eng | WCAG 2.2 AA as a **release gate** with axe-in-CI + AT testing (§6) |

---

## Sources

**AI cost (LLM + image):**
- [OpenAI API Pricing](https://openai.com/api/pricing/) · [GPT-4o-mini pricing (devtk.ai)](https://devtk.ai/en/models/gpt-4o-mini/) · [pricepertoken GPT-4o-mini](https://pricepertoken.com/pricing-page/model/openai-gpt-4o-mini)
- [Claude API pricing (platform.claude.com)](https://platform.claude.com/docs/en/about-claude/pricing) · [Anthropic pricing 2026 (cloudzero)](https://www.cloudzero.com/blog/claude-api-pricing/)
- [AI image generation API pricing comparison 2026 (Digital Applied)](https://www.digitalapplied.com/blog/ai-image-generation-api-pricing-comparison-2026) · [Image API pricing (TokenMix)](https://tokenmix.ai/blog/ai-image-generation-api-comparison) · [Flux image API (TokenMix)](https://tokenmix.ai/blog/flux-kontext-image-api)
- [Prompt caching cost savings (AI Cost Check)](https://aicostcheck.com/blog/ai-prompt-caching-cost-savings) · [Prompt caching 90% (Medium/Ravivarapu)](https://medium.com/@harshravivarapu/prompt-caching-the-overlooked-trick-that-cuts-your-llm-costs-by-90-f6d1f844be81)

**Viatika (vendor reference, local read-only):** `~/agfarms/viatika/docs/{x402-payment-flow.md, BUSINESS_LOGIC.md, stripe-credits-flow.md, RECURRING_CREDITS_IMPLEMENTATION.md}`

**Copyright / DMCA / AI-art:**
- [Why Fair Use Supports Non-Expressive Uses (Authors Alliance)](https://www.authorsalliance.org/2024/02/29/why-fair-use-supports-non-expressive-uses/) · [Copyright & Fair Use (Harvard OGC)](https://ogc.harvard.edu/pages/copyright-and-fair-use)
- [DMCA Safe Harbor overview (Congress.gov CRS)](https://www.congress.gov/crs-product/IF11478) · [DMCA Safe Harbor Q&A (Fenwick)](https://assets.fenwick.com/legacy/FenwickDocuments/DMCA-QA.pdf)
- [US Copyright Office, Works Containing AI-Generated Material](https://www.copyright.gov/ai/ai_policy_guidance.pdf) · [SCOTUS declines AI-authorship (Morgan Lewis, 2026-03)](https://www.morganlewis.com/pubs/2026/03/us-supreme-court-declines-to-consider-whether-ai-alone-can-create-copyrighted-works)

**Privacy (COPPA / FERPA / GDPR):**
- [FTC COPPA Rule (16 CFR Part 312, eCFR)](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312) · [COPPA amendments effective dates / checklist (PrivacyLawMap)](https://privacylawmap.com/blog/coppa-rule-amendments-april-2026-compliance-checklist) · [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [FERPA third-party vendor responsibilities (US Dept of Ed)](https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf) · [School official exception (studentprivacy.ed.gov)](https://studentprivacy.ed.gov/privacy-and-data-sharing)
- [GDPR for Education 2026 (Plan Be Eco)](https://planbe.eco/en/blog/gdpr-for-the-education-industry/) · [What is GDPR (gdpr.eu)](https://gdpr.eu/what-is-gdpr/)

**Accessibility:**
- [WCAG 2.2 (W3C)](https://www.w3.org/TR/WCAG22/) · [What's New in WCAG 2.2 (W3C WAI)](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) · [Contrast requirements for WCAG 2.2 AA (Make Things Accessible)](https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/)
