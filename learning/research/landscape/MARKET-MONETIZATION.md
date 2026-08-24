# Bucket Academy

Market & Monetization.

**Bead:** bkt-jh0 (epic) · **Pillar:** Revenue · **Date:** 2026-06-14 · **Author:** Revenue (Nucleus)
**Mandate:** Not fast, *correct and amazing.* Public/legal sources only; every number cited inline. Original analysis, no reproduced copy.
**Builds on (does not duplicate):** `learning/research/revenue/MONETIZATION-GTM.md` (Duolingo, Whop, Quizlet, Brilliant, RemNote, Anki, MagicSchool, Khan, tiering, unit econ) and `learning/research/_synthesis/DECISIONS.md` (accepted by founder 2026-06-11).

**Constraint that shapes everything:** Bucket Foundation is a **nonprofit**. *Foundations, the knowledge, are free forever* (GOVERNANCE.md). Paid value can only sell **AI horsepower, personalization, exam tooling, and verified credentials**, never access to the canon. Story Protocol routes citation fees to authors.

> **The new thesis this doc adds:** the prior doc proved you can give the curriculum away and monetize AI (Duolingo) + a creator rail (Whop). This doc goes one layer deeper and finds the *second* revenue object that doesn't paywall knowledge: **the learner's mastery graph is a verifiable digital resume, and in every credentialing market the party who pays is the verifier (employer/recruiter/institution), never the learner.** That is the cleanest possible nonprofit revenue line, monetize the *proof*, give away the *learning*, and the credential is simultaneously the strongest viral loop in the whole field, because people *want* to broadcast it.

---

## 0. Executive summary

| Question | Answer (this doc's contribution) |
|---|---|
| **Does monetizing CREDENTIALS work?** | At volume yes, as a moat no. Coursera turns credentials into ~$695M rev across 168M learners but its credential/consumer segment is its *thinnest-margin (~54%) and slowest-growing (+5%)* line and the company still loses money. 2U (owner of edX) went **Chapter 11 in 2024** on debt taken to buy edX. Lesson: *learner-pays credential revenue is real but low-margin and undefensible, perfect to NOT depend on, ideal as a free/sponsored feature for a nonprofit.* |
| **Who pays in credentialing?** | **The verifier, never the learner.** LinkedIn = ~$16.4B FY24, ~$7B of it Talent Solutions (recruiters); Credly/Accredible/Sertifier all bill the *issuing org* (~$1, few/verified-person/yr), earners pay $0. → Bucket charges the **employer/recruiter/institution side**, keeps learning + credential free to the learner. |
| **Paid-first vs freemium for serious learners?** | Both can extract WTP, Babbel (paid-first, €352M, ~18M subs) and Math Academy ($49/mo, *no free tier*) prove serious learners pay upfront on **proven outcomes**, but both Babbel and Coursera are *unprofitable*, so paid-first is not a margin guarantee. For a nonprofit the binding variable is **demonstrated mastery** over the paywall mechanic. Keep free-as-mission; sell depth + proof. |
| **What's the verifiable-resume viral loop?** | Credentials are the one app artifact users *self-interestedly broadcast*: Credly's "Add to LinkedIn" loop, GitHub-as-de-facto-resume (~87% of tech recruiters review it). Every share carries a verification backlink and lands on LinkedIn/GitHub where recruiters already are, **near-zero-CAC distribution that a nonprofit's mission makes cleaner than any for-profit can run.** |
| **AI-in-education market** | The fastest-growing segment, **~$8B (2025), ~30-35% CAGR** (firm spread 26-43%). Position here, away from shrinking test-prep. |
| **Per-user AI cost of thorough lessons** | Free user (capped, cached, cheap model): **~$1.20/mo.** Heavy Pro user on cheap tier cached: **~$4.37/mo → ~64% margin at $12.** Heavy Pro on frontier tier: **right at/over the cliff**, caching + cheap-default routing + a frontier cap are *mandatory*. |
| **Recommended monetization** | A **four-object model**: (1) free knowledge forever; (2) **Pro $12/mo** = AI horsepower + exam tooling; (3) **verified-mastery credentials** monetized on the *verifier/institution* side (recruiter/employer verification API + institutional issuance dashboards), credential free to the learner; (4) **Scholar creator rail** with Story Protocol perpetual royalties at ~2% cost-recovery. Grants fund the free core (Khan model). |

---

## 1. The competitive field's business models

The full map.

The prior doc covered Duolingo, Whop, Quizlet, Brilliant, RemNote, Anki, MagicSchool, Khan. This section adds the **course/credential platforms (Coursera, edX/2U), the serious-mastery and paid-first language plays (Math Academy, Babbel, Memrise)**, and classifies *every* comparator by business-model archetype so the strategic shape is legible.

### 1.1 New comparables

| Product | Free tier | Paid price | What's gated | Archetype | Reported scale / signal |
|---|---|---|---|---|---|
| **Coursera** | Audit most videos free | Plus ~$59/mo or ~$399/yr (promo ~$240); Career Certs ~$49/mo (~$245 for a 5-mo cert) [source: https://missiongraduatenm.org/coursera-pricing/] [source: https://e-student.org/coursera-professional-certificate-ibm-data-science/] | **The certificate** (graded work + verified credential); learning is free | Freemium → subscription + B2B + credential/degree marketplace | **$694.7M FY24 rev, 53% GM, net loss $(79.5)M, 168M learners.** Q4'24: Consumer $101.7M @54% GM (+5%), Enterprise $62.3M @68% (+18%), Degrees $15.2M @~100% (tiny) [source: https://investor.coursera.com/news/news-details/2025/Coursera-Reports-Fourth-Quarter-and-Full-Year-2024-Financial-Results/default.aspx] [source: https://finance.yahoo.com/news/coursera-inc-cour-q4-2024-074046533.html] |
| **edX / 2U** | Audit free | Verified cert ~$50-300; MicroMasters ~$500-2,000/component [source: https://upskillwise.com/edx-pricing/] | The certificate | Same as Coursera, on a debt-funded OPM parent | **2U filed Chapter 11 Jul 25 2024** (~$945M LT debt, much of it to buy edX); emerged private Sep 2024 shedding >$500M debt [source: https://news.bloomberglaw.com/bankruptcy-law/2u-owner-of-edx-online-courses-files-chapter-11-bankruptcy] [source: https://www.highereddive.com/news/judge-signs-off-on-2u-bankruptcy-plan/726776/] |
| **Babbel** | Minimal trial | ~$12.95/mo, annual ~$83-107/yr (~$7-9/mo), **lifetime ~$299-599** [source: https://myclasstracks.com/how-much-is-babbel/] [source: https://variety.com/2025/shopping/news/best-babbel-online-language-classes-deals-offers-sale-1236097107/] | **Everything, pay before you learn** | **Hard paywall / paid-first** subscription | **€352M 2024 (+6.6%), ~18M subs cumulative, unprofitable** (no net income since ~2019) [source: https://www.businessofapps.com/data/babbel-statistics/] |
| **Memrise** | Core lessons + **rate-limited free AI (MemBot)** | Pro **$39.99/mo, $79.99/yr, $329.99 lifetime** [source: https://alternatives.co/software/memrise/pricing/] | Unlimited AI conversation + depth (offline, grammar, native video) | Freemium; **AI as the open hook** (deliberate anti-Duolingo: AI in free tier, clear of the top paywall) [source: https://www.memrise.com/blog/gpt-language-learning-membot-duolingo] | No reliable public rev/sub figures |
| **Math Academy** | **NONE** (30-day refund only) | **$49/mo or ~$500/yr** [source: https://beginnersinai.org/mathacademy-explained/] | All of it | **Hard paywall, mastery-based, no funnel**, the closest serious-mastery analog | No public scale; sells on **founder/outcome narrative** (Eurisko students → accelerated admissions/research) [source: https://www.justinmath.com/math-academys-eurisko-sequence-5-years-later/]; explicitly engineers around Bloom's 2-sigma [source: https://beginnersinai.org/mathacademy-explained/] |

### 1.2 The field classified by archetype

| Archetype | Who runs it | What it monetizes | Bucket's relationship to it |
|---|---|---|---|
| **Freemium, gate friction not content** | Duolingo, Quizlet, Memrise | AI + convenience above a free funnel | **ADOPT**, this is the spine (foundations free, AI is the upgrade). |
| **Hard paywall, sell the curriculum** | Brilliant, Math Academy, Babbel | Access to the content itself | **REJECT**, paywalling knowledge violates the mission. *Borrow only the rigor signal.* |
| **Credential paywall** (free to learn, pay to prove) | Coursera, edX | The certificate | **PARTIALLY ADOPT, but flip who pays** (verifier instead of learner) so the credential stays free. |
| **Open-source / one-time** | Anki | A $25 iOS app funds dev | **NEUTRALIZE**, interoperate (Anki export), don't fight a free incumbent. |
| **Creator marketplace** | Whop | ~5.5% rake on creator GMV | **ADOPT at cost-recovery** (~2%) + Story Protocol perpetual royalties Whop can't match. |
| **Verifier-pays identity graph** | LinkedIn, Credly | The recruiter/issuer side | **THE NEW ONE THIS DOC ADDS**, monetize the verifier, give the resume away. |
| **Nonprofit, grants-funded** | Khan Academy | Donations (77% of rev) fund free; AI at near-cost | **ADOPT as the financial spine** for the free tier. |

**The reading:** four of these seven monetize *something other than knowledge access*, friction (Duolingo), proof (Coursera, flipped), creation (Whop), and the verifier side (LinkedIn). Bucket can run **all four at once** while only the for-profits have to pick. That stack is the nonprofit's structural advantage.

---

## 2. The credentialing / verifiable-skills market

Sizing + who pays.

This is the section the prior doc didn't reach, and it's where the "learning map = digital resume" thesis lives.

### 2.1 Market size

There is no single TAM line, "verifiable skills" sits across overlapping research-firm categories defined differently. Triangulated:

| Segment | Size & forecast | CAGR | Source |
|---|---|---|---|
| Digital credential management **software** | ~$2.6B (2025) → $4.26B (2029); other firm $3.14B→$11.77B (2034) | 13-15% | [source: https://www.thebusinessresearchcompany.com/report/digital-credential-management-software-global-market-report] [source: https://www.marketresearchfuture.com/reports/digital-credential-management-software-market-21554] |
| Digital credential management **platform** | $1.25B (2024) → $3.85B (2033) | 14.2% | [source: https://www.verifiedmarketreports.com/product/digital-credential-management-platform-market/] |
| Digital **badge** market (narrow subset) | $312M (2025) → $1.19B (2034) | 15.8% | [source: https://www.fortunebusinessinsights.com/digital-badge-market-108605] |
| Coding bootcamp (a "monetize outcomes" adjacency) | → $2.4B by 2030 | - | [source: https://blog.theinterviewguys.com/the-state-of-skills-based-hiring/] |

**The demand-side tailwind is loud but thin, and that gap is the wedge.** 45% of companies removed degree requirements from some roles; 72% claim to weight demonstrated skills over academic credentials [source: https://www.goco.io/blog/why-companies-are-ditching-degrees]. ZipRecruiter postings requiring a BA fell 18%→14.5% (2022→2023) [same]. **But:** while ~85% of firms *talk* skills-based hiring, only ~0.14% (1 in ~700) of hires are affected, it "manifests primarily at the level of policy," not behavior [source: https://blog.theinterviewguys.com/the-state-of-skills-based-hiring/].

> **The insight that turns this from a small market into a thesis:** employers *want* skills-based hiring but have **no instrument they trust** to act on it. The bottleneck is not desire, it's a verifiable, tamper-proof proof of real mastery. A nonprofit, free-of-charge, open-standard mastery credential with *no incentive to inflate* (because it doesn't sell the credential to the learner) is the most *trustable* possible instrument. The nonprofit constraint isn't a handicap here, it's the credibility moat.

### 2.2 Who pays

The verifier, never the learner.

| Player | Model | Who pays | Numbers |
|---|---|---|---|
| **LinkedIn** | Professional-identity graph; monetize the recruiter side | **Employers/recruiters** (+ a Premium minority) | ~**$16.4B FY24 (+9%)**; **~$7B Talent Solutions**; Premium >$2B/yr (~12.5%). Recruiter Corporate **$8,999-15,000+/seat/yr** [source: https://www.businessofapps.com/data/linkedin-statistics/] [source: https://techcrunch.com/2025/01/29/linkedin-passes-2b-in-premium-revenues-in-12-months-with-overall-revenues-up-9-on-the-year/] [source: https://www.pin.com/blog/linkedin-recruiter-pricing-2026/] |
| **Credly (Pearson)** | Issuer-pays SaaS; largest badge network | **Issuing orgs** (earners pay $0) | **93M badges to 46M+ earners, 4,000+ issuers** [source: https://learn.credly.com/guides/the-largest-ai-credential-network] [source: https://sertifier.com/blog/how-to-use-credly/] |
| **Accredible** | Per-recipient annual SaaS | Issuing org | ~$996/yr for 250 recipients → $20-40K+/yr at 5-25K [source: https://www.certify.one/blog/digital-badge-platform-pricing-per-credential-vs-per-recipient] |
| **Sertifier** | Per-recipient annual SaaS | Issuing org | Free ≤250/yr, then **~$1/unique recipient/yr**; $75/mo @1,000 [source: https://sertifier.com/pricing] |
| **Coursera / edX** | The rare *learner-pays* model | **Learner** | Cert ~$49; edX verified $50-300, but they paywall the **certificate and never the knowledge** (audit is free) [source: https://upskillwise.com/coursera-cost/] [source: https://upskillwise.com/edx-pricing/] |
| **Bootcamp ISAs** (BloomTech/Lambda) | Slice of future income | Learner's future earnings | **CFPB consent order Apr 2024**; CEO permanently banned from consumer lending; "not a loan" was deceptive (~$4K avg finance charge); placement claimed 86% vs ~30-50% real [source: https://www.consumerfinance.gov/about-us/newsroom/cfpb-takes-action-against-coding-boot-camp-bloomtech-and-ceo-austen-allred-for-deceiving-students-and-hiding-loan-costs/] |

**Three conclusions that directly set Bucket's credential strategy:**
1. **Monetize the verifier side.** ~$7B of LinkedIn revenue and all of Credly's value come from the side that needs to *trust or distribute* the credential. The learner is the supply; the employer is the demand.
2. **The lone learner-pays model only works because it paywalls the *certificate* and leaves the *knowledge* open.** That exact lever, *learn free, optionally pay to formally prove*, is available to a nonprofit. And Bucket can go further: make even the certificate free to the learner and charge the verifier.
3. **NEVER monetize the learner's future income.** ISAs are legally a lending product, draw CFPB/state regulators, and depend on outcome promises a nonprofit can't guarantee. Hard guardrail.

### 2.3 Build on the open standard

Don't invent one.

A "verifiable resume" should be built on **Open Badges 3.0**, which 1EdTech rebuilt natively on the **W3C Verifiable Credentials** data model (cryptographically verifiable, portable across systems), with **Comprehensive Learner Record (CLR) 2.0** as the bundling layer that stitches many achievements into one record, *exactly the "mastery graph" concept* [source: https://www.1edtech.org/standards/open-badges] [source: https://www.1edtech.org/standards/clr]. Adopting these gives instant interoperability with Credly, LinkedIn's certifications section, and any employer verifier, and gives a nonprofit a credible **"open, no lock-in"** position the for-profits structurally can't match. (Note: this also dovetails with Bucket's existing Story Protocol on-chain rail, the *contribution* side mints to Story Protocol; the *mastery-proof* side issues Open Badges 3.0 / W3C VC. Two different objects, one identity.)

---

## 3. Growth / virality

Which loops work, and what a verifiable resume opens up.

### 3.1 The proven loops

| Loop | Who proved it | Mechanism | Bucket's analog |
|---|---|---|---|
| **Streak + loss-aversion** | Duolingo | 7-day streak → 3.6× completion; "protect your streak" is a top upgrade prompt | Soft, freezable streaks (People's guardrail: informational not controlling) |
| **Social leagues / friend streaks** | Duolingo | Your streak is visible → both retains and recruits | Co-op leagues, reading-group cohorts |
| **Creator-brings-audience** | Whop | Default-on affiliate at 30% of *recurring* rev; creators import their following | Scholar rail + Story Protocol perpetual/transitive royalties |
| **Free AI as the demo** | Memrise (MemBot) | Rate-limited AI in the *free* tier as the hook; depth/unlimited is Pro | Capped free tutor (5-10 msgs/day) → the demo that sells Pro |
| **Public artifact = resume** | **GitHub, Credly** | A shareable, verifiable artifact of real ability displaces the self-reported resume | **The mastery graph (the new loop, see 3.2)** |

### 3.2 The verifiable-resume loop

The strongest distribution engine in the field.

Credentials have a property almost no other app content has: **users actively *want* to broadcast them, and the broadcast carries the issuer's brand to a high-intent professional audience for free.**

- **The Credly → LinkedIn "Add to Profile" loop is canonical.** Accepting a badge pushes the earner to add it to LinkedIn's Licenses & Certifications with a "See Credential" verification link back to the issuer [source: https://support.credly.com/hc/en-us/articles/360021221491-How-can-I-add-my-badge-to-my-LinkedIn-profile-and-share-to-my-feed]. Each share is simultaneously (a) free advertising for the issuer, (b) a verification backlink, and (c) social proof to the sharer's network.
- **GitHub proves a public artifact can *become* the resume.** ~**87% of tech recruiters review GitHub profiles**; ~71% of hiring managers weight GitHub for technical roles [source: https://hireflow.net/blog/should-you-include-github-on-your-resume] [source: https://www.cvwizard.com/en/articles/github-on-resume]. A résumé gets ~6 seconds; a GitHub profile gets ~90 because it's *demonstrated rather than claimed* [source: https://flatironschool.com/blog/github-profile-and-git-practices-for-job-seekers/]. GitHub did this with **zero paid acquisition**, purely because the artifact was shareable and trusted.

**Why this loop beats every other loop in the field:**
1. **Self-interested broadcasting**, the user's incentive (advance my career) and the platform's growth incentive are *perfectly aligned*. Unlike streaks (mildly shareable) or generated art (cute but optional), a credential is something people *seek out* opportunities to post.
2. **High-value placement, free**, it lands on LinkedIn / GitHub / personal sites where recruiters already are.
3. **Verification = built-in, non-removable backlink**, "verifiable" *requires* a link back to check authenticity.
4. **Permanence**, a credential persists for years and compounds, unlike a decaying feed post.

> **Stacked with Bucket's existing viral asset (the shareable concept-art card from the prior doc), Bucket has TWO product-native loops a casual app would kill for: a *fun* loop (collectible art cards, top-of-funnel) and a *high-intent* loop (verifiable mastery credential, bottom-of-funnel + recruiter-facing).** The art card brings the curious; the credential brings the serious and the employers who hire them.

### 3.3 What the resume output opens up for distribution that comps can't touch

- **A reason to finish, not just start.** Duolingo's problem is that "I learned 30% of Spanish" isn't a shareable status object. "I have verified mastery of the thermodynamics nucleus" *is*. The credential gives the serious learner a *terminal reward worth completing for*, which lifts both retention and the share.
- **An employer/recruiter inbound channel for free.** Once recruiters can search/verify the mastery graph (the paid verifier API), every learner's public profile is a lead-gen surface for the recruiter product, LinkedIn's exact flywheel, but the supply graph is *real demonstrated mastery* (RAG-grounded, exam-validated per the DECISIONS S1, S7 safety gate) instead of self-asserted skills.
- **Institutional land-and-expand.** A professor's reading-group cohort (MagicSchool's teacher-as-distribution move) generates verifiable credentials the institution wants to issue under its own brand → the institutional issuance dashboard (§4) is the upsell.

---

## 4. Recommended monetization for Bucket

A four-object model.

The prior doc set the **tier ladder** (Free / Pro $12 / Scholar $24 / Family). This doc keeps that ladder and adds the **second revenue object the prior doc was missing, the verifier-side credential business**, and reconciles the whole thing into four monetization objects, none of which paywalls knowledge.

### Object 1

Knowledge: **free forever**.

Full nucleus paths of every branch, FSRS, streaks/XP/leagues, cached concept art, capped AI (5-10 tutor msgs/day). On-mission; grant-funded (Khan model). *This is non-negotiable and is also the top of every funnel below.*

### Object 2

AI horsepower: **Pro $12/mo or $96/yr**.

Unchanged from the prior doc and DECISIONS #13: unlimited grounded tutor, PDF-import of owned textbooks, custom mnemonic art, Exam-Simulator, analytics, Anki export. Student ~$6. **This is where the recurring consumer cash comes from**, but §5 shows it must be cost-controlled to clear margin.

### Object 3

Verified mastery: **free to the learner, monetized on the verifier side**.

The mastery graph is issued as an **Open Badges 3.0 / W3C VC** credential, *free to the learner, always.* Revenue comes from the side that needs to trust or distribute it (the LinkedIn/Credly lesson):
- **Recruiter / employer verification & search API**, per-seat or metered, priced *well below* LinkedIn Recruiter's ~$9-15K/seat (nonprofit cost-plus). Employers search and verify real, exam-validated mastery. *This is the highest-ceiling line because it taps the ~$7B-scale verifier-pays pool over the thin consumer wallet.*
- **Institutional issuance dashboards**, schools/labs/employers issue branded credentials over Bucket's open-standard rail and get cohort analytics, at **~$1, few/verified-learner/yr** (the Accredible/Sertifier band), cost-recovery not margin.
- **Optional verified-credential issuance fee** *only if* a proctoring/identity step has real marginal cost, and even then, sponsored-free wherever a grant or institution covers it. *The learner never pays to learn; at most they pay (or have sponsored) the marginal cost of formal proof.*

**Why this is the strategically important addition:** it gives Bucket a revenue line that (a) doesn't touch the knowledge paywall, (b) scales with the *employer* wallet not the *student* wallet (10-100× higher WTP per seat), (c) is *more* credible because it's nonprofit and has no incentive to inflate grades, and (d) doubles as the strongest viral loop in §3. It also de-risks the consumer-AI-margin pressure from §5, if Pro margins stay thin, the verifier API is the high-margin offset.

### Object 4

Creator economy: **Scholar $24/mo or rev-share**, ~2% cost-recovery, 0% on citation royalties.

Unchanged from the prior doc (Whop translated, upgraded by Story Protocol's perpetual/transitive on-chain royalties). The creator rail and the credential rail share the same identity primitive: *authoring* mints to Story Protocol; *mastering* issues an Open Badge. A learner's public profile shows both, what they've mastered and what they've contributed.

### The financial spine: **grants fund the free core**
The free tier's cost (§5) is carried by grants in place of ads, the nonprofit substitute for Duolingo's ad business. Coordinate with Operations on 501(c)(3) reinstatement + grant pipeline.

### Pricing structure rules
- **Annual ≈ 1.5-2× cheaper per-month than monthly** (Babbel annual ~$7-9/mo vs $12.95 monthly confirms the lever).
- **Grow ARPU via mix-shift** (Free→Pro→Scholar→verifier API) instead of base-price hikes.
- **Serious learners pay on proven outcomes** (Math Academy $49 no-free-tier; Babbel paid-first), so the **Exam-Simulator + verified-mastery credential are the WTP anchors**, and efficacy claims cite only the replicated ~0.5-0.8σ (DECISIONS #15), never Bloom's 2σ.

---

## 5. Unit economics

The per-user AI cost of thorough lessons + generation.

Refreshed against **current June 2026 published API prices**, with the per-lesson math shown. (Complements the prior doc's §5; this version isolates the *per-lesson* and *cache-vs-no-cache* deltas the founder asked for.)

### 5.1 Load-bearing prices

**LLM text ($/1M tokens):**
- Cheap: **Claude Haiku 4.5 $1.00 in / $5.00 out, cache read $0.10**; Gemini 2.5 Flash $0.30/$2.50; Flash-Lite $0.10/$0.40; GPT-5.4 Nano $0.20/$1.25 [source: https://platform.claude.com/docs/en/about-claude/pricing] [source: https://aicostcheck.com/blog/google-gemini-pricing-guide-2026] [source: https://devtk.ai/en/blog/openai-api-pricing-guide-2026/]
- Frontier: **Claude Sonnet 4.6 $3.00 / $15.00, cache read $0.30**; Gemini 2.5 Pro $1.25/$10.00; GPT-5.4 $2.50/$15.00 [source: https://platform.claude.com/docs/en/about-claude/pricing] [source: https://www.tldl.io/resources/google-gemini-api-pricing]
- **Prompt caching: cache read = 0.1× input (90% off)**, the single biggest lever [source: https://platform.claude.com/docs/en/about-claude/pricing]

**Image ($/~1MP):** FLUX Schnell ~$0.003, FLUX Dev ~$0.0038, SDXL ~$0.0023; premium GPT-image $0.011-0.25 [source: https://tokenmix.ai/blog/replicate-alternative-cheaper] [source: https://invertedstone.com/calculators/dall-e-pricing]. **Embeddings:** text-embedding-3-small $0.02/1M, per-user rounding error [source: https://tokenmix.ai/blog/openai-embedding-pricing].

### 5.2 Cost of one "thorough" tutor message / card-gen

| Model | No cache | With cache (2,500 of 3,000 input cached @ 0.1×) |
|---|---|---|
| **Haiku 4.5** | $0.0055 | **$0.00325** |
| **Sonnet 4.6** | $0.0165 | **$0.00975** |

Output dominates, so caching saves ~40% per message (it can only discount the input half).

### 5.3 Free user

| Model | No cache | With cache |
|---|---|---|
| Haiku 4.5 | $1.98/mo | **$1.17/mo** |
| Sonnet 4.6 | $5.94/mo | $3.51/mo |

**Blended free-user cost ≈ $1.20/mo** *only on the cheap tier with caps + caching.* On Sonnet uncached a free user costs ~$6/mo, unviable. **Rule: free tier runs on Haiku/Flash, capped, cached, art pre-generated.** (Most free users won't max caps → real blended is lower, ~$0.10-0.25 as the prior doc modeled with realistic utilization.)

### 5.4 Heavy Pro user

| Model | No cache | With cache |
|---|---|---|
| Haiku 4.5 | $7.34/mo | **$4.37/mo → ~64% margin @ $12** |
| Sonnet 4.6 | $21.86/mo (−$10 @ $12 ⚠️) | $12.95/mo (**−$1 @ $12, over the cliff ⚠️**) |

### 5.5 The cliff

And the three mandatory controls.

Break-even at $12/mo on **Sonnet cached** is ~1,230 calls/mo (~41/day), the heavy Pro user sits *right at the edge*; uncached the cliff drops to ~24/day. So:

1. **Caching is non-optional**, moves Sonnet from −$10 to ~break-even.
2. **Cheap-tier by default** (Haiku 4.5 / Gemini Flash); reserve Sonnet for explicitly hard requests. Cheap-tier Pro clears **~64% margin even heavy.**
3. **Cap/meter the frontier tier** + **serve art from cache** (pre-gen FLUX at ~$0.003 once, never per-request premium GPT-image, a single uncapped $0.25 premium-image feature × 20 = $5 erases a Pro user's margin alone).

These match DECISIONS #14 (blended Pro COGS ≤ $10/user/mo; $15 in-band if cushion wanted), and the new credential/verifier line (Object 3) is the **high-margin offset** if consumer-AI margins stay thin.

### 5.6 Cost of generating the curriculum itself
Per the DECISIONS art ruling, art is a property of the *atom* (rendered once at build, CDN-cached, ~$6-200 total for the whole corpus), *not* per user. Atom extraction + embedding the corpus is a one-time build cost in the low-dollars-to-low-hundreds range (embeddings $0.02/1M). **The per-user cost of "thorough lessons" is therefore almost entirely the *live tutor*, which is exactly what the caps + caching + cheap-default routing above govern.** The expensive thing to generate (art, atoms) is generated once; the per-user thing (tutoring) is the controllable line.

---

## 6. Market sizing

The prior doc sized TAM ~$80B (consumer slice) / SAM ~$1.5B / SOM ~$4-8M ARR. This refreshes the inputs and adds the **AI-in-education** and **credentialing** layers.

**The caveat that governs all of it:** EdTech end-use is **~53% institutional in 2026** [source: https://www.fortunebusinessinsights.com/edtech-market-111377], a B2C app *cannot* bill that half. Size the SAM off **consumer-pay** sub-markets rather than the EdTech headline.

| Market | Size (year) | CAGR | Source |
|---|---|---|---|
| Global EdTech *(mostly institutional, context only)* | $187B (2025) → $437.5B (2033) | ~10.8-13.9% | [source: https://www.grandviewresearch.com/industry-analysis/education-technology-market] [source: https://market.us/report/edtech-market/] |
| E-learning / online | $293.6B (2025) → $808.7B (2033) | 13.5% | [source: https://www.skyquestt.com/report/e-learning-market] |
| Language learning apps (B2C, proven WTP) | $7.91B (2025) | 17.6% | [source: https://www.skyquestt.com/report/language-learning-app-market] |
| Test prep & tutoring | $70.7-79.0B (2025) | 5-8% *(slow/shrinking, don't position here)* | [source: https://www.thebusinessresearchcompany.com/report/exam-preparation-and-tutoring-global-market-report] |
| **★ AI in education / AI tutors** | **$8.3B (2025) → $57.2B (2033)** | **~26-43% (mid ~30-35%)** | [source: https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-ai-education-market-report] [source: https://www.mordorintelligence.com/industry-reports/ai-in-education-market] |
| MOOC / online degrees | $10.3B (2025) → $31B (2033) | ~15% | [source: https://www.businessresearchinsights.com/market-reports/massive-open-online-course-mooc-market-122947] |
| Corporate L&D (B2B context) | $412.5B (2025) | 7.6% | [source: https://finance.yahoo.com/news/corporate-training-market-reach-805-143000704.html] |
| **★ Credentialing / digital credential mgmt** | **$2.6B (2025) → $4.26B (2029)**; badges $312M→$1.19B | 13-16% | [source: https://www.thebusinessresearchcompany.com/report/digital-credential-management-software-global-market-report] [source: https://www.fortunebusinessinsights.com/digital-badge-market-108605] |

**The competitive-concentration risk (new):** language learning is *concentrated*, Duolingo held >50% of global downloads and ~67% of all language-app revenue in 2024 [source: https://www.quantumrun.com/consulting/language-learning-apps/]. The real threat to a consumer learning app is **not the TAM, it's incumbent concentration.** Bucket's defense is to *not* compete in language, its wedge is **serious STEM foundations + verifiable mastery**, a niche the incumbents structurally don't serve (Duolingo can't issue a thermodynamics-mastery credential).

**Where to position:** **AI-in-education ($8B, ~30-35% CAGR)** + the **consumer slice of test-prep/upskilling**, *not* language (concentrated) or pure test-prep (shrinking 5-8%). The credentialing market ($2.6B, 13-16%) is the *second* revenue surface, small as a software market but attached to the ~$7B-scale verifier-pays pool (LinkedIn) that prices the credential's real value.

---

## 7. Cross-pillar dependencies

| Dependency | Owner | Revenue's ask |
|---|---|---|
| **Verifiable-credential rail (Open Badges 3.0 / W3C VC)** | **Engineering + Data** | Issue mastery as a W3C-VC/Open-Badges-3.0 credential (interoperable with Credly/LinkedIn), distinct from but co-located with the Story Protocol authoring mint. The credential's *integrity* depends on the S1, S7 safety gate + exam-validated mastery (DECISIONS), a credential is only as trustworthy as the mastery signal behind it. |
| **Recruiter/employer verification & search API** | **Engineering + Product** | The highest-ceiling revenue line (verifier-pays, ~$7B-scale pool). Needs a searchable, verifiable mastery-graph surface + a metered API + a "see credential" public verification page (the backlink that powers the viral loop). |
| **Institutional issuance dashboards** | **Product + CS** | The Accredible/Sertifier-style per-recipient institutional product (cohort issuance + analytics), the land-and-expand on reading-group/cohort adoption. |
| **501(c)(3) + grant pipeline** | **Operations** | Grants fund the free core (Khan 77% model), the substitute for an ad budget; also the *credibility* underpinning of the "no incentive to inflate the credential" trust moat. |
| **Caching + cheap-default routing + frontier cap (the 3 mandatory cost controls)** | **Engineering** | §5 shows these are the difference between Pro margin-positive and −$10/user. Not toggles, launch features. |
| **Efficacy evidence for credential trust** | **People** | A verifiable-mastery credential's value rests on it *meaning* something; the replicated ~0.5-0.8σ efficacy band (DECISIONS #15) and the misconception eval set are what let employers trust it. |
| **"Add to LinkedIn / share credential" share surface** | **Product + CS** | The viral backlink loop (Credly's mechanic), the credential's public verification page is both the trust artifact and the acquisition surface. |

---

## 8. Sourcing caveats

- **Market sizes diverge 2-4× across firms by methodology**, ranges are reported in place of single numbers; the *consumer-pay caveat* matters more than any single TAM figure.
- **Credentialing/LinkedIn share→signup conversion is not published**, the viral-loop *strength* claims are structural/inferred.
- **LinkedIn's ~$7B Talent Solutions split is from secondary aggregators** (Microsoft doesn't break LinkedIn out line-by-line in 10-Ks), directional.
- **Anthropic prices are from the canonical docs page (authoritative); OpenAI/Google/image prices are from 2026 aggregator trackers**, verify frontier-tier OpenAI/Gemini against each vendor's own page before external quotes (aggregators lag vendor changes by days).
- **Babbel/Memrise/Math Academy scale figures** are from secondary aggregators or absent (Math Academy publishes none), treat as directional.

---

## Appendix, new sources

**Course/credential platforms:** investor.coursera.com (FY24 results); finance.yahoo.com (Coursera Q4 segments); missiongraduatenm.org, e-student.org (Coursera pricing); upskillwise.com (edX + Coursera pricing); news.bloomberglaw.com, highereddive.com (2U Chapter 11); myclasstracks.com, variety.com (Babbel); businessofapps.com (Babbel + LinkedIn stats); alternatives.co, talkpal.ai, memrise.com/blog (Memrise); beginnersinai.org, justinmath.com, biggo.com (Math Academy).
**Credentialing/identity:** thebusinessresearchcompany.com, marketresearchfuture.com, verifiedmarketreports.com, fortunebusinessinsights.com (credential/badge market); goco.io, blog.theinterviewguys.com (skills-based hiring reality); learn.credly.com, sertifier.com, certify.one (Credly/Accredible/Sertifier); techcrunch.com, pin.com (LinkedIn revenue/Recruiter pricing); consumerfinance.gov, goodwinlaw.com (BloomTech CFPB); 1edtech.org (Open Badges 3.0 / CLR / W3C VC); support.credly.com, learn.credly.com (Add-to-LinkedIn loop); hireflow.net, cvwizard.com, flatironschool.com (GitHub-as-resume).
**Market/AI prices:** grandviewresearch.com, fortunebusinessinsights.com, holoniq.com, skyquestt.com, market.us, mordorintelligence.com, precedenceresearch.com, thebusinessresearchcompany.com, businessresearchinsights.com, quantumrun.com (markets); platform.claude.com, aicostcheck.com, devtk.ai, tldl.io, pricepertoken.com, tokenmix.ai, invertedstone.com, costbench.com (AI/image/embedding prices).
