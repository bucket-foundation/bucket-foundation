# bucket — history

> A product archaeology of bucket from its first iteration (Dec 2022)
> through dormancy (Feb 2025) to the 2026 nonprofit revival.
>
> Source material: the original Figma prototype `bucket 1.0`
> (`mCigolgGPzmDxA8DpGMlua`, last modified 2022-12-17), reconstructed
> offline from the cached `_file.json` — 40 frames, 181 prototype
> transitions, full text. Recovered 2026-04-15 during the Nucleus
> Brain integration of the Figma tooling layer (see `CLAUDE.md` §Figma).

---

## TL;DR

**2022 Bucket wanted to be a social network where users built and debated
theories of history with citable evidence. 2026 Bucket is a nonprofit that
curates a static canon of mathematical/physical/biological foundations for
AI+human research cells. The 2022 version was a democracy. The 2026 version
is an editorial board.**

The thing that survived both iterations: **publish is always the terminal
action.** In 2022 that meant "your theory is now live on the platform." In
2026 it means "your axiom is minted as a Story Protocol IP NFT on Base."
Discussion was optional in 2022 and has been deleted in 2026. Publication
was never optional.

---

## Three slogans, three eras

| Era | Slogan | Where it lives |
|---|---|---|
| **2022 (bucket 1.0, Dec 2022)** | **"build the past."** + *"let's make history a discussion."* | On the Landing Page of the original Figma prototype. Never made it into any current public artifact. Recovered 2026-04-15 from the prototype text. |
| **2022–2025 interregnum** | **"build history."** | README.md header, CLAUDE.md. Called out as "the original slogan, still load-bearing" — but it's actually the *second* original. "build the past" is older. |
| **2026 revival** | **"bucket is the new renaissance."** | MANIFESTO.md, README.md, CLAUDE.md. The thesis that crystallized after 13 months of dormancy. |

The progression matters. **"build the past"** frames bucket as historical
reconstruction — things that happened. **"build history"** frames it as
narrative construction — the story we build from what happened.
**"renaissance"** frames it as foundational revival — the rock-solid
substrate that makes civilization-scale progress possible. Each slogan is
a sharper thesis than the one before.

---

## Bucket 1.0 — the 2022 app

**Last modified:** 2022-12-17T22:27:24Z (Figma file version
`2342526660463898567`).
**Status at that date:** pre-launch, waitlist-capture phase, 40-frame
interactive prototype with 181 wired transitions, 0 shipped users. Never
launched. The repo went dormant ~Feb 2025 and was reactivated 2026-04-14
as a different product entirely.

### The four-verb IA

Every frame in bucket 1.0 carries the same top nav:

```
build · discuss · discover · [bucket logo] · profile
```

These four verbs were the whole product. Here's what each one *did* in
2022, and what happened to it by 2026:

| 2022 verb | 2022 meaning | 2026 fate |
|---|---|---|
| **build** | Multi-step "build evidence 1 → 2 → 3 → build theory → build Profile" flow. Users assembled evidence, chained it into a theory, and got a theory profile page. **13 of the 40 frames — one-third of the whole prototype — were dedicated to this pipeline.** | Survives as "contribute to the canon" — but now curated, not user-generated. The interactive pipeline is gone. |
| **publish** | `publish 1 → 2 → 3` sub-flow. Terminal action. A representative piece of example content on `publish 3`: *"The Pyramids exist"*. | ✅ **Survived intact as the terminal action.** Now means Story Protocol IP NFT minting on Base. Publication routes fees to authors via on-chain receipts (see `PROTOCOL.md`). |
| **discover** | `discover 1 → 2 → 3` cycle. Browse other people's theories. Had a search bar (*"Search for theories to discuss..."*) and a Filter. | ⚠️ **Degraded.** Now = "browse the gdrive folder tree at `gdrive:AGFarms/Nucleus/research/bucket-canon/`." No search, no filter, no ranking. Discoverability is an open problem. |
| **discuss** | Had its own first-class `discuss 1 → 2 → 3` sub-flow. Treated as equal in weight to the other three verbs. | ❌ **Deleted.** No comment layer, no threads, no debate surface anywhere in the 2026 architecture. Discussion is explicitly not a feature. |

**The four-verb → two-verb transition is the single most important
structural fact about bucket's evolution.** 2022 bucket was a discussion
platform. 2026 bucket explicitly rejected discussion as a feature. That
is not product drift — that is a thesis change.

### A tell hidden in the wiring

On the Landing Page (node `1:2`), the button labeled **"discuss"** is
wired to the frame named **"publish"** — not to the frame named "discuss."
In isolation it looks like a 2022 prototyping bug. In the context of
what bucket later became, it reads differently: even in 2022, the team
was already ambivalent about whether discuss or publish was the terminal
action. By 2026 that ambivalence had fully resolved — **publish wins,
discuss is gone.** The prototype was voting against discussion before the
team consciously decided to drop it.

### The vocabulary change

The 2022 prototype treats **"theory"** as the primary unit of content:

- *"Search for theories to discuss..."* (search placeholder)
- `build theory` (frame name)
- `build Profile` = theory-profile page, not user-profile page
- `build evidence 1 → 2 → 3` feeds into `build theory`
- Example placeholder theory on `publish 3`: *"The Pyramids exist"*

**The word "theory" does not appear anywhere in 2026 Bucket Foundation
documentation.** It has been replaced with a stricter vocabulary:

> **axioms · laws · rules · principles · primary derivations · foundations**

A "theory of the pyramids" is the kind of content 2022 bucket was built
to host. A "primary derivation" is the kind of content 2026 bucket is
built to host. **The 2026 canon contract would reject the 2022 example
content outright.** This is not a cosmetic rename — it is a radical
narrowing of what counts as bucket-worthy.

### The waitlist reality

bucket 1.0 has a `Waitlist` frame, and three separate CTAs route to it:
`Button` (3:12), `Join the Waitlist!` (3:11), and `Join!` (18:35). That
means in December 2022, bucket was:

- Pre-launch
- Pre-user
- Pre-product-in-production
- Pitch-deck-grade prototype
- Waitlist-capture mode

The file then sat untouched for 13 months until `bucket pitch`
(`zVwoR6s0FYawk1QY0GBIOe`, 2024-01-17) — the strategy deck where the
thesis presumably began to shift. That file is the **Rosetta Stone** of
bucket's evolution and, as of 2026-04-15, we do not have offline access
to its document tree (the Figma `/v1/files/:key` endpoint is
rate-limited on the account; see below).

---

## The 2024 middle — bucket pitch (not yet readable)

**File:** `zVwoR6s0FYawk1QY0GBIOe`
**Last modified:** 2024-01-17T12:02:59Z
**Status:** 344 top-level elements (mostly RECTANGLE/TEXT, not FRAME);
renderable count TBD. `_file.json` is a 42-byte `{"status":429,"err":"Rate
limit exceeded"}` stub from the 2026-04-15 first-pull attempt. Zero
frames rendered. Four lighter endpoints (components, styles, comments,
versions) did succeed.

This is the file that would answer the questions this history cannot:

- **When did "theory" get replaced by "axiom"?**
- **When did "discussion" get dropped from the product surface?**
- **Were Story Protocol / Walrus / Dynamic already in the 2024 deck, or
  did they arrive in 2026?**
- **Was the nonprofit framing present in 2024, or is it a 2026 addition?**
- **Is the 7-branch canon taxonomy (math, physics, chemistry, info,
  biophysics, cosmology, mind) a 2024 concept or a 2026 concept?**

Once the Figma renderer cooldown clears (~2026-04-19 based on the
364,208-second Retry-After header observed on 2026-04-15), re-run
`agf-figma pull zVwoR6s0FYawk1QY0GBIOe --venture bucket-foundation
--slug bucket-pitch` to capture the full archive. This file is the
highest-priority Figma artifact in the entire AGFarms portfolio for
historical continuity purposes.

---

## Bucket 2026 — the revival

Reactivated **2026-04-14** as a public MIT-licensed repository at
`gianyrox/bucket-foundation` (transfer to `AGFarms/bucket-foundation`
pending), with the intent to formalize as a 501(c)(3) nonprofit
independent of AGFarms. Current state (~2026-04-15):

- **Thesis:** AI + foundations + a small number of humans capable of
  genius work = the next layer of reality. Canon holds **only
  foundations** — axioms, real math, rules, laws, principles, primary
  derivations — across **seven branches**: mathematics, physics,
  chemistry, information & computation, biophysics, cosmology, mind.
- **Outcomes ≠ canon.** Longevity, disease, cognition, energy — all
  downstream *applications*, not canon. Longevity research lives in
  `gdrive:AGFarms/Nucleus/research/longevity-canon/` as an outcome-tier
  index; any paper that *also* cites a canon axiom gets cross-mirrored
  into `bucket-canon/05-biophysics/sub-outcomes/longevity/`.
- **Reference implementation:** Next.js on Vercel, Story Protocol IP
  NFTs, Walrus on-chain storage, Dynamic web3 auth, Supabase. See
  `PROTOCOL.md` for the x402 data-protocol spec and `MANIFESTO.md` for
  the public framing.
- **Contributor index:** `canon-figures/` holds pass-1 seed of ~76
  canon-tier figures across 10 working branches, honoring the original
  "build history" framing (the people who built it).
- **Absorption stage:** canon taxonomy is a working draft, not contract.
  `bucket-canon/TAXONOMY_NOTES.md` at the gdrive root tracks open
  questions and rename log. `_intake/` at the root is the holding area
  for artifacts whose branch isn't decided yet.
- **Contents flow:** seed content as of 2026-04-14 is ~37 files; the
  Viatika x402-research-gateway → bucket-canon auto-ingest pipeline is
  **queued but not yet built.** The longevity vertical is **flagged but
  not a current sprint goal.**

### The survival list

What made it from 2022 → 2026:

1. **publish as the terminal action** — still the point of the whole thing.
2. **The word "bucket" as the container metaphor** — content-addressed
   folders now, theory profiles then, but the unit is still a bucket.
3. **Pay-once-cite-forever intuition** — implicit in the 2022 flow (once
   you publish a theory, anyone can reference it), explicit in the 2026
   protocol (x402 micropayment with durable citation rights).
4. **Author patronage** — implicit in the 2022 "profile" page, explicit
   in the 2026 on-chain citation fee routing.
5. **Evidence → theory linking** — 13 frames of the 2022 prototype were
   dedicated to this pipeline. In 2026 it is gone from the UX but
   survives in the canon contract as the cross-mirror rule (a paper
   that cites a canon axiom gets filed under the axiom).

### The deletion list

What did not survive:

1. **"Theory" as the unit of content** — replaced with axioms, laws,
   primary derivations.
2. **Discussion as a first-class verb** — deleted entirely.
3. **The 13-frame evidence-to-theory UX** — replaced with curator
   judgment + gdrive folder moves.
4. **The social-network topology** — nav/profile/search/filter all
   gone. 2026 bucket has no UI for users at all beyond the reference
   publishing site.
5. **Waitlist capture** — the project is now open-source and public;
   there is nothing to wait for.
6. **"build the past"** — the very first slogan. Retired in favor of
   the cleaner "build history" and then the bigger "renaissance"
   framing.

### The addition list

What is genuinely new in 2026 and has no 2022 precedent:

1. **Nonprofit structure.** 2022 bucket was a would-be for-profit
   social network. 2026 bucket is an intended 501(c)(3).
2. **Open-source protocol.** `PROTOCOL.md` (CC0-in-intent),
   `GOVERNANCE.md`, MIT code, public repo. 2022 bucket was
   closed-source and unreleased.
3. **x402 micropayments.** x402 didn't meaningfully exist in 2022.
4. **Story Protocol IP NFT minting.** Didn't exist in 2022.
5. **Walrus on-chain storage.** Didn't exist in 2022.
6. **The 7-branch taxonomy.** math · physics · chemistry · info ·
   biophysics · cosmology · mind — this framework is, as far as we
   know, entirely post-2024.
7. **The "AI + foundations + small number of humans" thesis.** 2022
   bucket was written for a world before capable foundation models.
   2026 bucket is written for the world after. The whole reason to
   curate a canon of foundations is that AI needs a clean substrate
   to do genius work on; this thesis makes no sense pre-2023.

---

## The one-line summary of the transformation

**2022:** *"Let's make history a discussion"* → a social network for
debating theories with evidence.

**2026:** *"Bucket is the new renaissance"* → a curated nonprofit canon
of foundations for AI+human research cells doing work at the frontier.

The distance between those two sentences is the entire arc of the
project.

---

## Recovery metadata

- **Recovered:** 2026-04-15, during the Nucleus Brain integration of
  the in-house `agf-figma` CLI + `figma-agf` MCP server (see
  `~/agfarms/CLAUDE.md` §Figma).
- **Source file:** `~/agfarms/bucket-foundation/figma-export/bucket-1.0/2026-04-15/_file.json`
  (3.96 MB, complete document tree).
- **PNG frames rendered:** 25 of 40, mirrored to
  `gdrive:AGFarms/Nucleus/bucket-foundation/figma/bucket-1.0/2026-04-15/`.
- **PNG frames outstanding:** 15 (mostly hover-states and sub-states:
  Waitlist, Nav Bar, Foot, build 2, build theory, build Profile hover,
  discover 2 link-states, Foot, About Us, Contact Us). Blocked until
  Figma per-account renderer cooldown clears.
- **bucket-pitch archive:** metadata-only, 0 frames rendered, document
  tree not yet captured. Queued for retry post-2026-04-19.
