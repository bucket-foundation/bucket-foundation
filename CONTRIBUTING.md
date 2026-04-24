# Contributing to bucket.foundation

Thanks for showing up. Here's the short version.

## Contribution paths

There are four ways to contribute. Pick one per PR.

### 1. Canon entry (`bucket-canon/`)

Mechanism-only primary sources. Peer-reviewed papers, real derivations, axioms, laws, first principles. Filed under one of the seven canon branches: `01-mathematics`, `02-physics`, `03-chemistry`, `04-information`, `05-biophysics`, `06-cosmology`, `07-mind`.

### 2. Landscape entry (`research-landscape/`)

Hypothesis-tier, commentary, commercial/marketplace context, philosophy-tier shelves. **Not canon.** Tier must be honestly labeled on the artifact itself. See [`research-landscape/README.md`](./research-landscape/README.md).

### 3. Canon figure (`canon-figures/`)

A single contributor-index card per figure, following [`canon-figures/SCHEMA.md`](./canon-figures/SCHEMA.md). Card is both markdown (for humans) and a JSON entry in `figures.json` (for machines).

### 4. Code PR

- the Next.js site in `src/`
- `tools/canon-pipeline/` (canon intake & scoring)
- `tools/feed/` (feed.json generator)

---

## Acceptance criteria

Every PR must pass these before merge. Reviewers will bounce drive-by PRs that skip them.

### Canon PRs (path 1)

- [ ] **Primary source cited** — DOI or a permanent URL for every claim.
- [ ] **Branch-fit justified** — one sentence in the PR description explaining why this branch and not another.
- [ ] **No marketing voice** — words like "revolutionary," "brilliant," "game-changing," "ahead of his time" are auto-reject.
- [ ] **No clinical, dosing, or commercial claims** inside a mechanism dossier. Mechanism lives in canon; application lives in landscape.
- [ ] **Canon score (informational)** — if `tools/canon-pipeline` can resolve the DOI, the computed `canon_score` should be > 50. A low score is not an automatic block, but a reviewer must explicitly override and document why.
- [ ] **Contested claims include a `Disputed.` paragraph** — per [`canon-figures/SCHEMA.md`](./canon-figures/SCHEMA.md), disputed attribution is a reason to *include* the dispute in the card, not to exclude it.
- [ ] **If the PR adds a figure card:** full [`canon-figures/SCHEMA.md`](./canon-figures/SCHEMA.md) compliance (see figure PR checklist below).

### Landscape PRs (path 2)

- [ ] **Tier honestly labeled** on the artifact itself — e.g. `landscape — hypothesis-tier`, `landscape — commercial`, `landscape — commentariat`, `landscape — philosophy-tier`.
- [ ] **Evaluation axes filled in** when applicable (history-commentariat style: claim / source-used / primary-source-exists? / bucket-status).
- [ ] **No endorsement or rejection framing.** Landscape indexes; it does not advocate.
- [ ] **Non-facilitation clause** observed for commercial content. From [`research-landscape/README.md`](./research-landscape/README.md):

  > Commercial content (peptide-markets, etc.) is read-only and non-facilitating. Bucket indexes information; it does not enable transactions.

- [ ] **No "recovered suppressed truth" framing.** No hagiography.

### Figure PRs (path 3)

Full [`canon-figures/SCHEMA.md`](./canon-figures/SCHEMA.md) compliance:

- [ ] `id` — URL-safe, lowercase, globally unique across the index
- [ ] `name` — canonical English form
- [ ] `lifespan` — `c.`, `fl.`, or `?–?` conventions followed
- [ ] `era` — plain-English era
- [ ] `region` + `tradition`
- [ ] `branches` — one or more branch ids; `cross_branches` if applicable
- [ ] `primary_works` — at least one, with title + year + language
- [ ] `canon_contribution` — 2–4 sentences, **specific**, not vague
- [ ] `why_canon` — 1–2 sentences explaining why this is foundation-tier
- [ ] `tags` — 3–7 short, lowercase, hyphenated
- [ ] `added_in_pass` + `added_on`
- [ ] **Living figures:** identify the *single* load-bearing contribution. Refuse to summarize a career. Hagiography risk is real.
- [ ] **Both JSON and markdown forms updated** — `figures.json` + the branch markdown shelf
- [ ] **Editorial constraints honored**, quoted here verbatim from [`canon-figures/SCHEMA.md`](./canon-figures/SCHEMA.md):

  > 1. **No marketing voice.** Cards do not say "revolutionary," "brilliant," "ahead of his time," or "the father of X." They say what the work was.
  > 2. **No anachronisms.** Newton was not "doing physics" — he was doing natural philosophy. Mendel was not "doing genetics" — the word *gene* was coined 40 years after he died.
  > 3. **Sources must exist.** Every card should be supportable by at least one citation to a peer-reviewed history of the field, the *Stanford Encyclopedia of Philosophy*, or the *MacTutor History of Mathematics archive*.
  > 4. **Living figures need a higher bar.** Hagiography risk is real. Living-figure cards must explicitly identify the *single* contribution and refuse to summarize a career.
  > 5. **Disputed attribution is not a reason to exclude.** It is a reason to include the dispute *in the card*.

### Code PRs (path 4)

- [ ] One concern per PR
- [ ] Does not break `canon.json` v0.1 (add fields, don't remove or rename)
- [ ] TypeScript strict passes; lint clean
- [ ] Commit message written like a lawyer — what changed, why, what breaks if this is not merged

---

## What rejection looks like

PRs are rejected — immediately, without debate — for:

- **Marketing voice** ("revolutionary," "brilliant," "ahead of his time," "the father of X," "game-changing")
- **Unsourced claims** — every non-trivial factual assertion needs a DOI or permanent URL
- **Clinical, purchasing, or investment advice** — bucket is not a clinical, financial, or retail recommender
- **Compound-to-vendor linkage** — mechanism dossiers do not name RUO vendors, supplement brands, or retail products. Vendor data lives in `research-landscape/peptide-markets/` (index only, non-facilitating) per [`research-landscape/README.md`](./research-landscape/README.md)
- **Hagiography** on figure cards
- **"Recovered suppressed truth" framing** on landscape entries

---

## Rules (global)

- **Be boring.** Simpler is better.
- **Open-source everything.** No proprietary extensions. No "enterprise edition." The reference implementation is MIT and stays MIT.
- **Don't break `canon.json` v0.1.** Add fields, don't remove or rename them. We'll cut v0.2 when we're ready.
- **One PR per concern.** Easier to review, easier to revert.
- **Write the commit message like a lawyer.** What changed. Why. What breaks if you don't take it.

## Setup

```bash
git clone https://github.com/bucket-foundation/bucket-foundation
cd bucket-foundation
cp .env.example .env.local
npm install
npm run dev
```

If `.env.example` doesn't exist yet, that's one of the things we need help with.

## Filing an issue

Please include:

- What you were trying to do
- What you expected
- What actually happened
- A minimum reproduction (code snippet, curl, or a failing test)

Drive-by ideas are welcome — label them `discussion`.

## Code of conduct

Be kind. Assume good faith. If someone is being difficult, tell a maintainer; don't retaliate in a thread.

## Maintainers

- **@gianyrox** — founder, protocol
- Open to adding more maintainers as the project finds its contributors.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

**Every merged PR auto-populates [`/whats-new`](https://www.bucket.foundation/whats-new) and [`/contributors/<your-handle>`](https://www.bucket.foundation/contributors). Contributions are public, attributed, and permanent.**
