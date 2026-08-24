---
███████████████████████████████████████████████████████████████████████████████
██ EMBARGOED, STRATEGY DRAFT, NOTHING HERE SHIPS UNTIL EMBARGO.md IS GREEN ██
██ Every tactic states its P0 dependency and a one-line go/no-go check. ██
██ P0 = canon-integrity (line 51, BEADS-PENDING.jsonl). Read EMBARGO.md. ██
███████████████████████████████████████████████████████████████████████████████
---

# Knowledge-seeking distribution playbook

**Bead:** P1 (GATED on P0), knowledge-seeking distribution playbook (epic `bkt-epic-gtm`)
**Hard gate:** P0, `/api/research` must serve curated primary-research canon (zero conspiracy / transcription-error content) on flagship + cross-branch queries, plus founder sign-off. See `EMBARGO.md`.
**Drafted:** 2026-05-19
**Voice:** nonprofit. Precise, humble, technically credible. No growth-hack tone, no hype adjectives, no invented metrics, no emojis. The hero is the integrity of the canon, never the reach.

---

## Executive summary

Bucket.foundation's distribution problem is not "how do we get attention." It
Is "how does a research artifact get **discovered, cited, and attributed back**
By the systems that now do most research retrieval, autonomous agents and
search engines, without a human in the loop." That is a *substrate* problem,
And the substrate is already mostly built: the agent-discovery surfaces
(`llms.txt`, `llms-full.txt`, `/.well-known/feed402.json`, `ai-plugin.json`,
`mcp.json`) are live and canonical, and the credibility anchor
(`/protocol/agent-trust`, the "refused → fixed" write-up) is written.

What remains is **seven sequenced tactics** that turn that substrate into a
backlink-and-citation engine that compounds:

1. **Keep the agent-discoverable surfaces canonical** and register them where
 agents and crawlers look (AI/agent directories, well-known indexes,
 dataset registries), *one source of truth, many discoverable mirrors*.
2. **Per-claim citeable canonical URLs + structured data** (JSON-LD
 `ScholarlyArticle` / `Dataset` / `Claim` / `CreativeWork`, sitemap, OG) so
 an agent or a search engine cites a *stable foundation page* instead of a
 transient query, and the attribution lands back on us.
3. **The "refused → fixed" write-up as the earned-media + credibility anchor**,
 the one linkable asset a careful third party (a safety researcher, an
 infra writer, a funder doing diligence) can point at.
4. **An embeddable "cite this" widget + frictionless copy-citation**, the
 organic backlink engine: every place the canon is used emits a clean,
 attributing link back, by construction.
5. **An inbound cross-link map** across the properties we already control
 (gianyrox.com, the book *Your Money Is Broken*, x402-research-gateway,
 feed402 spec, canon-figures, MANIFESTO) with exact anchor text.
6. **A canonical "what canon is / how it is sourced / provenance & epistemics"
 page** so every backlink lands on *integrity* instead of a raw query, and so the
 standing Kruse-as-one-partial-source epistemics is stated in our own words,
 on our own page, before anyone else states it for us.
7. **Posting cadence/channels** (X, LinkedIn) sequenced strictly behind the
 already-embargoed refused→fixed drafts, *sequencing only, no new hype*.

**The gate is the strategy's first-class constraint.**
Distribution multiplies endpoint output. The endpoint currently serves
transcription-error conspiracy text as citeable canon (P0). Multiplying that
Is the single worst thing a research-integrity nonprofit can do, and it does
So *durably* because the entire pitch is "citeable forever." Therefore every
tactic below carries an explicit **P0 dependency** (the canon-quality bar that
must be true before it can go live without backfiring) and a one-line
**go/no-go check**. The correct order is fixed and non-negotiable: **fix the
Output, verify the output, then multiply the output.** Nothing here ships
until `EMBARGO.md` is fully green.

---

## 0. Operating principles

- **One source of truth.** `llms.txt` / `llms-full.txt` / `feed402.json` /
 `ai-plugin.json` / `mcp.json` are the canonical machine surfaces. Every
 external registration *points at* them; it never restates their content.
 Drift between a directory listing and the live surface is itself a trust
 defect.
- **Backlinks must attribute, not just link.** A link that does not carry the
 canonical claim URL + license is traffic without attribution. We optimise for
 *attribution that survives being cited by an agent*, which is the only
 durable backlink in an agent-era research economy.
- **Land on integrity.** Every inbound link resolves to a
 content-stable page that explains what the canon is and how it is sourced
 (§6) or to the credibility anchor (§3), never to a bare `/api/research?q=`.
- **No invented metrics, ever.** Same discipline as the refused→fixed set.
- **The slogans appear in order where slogans appear:** *build the past.
 build history. Bucket is the new renaissance.*
- **Every tactic is gated.** "Low-risk" tactics (directories, structured data,
 sitemaps) are *higher* risk under a broken endpoint because they are exactly
 what agents cache and trust. There is no safe subset to ship early.

---

## 1. Keep the agent-discoverable surfaces canonical + register them

**What.** The surfaces are live (`public/llms.txt`, `public/llms-full.txt`,
`public/.well-known/feed402.json`, `ai-plugin.json`, `mcp.json`). The work is
(a) keep them the single source of truth and drift-free, and (b) make them
*found* by registering pointers where agents and crawlers look.

**Concretely:**

- **Canonical hygiene (continuous).** A single checklist that asserts, on every
 deploy: `llms.txt` ↔ `llms-full.txt` ↔ `feed402.json` ↔ `ai-plugin.json` ↔
 `mcp.json` agree on the endpoint URL, the zero-key/zero-payment language, the
 envelope shape, and the license URL. `feed402.json.index` fields
 (`chunks`, `corpus_sha256`, `built_at`) stay `null` until the index serves
 curated canon, populating them is a *post-P0* act, because they assert the
 corpus is citeable.
- **`/.well-known/` completeness.** `feed402.json`, `mcp.json`,
 `ai-plugin.json` exist; add `/.well-known/openapi.json` (referenced by
 `ai-plugin.json` but not yet present) so the ChatGPT-plugin/agent path
 resolves end to end. Robots + sitemap already exist (`src/app/robots.ts`,
 `src/app/sitemap.ts`).
- **Where to register pointers** (each is a *pointer to the canonical surface*,
 never a content copy):
 - **AI / agent directories**: feed402 ecosystem index; x402 ecosystem /
 "merchants" listing (we are a live feed402 merchant, see §5
 x402-research-gateway); MCP server directories/registries (via
 `mcp.json`); ChatGPT/agent plugin directories (via `ai-plugin.json` once
 `openapi.json` is live); "LLM-readable site" / `llms.txt` indexes.
 - **Well-known indexes**: ensure `robots.txt` references `sitemap.xml` and
 `llms.txt`; ensure `feed402.json` and `mcp.json` are linked from
 `llms.txt` (they are) and reciprocally point home (they do, via `links`).
 - **Dataset registries** (Hugging Face datasets, Data.gov-style open-data
 indexes, scholarly-dataset catalogs): **do not submit yet**, submitting
 "bucket.foundation canon" as a dataset asserts the corpus is curated and
 citeable. This is the highest-return *post-P0* registration and the most
 damaging *pre-P0* one.
- **Maintenance owner.** This is `bkt-epic-gtm` standing work rather than one-shot:
 registries churn, schemas change, and a stale listing that contradicts the
 live surface is a trust defect.

**P0 dependency.** Registration tells agents and crawlers *"there is citeable
Research here, come ingest it."* That invitation must be true the moment it is
extended, because directories and well-known indexes are cached and
Re-crawled without being re-verified. The canon-quality bar: flagship query + one
flagship query per branch (01-07) return curated primary-research canon, zero
transcription-error/conspiracy content, and `feed402.json.index` reflects a
real curated build. Dataset-registry submission additionally requires a stable
`corpus_sha256` over curated content.

**Go / no-go check.** `curl /api/research?q=mitochondrial+ATP+synthesis&tier=insight`
Returns a curated primary-research answer (Mitchell-1961-tier) with zero
conspiracy/transcription-error evidence → **go** on directory/well-known
registration; dataset-registry submission additionally requires a non-`null`,
Curated `feed402.json.index.corpus_sha256`. Any conspiracy/transcript text in
the response → **no-go**, all of §1.

---

## 2. Per-claim citeable canonical URLs + structured data

**What.** Make every foundation in the canon a **stable, addressable,
Machine-described page** so an agent or a search engine cites *that page* (and
attributes back) instead of a transient query string. The envelope already
emits `citation.canonical_url` of the form
`https://www.bucket.foundation/canon/claims/<branch-slug>/<claim-slug>` and the
route `src/app/canon/claims/[slug]` exists, this tactic makes those pages
*citation-grade and self-describing*.

**Concretely:**

- **Stable per-claim URL contract.** `/canon/claims/<branch>/<slug>` is
 permanent and content-addressed in spirit: the slug never changes; if a
 claim is revised, the page shows version + provenance, it does not move. This
 is the durable backlink target, agents cite URLs that don't 404.
- **JSON-LD on every claim page** (`schema.org`), chosen by what the claim *is*:
 - `ScholarlyArticle` / `CreativeWork` for a foundation paper or primary
 derivation (`author`, `datePublished`, `identifier` = DOI, `license`,
 `isBasedOn`, `citation` linking the primary lineage, e.g. Mitchell 1961 →
 Boyer → Walker F₁).
 - `Dataset` for the canon corpus as a whole and per-branch collections
 (`distribution` → `/api/research`, `license`, `creator` =
 bucket.foundation, `isAccessibleForFree: true`,
 `usageInfo` → `/cite-forever/v0.1`).
 - `Claim` / `CreativeWork` with `appearance`/`citation` for an individual
 canon claim, linking to the §6 provenance page via `isBasedOn`.
 - `Citation` relationships expressing the foundation→derivation lineage so a
 search engine and an agent can both walk it.
- **Sitemap + OG.** `src/app/sitemap.ts` enumerates every claim page; each page
 ships Open Graph + `twitter:card` so a shared/cited link renders with the
 claim title, branch, and "free to read · paid to cite", making the backlink
 legible to humans who land on it from an agent's citation.
- **`canonical_url` parity.** The envelope's `citation.canonical_url` MUST
 resolve to the JSON-LD page described here. The envelope and the page are the
 same fact in two encodings; they cannot diverge.
- **Per-claim "land on integrity" header.** Each claim page links up to the §6
 provenance/epistemics page ("How this claim is sourced") so even a
 deep-linked citation lands one click from the integrity statement.

**P0 dependency.** This is the **single most dangerous tactic to ship early.**
JSON-LD `ScholarlyArticle`/`Dataset`/`Claim` is a *machine assertion to search
engines and agents that this page is curated, citeable research*. Deploying it
over the current state would structurally assert that
`canon:mitochondria/003-because-guess-what` ("Anthony Fouchy … NIH Budget") is
A `ScholarlyArticle`, a false fact, durably cached by every crawler that sees
It, and exactly the kind of claim a research-integrity nonprofit cannot
retract cleanly. The canon-quality bar: the `canonical_url` for every claim
that ships JSON-LD resolves to curated `primary-papers.md`-tier content; no
transcript-chunk claim ships structured data at all (such material, if
surfaced, is unmarked-up `candidate`-tier with an explicit one-partial-source
label, never `ScholarlyArticle`/`Citation`).

**Go / no-go check.** For each claim page about to ship JSON-LD: its
`canonical_url` returns curated primary-research content AND a schema.org
validator passes AND no `ScholarlyArticle`/`Citation` markup points at a
transcript-derived chunk → **go** for that page only. Any structured-data
block whose target is auto-transcript content → **no-go**, the entire §2
Deploy.

---

## 3. The "refused → fixed" write-up as credibility + earned-media anchor

**What.** `/protocol/agent-trust` (source `docs/AGENT-TRUST.md`) is the one
Asset a careful, skeptical third party can link to **, it leads with
An external system's verbatim objection, concedes the objection was correct,
And shows the structural fix. That candor is the credibility, and credibility
Is what makes a backlink from a serious source possible at all.

**Concretely:**

- **It is the canonical inbound target for credibility links**, more than the
 landing page and more than a query. "Here is a research-integrity org that published
 the AI refusal that taught it, and the fix" is linkable; "here is a research
 API" is not.
- **Who would link it, pitched (no hype, the quote carries it):**
 - **AI-safety / agent-security writers and researchers**, the general
 principle in §6 of that write-up ("design the protocol so the refusal is
 never triggered") is reusable and citeable independent of bucket. Pitch:
 *"A safety-tuned agent refused our paid-research protocol on prompt-
 injection grounds; the verbatim refusal and the structural fix are
 written up here, the five-rule generalisation may be useful to anyone
 mixing content retrieval with payment."* No ask, no metric, no
 endorsement language.
 - **x402 / feed402 / agentic-payments community**, it is the reference
 implementation of the agent-trust rule (`PROTOCOL.md §3.1`, feed402
 `SPEC.md §3.1`). Pitch is the spec linkage, factual.
 - **Open-science / scholarly-publishing critics**, the "fees to authors not
 publishers" framing, anchored by the candor of having published a refusal.
 - **Funders doing diligence**, this is the page that survives scrutiny;
 it is what we point a diligence email at instead of a deck.
- **Pitch rules** (inherit `gtm/2026-05-18-refused-then-fixed/EMBARGO.md §2`):
 models are *test subjects, never endorsers*; the refusal was *correct given
 what it saw*, the defect was ours; no superlatives, the verbatim quote
 carries the weight; zero metrics.

**P0 dependency.** The write-up is about **trust shape** (paid-to-cite ≠
Pay-to-proceed), not **content quality**. It can be linked and pitched while it
Is true *as a trust-architecture document*. BUT: the moment we use it as a
distribution anchor, careful readers will follow it into `/api/research` and
the canon. If they hit transcription-error conspiracy content there, the
write-up's credibility is destroyed *retroactively*, "they published their
honesty about agent trust while serving conspiracy text as canon" is a worse
story than either failure alone. So the canon-quality bar applies in full:
This anchor is only pitched once a follow-through into the canon returns real
primary research. Additionally, this is gated independently by that folder's
own embargo (refused→fixed `EMBARGO.md`); this playbook does not override it.

**Go / no-go check.** refused→fixed `EMBARGO.md` is fully green **and** P0 is
Closed (a click from `/protocol/agent-trust` into `/api/research` returns
curated canon) → **go** to pitch/anchor. Either gate red → **no-go**.

---

## 4. Embeddable "cite this" widget + frictionless copy-citation

**What.** The organic backlink engine. Every place the canon is used should, by
construction, emit a clean attributing link back. Two affordances:

- **Copy-citation affordance** on every claim page and in every envelope
 consumer: a one-click "copy citation" that yields the `citation` block
 verbatim (BibTeX + plain + JSON-LD forms), each containing the
 `canonical_url` and the `cite-forever/v0.1` license. This is already the
 protocol's defined citation action ("copy the 0 block verbatim");
 the widget just makes the *correct* thing the *easy* thing.
- **Embeddable "cite this" widget**: a tiny, dependency-free snippet
 (iframe/script or a static HTML block) a third-party site, notebook, or docs
 page can paste, rendering "Foundation: <title> · bucket.foundation canon ·
 free to read, paid to cite" with the canonical link. Every embed is a
 durable, attributing backlink that points at a §2 claim page (integrity),
 not a query.

**Concretely:**

- Widget content is generated *from* the canonical claim page (§2), so it
 cannot drift from the canon; if the claim is revised, every embed reflects it.
- The widget link target is the per-claim canonical URL → which links up to the
 §6 provenance page. The backlink chain always terminates on integrity.
- Ship a copy-citation control in the same change as the §2 JSON-LD so the
 human-copyable and machine-readable citation are the same fact.
- No tracking, no analytics beacon in the embed, a research-integrity
 nonprofit's embed must not exfiltrate the host page's readers. The embed is
 attribution infrastructure.

**P0 dependency.** A "cite this" widget is an **amplifier of whatever the claim
page contains**. Every embed is a permanent, third-party-hosted assertion that
"this is a bucket.foundation foundation, cite it." If the underlying claim is a
misheard podcast transcript, we have manufactured durable third-party
citations of conspiracy text and cannot recall them. The canon-quality bar:
The widget may only be generated for claims whose canonical page passes the §2
bar (curated primary research, validated structured data). No widget is
emitted for `candidate`/transcript-tier material.

**Go / no-go check.** The claim the widget would embed passes the §2 go-check
(curated primary research at its canonical URL) → **go** to expose the widget
for that claim. Endpoint still returns any transcript/conspiracy content for
flagship queries → **no-go**, ship neither the widget nor the public
copy-citation control.

---

## 5. Inbound cross-link map

**What.** We control or co-control several properties that a careful reader
Already trusts. Cross-linking them into bucket.foundation builds first-party
authority and gives agents/search engines corroborating edges. Each link must
**land on integrity** (§6 provenance page or §3 credibility anchor), never on
A raw query, and use precise, non-hype anchor text.

| From → To | Link target | Anchor text (exact) | Notes |
|---|---|---|---|
| **gianyrox.com** (founder site) → bucket | `/manifesto` then `/protocol/agent-trust` | "bucket.foundation, the nonprofit research-canon protocol I maintain" | Founder/COI is already disclosed in `GOVERNANCE.md`; the link must mirror that disclosure. |
| **Book, *Your Money Is Broken*** (gianyrox.com book page / back-matter) → bucket | `/protocol` and `/cite-forever/v0.1` | "the x402 research-payment rail (open feed402 protocol)" | The book is about stablecoins/x402 on Base, feed402 is a concrete, application. Link the *protocol* until P0; the canon comes later. |
| **x402-research-gateway** (`README`) → bucket | `/.well-known/feed402.json` and `/protocol` | "bucket.foundation, a live feed402 merchant built on this gateway" | This is the upstream this proxy calls server-side; the relationship is factual and reciprocal. |
| **feed402 spec** (`SPEC.md`, `README`) → bucket | `/protocol/agent-trust` and `PROTOCOL.md §3.1` | "reference implementation of the agent-trust rule (SPEC.md §3.1)" | Already cross-referenced in `PROTOCOL.md`/`AGENT-TRUST.md`; make it bidirectional. |
| **canon-figures pages** (`/contributors`, `/canon/.../figures/*`) → §6 provenance page | `/canon` provenance/epistemics page (§6) | "How a figure enters the canon, sourcing & epistemics" | canon-figures honors *build history*; the link makes the curation criteria legible. |
| **MANIFESTO** (`/manifesto`) → §6 + §3 | §6 provenance page; `/protocol/agent-trust` | "what counts as a foundation, and how the canon is sourced" / "the refusal that became the spec" | The manifesto asserts "foundations only / Kruse is one partial source"; §6 is where that assertion is operationalised. |
| **bucket → out** (reciprocal, in `llms.txt` "Source" + footers) | feed402, x402-research-gateway, gianyrox.com | existing factual anchors (already present in `llms.txt`) | Keep reciprocal so the graph is corroborating rather than circular-looking. |

**Sequencing within §5:** ship the *protocol/manifesto/governance/credibility*
Links first (content-stable, gate-safe targets). Hold every link whose target
Is `/api/research`, `/canon/claims/*`, or any canon-content page until P0.

**P0 dependency.** A cross-link from a property a reader already trusts
*transfers that trust* to the target. If the target is the canon and the canon
Serves conspiracy text, we have spent the founder's, the book's, and the
Gateway's credibility on a false claim, and those properties' credibility is
not separately recoverable. Gate-safe targets (`/manifesto`, `/protocol`,
`/protocol/agent-trust`, `/governance`, `/cite-forever/v0.1`, §6 page) may be
linked once §3/§6 are live and founder-approved; canon-content targets are
hard-gated on the full P0 bar.

**Go / no-go check.** Target URL is a content-stable protocol/integrity page
(not a canon-content page) **and** §6 is live **and** founder approved → **go**
for that link. Target is `/api/research` or a canon-content page and P0 is open
→ **no-go**.

---

## 6. The canonical "what canon is / how it is sourced / provenance & epistemics" page

**What.** A single, stable page that is the **landing surface for every
Credibility backlink**. It exists so a careful reader who follows any inbound
link arrives at *what the canon is and how it is built* instead of at a raw query
result. It is also where the standing epistemics obligation is discharged in
our own words: **canon = foundations only; Kruse is one partial source for
05-biophysics and never its centre; outcomes are downstream applications outside
Canon.** (This is the public-facing operationalisation of the standing
Kruse-as-one-partial-source bead and the `MANIFESTO §4` / `CLAUDE.md` thesis.)

**Concretely, the page must state, plainly:**

- **What a foundation is** (axiom / law / primary derivation) and what is
 explicitly *not* canon (outcomes: longevity, disease, cognition, downstream
 applications, per `MANIFESTO §4`).
- **The seven branches** and that the contributor index (`canon-figures/`,
 three expansion branches) is a *superset* of the strict canon, flagged as
 such, no conflation.
- **How a claim is sourced**: provenance chain (fetched → reviewed → tiered),
 the `canon_tier` ladder (`draft` / `candidate` / `canon`) from
 `PROTOCOL.md §4.3`, and that **auto-transcript-derived material is
 `candidate` at most, labelled one-partial-source, and is never a flagship
 answer or citation**. This sentence is the public commitment that P0 must
 make true before this page can ship.
- **The Kruse epistemics, explicitly**: the Kruse corpus is *one partial
 source* feeding the 05-biophysics branch and never its centre; it is labelled,
 tiered, and never the headline. State this before anyone else states it for
 us, owning the limitation is the credibility.
- **How to cite** (copy the `citation` block verbatim; `cite-forever/v0.1`;
 reader owes 0; the forward-looking fee is a downstream-publisher matter,
 settled server-side), the same trust model as `llms-full.txt §4`, in human
 prose.
- **What to do if you find a bad claim**: a stated correction/redaction path.
 A research-integrity nonprofit must have a visible "report a bad citation"
 affordance; its existence is itself a trust signal.

This is the **link target for §3 (credibility), §5 (cross-links), and
§4 (every widget links up to it)**. Backlinks land on integrity by design.

**P0 dependency.** This page makes a *public, indexed promise*, "auto-
Transcript material is never a flagship answer; Kruse is one partial source,
Labelled and tiered." Publishing that promise while the live endpoint does the
Exact opposite converts an page into a documented contradiction (the
worst possible artifact for this org: a written integrity claim a single curl
falsifies). The page can only ship once the endpoint behaviour matches every
sentence on it. The canon-quality bar is therefore *the text of this
page*, it is the spec P0 must satisfy.

**Go / no-go check.** Every claim on the provenance page is verifiable true on
Prod by a single `curl` (flagship + per-branch queries return curated primary
Research; transcript material is demoted/labelled/excluded) → **go**
To publish. Any sentence on the page that a live request falsifies → **no-go**,
Do not publish the page (publishing a falsifiable integrity promise is worse
than publishing nothing).

---

## 7. Posting cadence & channels, sequencing only

**What.** No new posts are authored here. The refused→fixed set already has
embargoed, founder-voice drafts (`gtm/2026-05-18-refused-then-fixed/`:
`x-thread.md`, `linkedin-post.md`, plus video). This section is **sequencing
only**: when, in what order, and behind which gate.

**Cadence (all post-gate, in order):**

1. **T0, refused→fixed thread + LinkedIn post.** Exactly the existing
 embargoed drafts, only after *their own* `EMBARGO.md` is green **and** P0 is
 closed. This is the anchor moment; everything else references it.
2. **T0 + days, the provenance/epistemics page (§6) as a quiet follow.** One
 post, founder voice, no hype: *"We wrote down what counts as a foundation
 and how the canon is sourced, including where it is only one partial
 source."* Links to §6. Owning the limitation publicly is the credibility
 move, consistent with the refused→fixed voice.
3. **T0 + weeks, targeted, non-broadcast outreach** to the §3 audiences
 (safety/agent-security, x402/feed402, open-science). One-to-one or
 small-group, factual, no thread. The write-up does the talking.
4. **No standalone "we built an API" post, ever.** The post is always about an
 *idea* (the refusal that became a spec; what a foundation is), never a
 product announcement. This is a nonprofit voice constraint rather than a tactic
 choice.

**Channel rules:** X = the refused→fixed thread (the quote carries it).
LinkedIn = founder-voice, diligence-grade candor. Both inherit
`gtm/2026-05-18-refused-then-fixed/EMBARGO.md` voice + claim guardrails in
full. Zero metrics. Models are test subjects, never endorsers.

**P0 dependency.** A post is the highest-velocity, least-recoverable
Distribution surface, it is screenshotted, quote-posted, and agent-ingested
within hours and cannot be meaningfully retracted. Posting the refused→fixed
story drives careful, skeptical readers *directly into the canon* (that is the
point of the story). If they hit conspiracy/transcription-error content, the
post converts our best credibility asset into our most-amplified failure. The
canon-quality bar applies in full and is non-negotiable for this section.

**Go / no-go check.** refused→fixed `EMBARGO.md` fully green **and** P0 closed
**and** §6 page live **and** founder sign-off on this folder's `EMBARGO.md` →
**go** to begin the cadence at T0. Any one red → **no-go**, post nothing.

---

## Dependency summary

| # | Tactic | Hard P0 dependency | One-line go/no-go |
|---|---|---|---|
| 1 | Keep surfaces canonical + register pointers | Flagship + per-branch queries return curated canon; index fields curated for dataset registries | Flagship curl returns Mitchell-tier primary research, zero conspiracy → go (dataset registries also need curated `corpus_sha256`) |
| 2 | Per-claim URLs + JSON-LD/sitemap/OG | Every JSON-LD'd `canonical_url` resolves to curated primary research; no markup on transcript chunks | Claim page returns curated content + validator passes + no markup on transcript → go that page only |
| 3 | refused→fixed write-up as anchor | A click from the write-up into the canon returns real primary research; that folder's own embargo green | refused→fixed embargo green AND P0 closed → go to pitch |
| 4 | "Cite this" widget + copy-citation | Underlying claim passes §2 bar | Embedded claim passes §2 go-check → go for that claim |
| 5 | Inbound cross-link map | Canon-content targets gated on full P0; protocol/integrity targets need §3/§6 live + sign-off | Target is content-stable integrity page + §6 live + approved → go that link |
| 6 | Provenance / epistemics page | Endpoint behaviour matches every sentence on the page | Every page claim verifiable by one curl on prod → go to publish |
| 7 | X / LinkedIn cadence (existing drafts only) | Full P0 + refused→fixed embargo + §6 live + sign-off | All four green → go at T0; any red → post nothing |

**The order is fixed: fix the output (P0) → verify the output (gate checklist
In `EMBARGO.md`) → multiply the output (this playbook). This is the
multiplier. It does not run until the thing it multiplies is true.**

Drafted for `bkt-epic-gtm`, gated on P0 (`bkt-epic-canon-web`)
2026-05-19
