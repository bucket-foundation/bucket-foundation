# Bucket Learning, Risk Register

**Bead:** bkt-xo0 · 2026-06-11 · Synthesized by Nucleus from all 7 pillar deliverables.

Ranked by severity × likelihood. Each risk has an owner and a concrete mitigation already
specced in the research, these are not open problems, they're decisions to enforce.

| # | Risk | Severity | Mitigation (specced) | Owner |
|---|------|----------|----------------------|-------|
| R1 | **AI tutor teaches a confident falsehood** → installs a durable misconception (worst in sparse biophysics subfields where fabrication rates are highest) | **Critical** | S1, S7: RAG grounding to human-verified canon, abstain-on-weak-retrieval, closed-set validated citations (no free-generation of facts), uncertainty signaling, CI eval rig with a biophysics-misconception set, human-in-loop for canon, per-turn multi-turn re-checks | People (spec) + Engineering (impl) + Data (canon) |
| R2 | **Art becomes decorative** → pedagogical own-goal for novices (−0.3 to −0.5σ) and a cost blowup | **High** | Load-bearing-art contract (functional only, 8-pt checklist); art is per-atom, rendered once at build, CDN-cached; custom art capped/Pro-only | People + Engineering + Operations |
| R3 | **Pro tier loses money on the heavy-tutor tail** (uncontrolled ≈ −$11/mo at $12) | **High** | Mandatory: prompt caching + cheap diffusion art + fair-use throttle; hard caps at the Viatika budget layer; binding rule blended Pro COGS ≤ $10/user/mo | Operations + Revenue + Engineering |
| R4 | **Copyright infringement** (textbook prose/figures, or hosted user PDFs) | **High** | Open-access corpus only; atoms in our own words (facts/equations not copyrightable); PDF-import strictly personal-scope, never hosted/shared; DMCA agent + notice-and-takedown + repeat-infringer policy | Operations |
| R5 | **The nucleus ranking is wrong** (Reach-Score weights are an unvalidated prior) | **Medium-High** | Ship as a human-reviewed heuristic; validate weights against real exam-question frequency before claiming optimality; canon atoms human-verified | Data + founder |
| R6 | **Gamification crowds out intrinsic motivation** (overjustification, −0.3 to −0.4σ) | **Medium-High** | Gamify SDT needs not the metric; soft/freezable streaks; informational-not-controlling progress; mastery-weighted XP; "can't be farmed without learning" test on every mechanic | People + Product |
| R7 | **Privacy non-compliance** (COPPA/FERPA/GDPR; minors; learning records) | **Medium-High** | 13+ age gate (under-13 only via school/parent path); FERPA DPA for classroom mode; GDPR legal basis + data minimization (email + name only); never train shared models on individual data | Operations |
| R8 | **Graph UX becomes an unusable hairball** (the Obsidian failure) | **Medium** | Curated concentric-shell layout (precomputed positions), never raw force-directed; default to the computed route ahead of the graph; always a local-neighborhood view; SR list-mode | Product + Data |
| R9 | **Accessibility gaps** undercut the "Apple-grade" claim and expose ADA/EAA risk | **Medium** | WCAG 2.2 AA as a release gate; axe-in-CI; SR list-mode for the graph; reduced-motion; dyslexia mode | Operations + Product |
| R10 | **Overclaiming efficacy** (citing Bloom's unreplicated 2σ) → credibility + regulatory risk | **Medium** | Claim only the replicated ITS/guardrailed-LLM ~0.5-0.8σ band; flag `[verify]` figures before publication | Revenue + People |
| R11 | **Local-GPU backend is a single point of failure** for AI/art | **Low-Medium** | Stateless GPU service behind cloudflared; lifts to rented GPU with zero app changes; quality workloads already on metered Anthropic API as fallback | Engineering |
| R12 | **UGC (Scholar atoms) carries IP/quality/safety risk** before Story Protocol minting | **Low-Medium** | Content moderation + IP-ownership + correctness checks (route through existing review queue) before mint; same S1, S7 grounding standard | Operations + People + Data |

## The one-line risk posture
Every top risk (R1, R4) is already resolved by a **specced** decision in `DECISIONS.md`;
The job is **enforcement in CI and the design system**, past the research stage. The two that
need founder input are R5 (validate nucleus weights against exam data) and R3/R10
(price point + efficacy-claim discipline).
