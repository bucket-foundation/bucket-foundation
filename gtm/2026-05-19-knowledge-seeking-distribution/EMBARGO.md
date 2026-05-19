---
███████████████████████████████████████████████████████████████████████████████
██  EMBARGOED — DRAFT — DO NOT EXECUTE ANY TACTIC IN THIS FOLDER              ██
██  Every tactic in PLAYBOOK.md is HARD-GATED on P0 (canon-integrity) closing ██
██  AND a per-tactic go/no-go check AND founder sign-off. See checklist below.██
███████████████████████████████████████████████████████████████████████████████
---

# EMBARGO — knowledge-seeking distribution playbook

**Bead:** P1 (GATED on P0) — knowledge-seeking distribution playbook (epic `bkt-epic-gtm`)
**Hard-gated on:** P0 — `/api/research` serves auto-segmented Kruse transcript incl. conspiracy as citeable canon (epic `bkt-epic-canon-web`, line 51 `BEADS-PENDING.jsonl`)
**Drafted:** 2026-05-19
**Status:** DRAFT / EMBARGOED

This is a nonprofit whose only asset is research integrity. Distribution is a
**force multiplier on endpoint output**. If the endpoint output is wrong, every
backlink, embed, citation, directory listing, and post we ship multiplies the
wrong thing — and does so durably, because the entire pitch is *citeable
forever*. A premature distribution push here is not a missed quarter; it is a
permanent, indexed, agent-cached record of a research-integrity nonprofit
serving transcription-error conspiracy content as primary-research canon.

Therefore: **nothing in `PLAYBOOK.md` ships externally until the gate below is
fully green.** There is no soft launch, no "just the safe tactics first," no
"directories don't really count." The gate is the gate.

---

## 1. The single blocking fact (P0)

As verified live on prod 2026-05-19, the flagship query
`GET /api/research?q=mitochondrial+ATP+synthesis&tier=insight` returns, as
`canon_tier` content with a `CC-BY` `canonical_url`:

- an `answer` that is a garbled auto-chunked Jack Kruse podcast transcript and
  **never mentions ATP synthesis**;
- evidence including `canon:mitochondria/003-because-guess-what` ("the guy that
  controlled the budget, Anthony Fouchy, made sure we always focused on RNA and
  DNA") and `005` ("99 of the NIH Budget") — misheard transcription-error
  conspiracy text served as citeable primary research.

The curated `bucket-canon/05-biophysics/mitochondria/primary-papers.md` (Mitchell
1961 = "the axiom", Boyer, Walker F₁) **exists**, but the search/index layer
serves `sub-claims/*.md` transcript chunks instead of it.

Until P0 is closed, every claim in `PLAYBOOK.md` about "citeable canon", "real
primary research", "what a scientist would cite", and "agents can cite the
canon cleanly" is **false on prod**. Distribution of a false claim by a
research-integrity nonprofit is the one failure this venture cannot take.

---

## 2. Hard publish-gate checklist

Every box must be checked, by a named person, on a dated line, before **any**
tactic in `PLAYBOOK.md` is executed anywhere (a registry submission, a backlink
PR, a JSON-LD deploy, an embed, a post, a pitch email — anywhere).

- [ ] **P0 CLOSED.** `GET https://www.bucket.foundation/api/research?q=mitochondrial+ATP+synthesis&tier=insight`
      returns HTTP 200 whose `answer` is the curated primary-research foundation
      for the query (Mitchell 1961 chemiosmotic coupling and its primary
      lineage), `citation.canonical_url` resolves to a per-claim page backed by
      `primary-papers.md`-tier content, and **zero** evidence item is
      transcription-error or conspiracy text. Verified by: __________ on __________
- [ ] **Cross-branch flagship spot-check.** One flagship/demo query per branch
      (01–07 minimum) returns something a domain scientist would actually cite —
      a real paper, law, or primary derivation — not an auto-transcript chunk,
      not "served from canon" emptiness. Queries + responses captured to a
      dated fixture file. Verified by: __________ on __________
- [ ] **Kruse correctly demoted.** Any Kruse-corpus-derived material is labelled
      `canon_tier: candidate` (or lower), explicitly tagged as *one partial
      source* for `05-biophysics`, is never the headline `answer` or `citation`
      for a flagship query, and conspiracy/transcription-error chunks are
      filtered out of the served set entirely. Verified by: __________ on __________
- [ ] **Provenance page live.** The "what canon is / how it is sourced /
      provenance & epistemics" page (PLAYBOOK.md §6) is published at a stable
      URL, states the Kruse-as-one-partial-source epistemics in plain language,
      and is the link target for all credibility backlinks. URL: __________
- [ ] **agent-trust write-up live.** `/protocol/agent-trust` is reachable, and
      the refused→fixed gate in `gtm/2026-05-18-refused-then-fixed/EMBARGO.md`
      is independently green (that set has its own gate; this playbook does not
      override it). URL + that-gate state: __________
- [ ] **Structured data validates.** Every JSON-LD block shipped (PLAYBOOK.md
      §2) validates against schema.org and points `url`/`identifier` at a
      canonical per-claim page that returns real canon, not a raw query string.
      Validator output captured. Verified by: __________ on __________
- [ ] **Founder sign-off.** Gian has read this embargo and `PLAYBOOK.md`,
      confirmed P0 is closed on prod with his own eyes, and approved external
      execution. Sign-off: __________ on __________

If any box is unchecked, the entire playbook stays embargoed. Tactics do not
ship individually ahead of the gate, including the ones that "feel low-risk"
(directory listings and structured data are *higher* risk under a broken
endpoint, not lower — they are exactly what agents cache and trust).

---

## 3. Forbidden-until-true claims

These statements are NOT allowed in any external surface (page copy, JSON-LD,
directory description, embed, post, pitch email, README cross-link) until the
corresponding fact is verifiably true on prod on the day it ships.

| Claim | Allowed only when | Until then |
|---|---|---|
| "Query our canon — axioms, laws, first principles" / "citeable primary research" | P0 closed; flagship + cross-branch checks green | Do not register, link, or embed the `/api/research` endpoint anywhere. No exceptions for "machine-only" surfaces. |
| "Agents can discover and cite the canon cleanly" | P0 closed and an unmodified agent returns a real primary-research citation for a flagship query | Do not pitch the agent-discovery story as a working capability; the refused→fixed write-up is about *trust shape*, not *content quality*, and must not be used to imply content quality. |
| Any JSON-LD `ScholarlyArticle` / `Dataset` / `Claim` describing canon content | The described `canonical_url` returns curated primary-research canon | Do not deploy structured data that asserts a transcript chunk is a `ScholarlyArticle` or `Citation`. This would teach search engines and agents a false fact, durably. |
| "bucket.foundation canon" as a citable dataset (dataset registries, `Dataset` JSON-LD, `feed402.json` index hashes) | P0 closed and the index serves curated canon | Leave `feed402.json` `index.chunks` / `corpus_sha256` / `built_at` `null` (as they are now). Do not submit to dataset registries. |
| Cross-links from gianyrox.com / the book / x402-research-gateway / feed402 / canon-figures pointing at `/api/research` or `/canon/claims/*` | P0 closed and those URLs return real canon | Cross-link only to gate-safe, content-stable pages (`/manifesto`, `/protocol`, `/protocol/agent-trust`, `/governance`, `/cite-forever/v0.1`) — and only after founder sign-off. |
| "free to read, paid to cite — cite the foundation" used as a distribution hook | P0 closed | The hook implies the thing you cite is a foundation. Today it is a misheard podcast. Do not ship the hook attached to the endpoint. |
| Any metric (agents, citations, queries, backlinks, $) | The number is real and sourced | Omit. This playbook ships with zero quantitative claims by design, exactly like the refused→fixed set. |

---

## 4. Why even the "safe" tactics are gated

A reasonable objection: "registering in an AI directory or shipping a sitemap
is harmless even if the endpoint is wrong." It is not, and this is the load-
bearing reason this is a *hard* gate, not a soft one:

1. **Directories and structured data are the agent cache.** An AI/agent
   directory listing and a `Dataset`/`ScholarlyArticle` JSON-LD block are the
   exact artifacts retrieval agents and crawlers ingest and *persist*. Shipping
   them while the endpoint serves conspiracy text trains the ecosystem to
   associate "bucket.foundation canon" with that content, and that association
   outlives the fix.
2. **The pitch is durability.** Our entire value proposition is
   *citeable-forever*. We cannot ask the world to treat our output as
   permanent and then ship permanence over broken output.
3. **One asset.** Trust is the only asset. There is no second, lesser asset
   that the "safe" tactics could spend instead. Every tactic spends the same
   asset.

The correct order is not negotiable: **fix the output, verify the output,
then multiply the output.** This folder is the multiplier. It stays in its
holster until the thing it multiplies is true.
