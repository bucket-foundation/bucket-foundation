# Sacred-History Corpus — Rights Policy

> **Pay-once, cite-forever — applied to scripture.**
>
> This is the rights model for ingesting sacred texts and their
> translations. It is binding on every ingestion runner, every
> manifest, and every downstream tool that consumes this corpus.

Status: **ADOPTED — founder-locked 2026-05-19 (`OPEN-DECISIONS.md` D2 /
`DECISIONS.md`).** This policy is the **operating default**. It
**satisfies the P1 rights interlock (`bkt-sh-rights-policy`) for
public-domain / openly-licensed sources ONLY.** Copyrighted / NC /
unclear sources remain Tier B, metadata-only, and **stay gated** — the
`LIVE_GUARD` for those sources is NOT removed by this adoption.
Date: 2026-05-19. Pillar: Product (authored) / Data (adopted + enforced
in runner).

---

## 1. The principle (from the Manifesto)

`MANIFESTO.md` §6: bucket "is not a publisher. Publishers are the
rent-seekers we are routing around." §3: bucket routes value to the
people who produced foundations and is the *durable substrate* that
lets work "survive its own circulation" without being "locked back up
by any single party — including bucket.foundation itself."

Scripture is the oldest test case of this principle. The *texts* are
overwhelmingly public domain (ancient, anonymous, or long out of
copyright). The **modern translations are not** — NIV, ESV, NASB, NLT,
CSB, NRSVue, The Message, most modern Quran and Tanakh renderings are
under active publisher copyright. A corpus that re-hosts those
full-texts would be doing exactly what the manifesto says bucket does
*not* do: enclosing and re-circulating other parties' rights-bearing
work. **The rights policy below is not a legal afterthought; it is the
manifesto applied to the one corpus where the temptation to over-ingest
is highest.**

## 2. The two-tier ingestion gate (normative)

Every text edition and every translation enters the corpus through
exactly one of two tiers. The tier is recorded in the node's
`rights` block and is **immutable without an explicit rights
re-review** logged in `CORPUS_INDEX.md`.

### Tier A — FULL-TEXT (allowed)

Full-text ingestion is permitted **only** if the edition is:

1. **Public domain** — author/translator death + jurisdiction term
   elapsed (e.g. KJV 1611, Vulgate, Septuagint/Rahlfs where PD,
   Douay-Rheims, ASV 1901, Young's Literal, Tyndale, Luther 1545,
   the Masoretic base text, the standard Cairo Quran where PD,
   public-domain Sanskrit/Pali editions), **OR**
2. **Openly licensed** — released under CC0 / CC-BY / CC-BY-SA / a
   public-domain dedication / an explicit free-use grant *by the
   rights holder* (e.g. WEB — World English Bible (PD dedication),
   open Tanach projects, Sefaria's CC-licensed texts where so marked,
   Tanzil Quran text, Clear Quran where its grant permits, SBLGNT
   under its license terms).

For Tier A the corpus stores: full normalized text, verse/aya/sloka
addressing, the witness/manuscript base, and a `license` field naming
the exact instrument and URL. A `receipt`-style provenance record is
kept exactly as `PROTOCOL.md §3` describes a bucket sidecar.

### Tier B — CITATION + LOCATOR ONLY (full text forbidden)

Any edition that is **copyrighted and not openly licensed** —
NIV, ESV, NASB/NASB95, NLT, CSB, NRSVue, NET (per its terms), The
Message, most modern commercial Quran/Tanakh/Gita translations —
enters as **metadata only**:

| Stored (Tier B) | NOT stored (Tier B) |
|---|---|
| Canonical title, publisher, year, ISBN/edition id | Any verse/passage full text |
| Translator(s), copyright holder, license = `all-rights-reserved` | Any substantial running text |
| Stable locator scheme (book/chapter/verse, sura/aya, mandala/sukta) | Any reconstruction of the text from fragments |
| A `canonical_citation` string + (where it exists) a publisher/Bible-gateway-style **deep link** to the passage at source | Cached page content from such a link |
| Brief scholarly *description* of the translation philosophy (formal/dynamic equivalence, etc.) — bucket's own words, not the publisher's | The publisher's own marketing or paratext |

Tier B nodes are first-class for **correlation, timeline anchoring,
and claim citation** — a claim may cite "NIV, John 1:1" by locator and
the AI branch-analysis layer may reason over the *fact that the
NIV renders X*, but the corpus never holds the NIV text. This is the
citation-only posture already proven by the Kruse Index pattern
("snippets + canonical_url; full text at jackkruse.com" — see
`~/agfarms/CLAUDE.md`) and the feed402 citation-type model.

### The fair-use micro-quote carve-out (tight, opt-in, per-claim)

A *single contested word or short phrase* may appear inside a
**claim** object when the claim is *about that exact rendering* (e.g.
a claim that "NIV renders Heb. *almah* as 'virgin' at Isa 7:14"). This
is genuine scholarly fair use (criticism/comment), is bounded to the
quoted span necessary to make the claim, lives only in the
`claims/` layer, never reconstructs a passage, and carries
`rights.basis: "fair-use-criticism"`. If in doubt, cite the locator
and omit the quote. **When in doubt, leave it out** (Manifesto §9).

## 3. Witnesses / manuscripts

Manuscript *images and diplomatic transcriptions* follow the same gate:
PD or openly-licensed digitizations (e.g. Codex Sinaiticus project,
many national-library IIIF manifests, Dead Sea Scrolls digital library
per its terms) → Tier A with the **digitizing institution's license
recorded**; rights-restricted digitizations → Tier B (we record the
shelfmark, institution, IIIF/permalink, and provenance claims, not the
image bytes). Provenance assertions are themselves claim-with-evidence
(`ENTITY-MODEL.md`).

## 4. Tie to GOVERNANCE.md (COI posture)

`GOVERNANCE.md` §3: "The Foundation does not claim copyright over the
research it mirrors. Each canon artifact keeps its own license,
recorded in `canon.json`." §7: the project is held in the founder's
personal capacity pending nonprofit formalization; AGFarms integration
is arms-length.

Applied here:

1. **No copyright is ever claimed by the corpus over scripture or any
   translation.** Every node records the upstream license verbatim in
   its `rights` block (mirrors the `canon.json` license field).
2. **Tier B never becomes Tier A by convenience.** Promotion requires
   a documented rights change (license grant, term expiry) logged in
   `CORPUS_INDEX.md` with date + evidence. This is the
   `_archive/<YYYY-MM>/` supersession discipline from the canon
   folder contract.
3. **COI guard:** because bucket.foundation is founder-personal and an
   AGFarms venture studio sits adjacent, any ingestion that touches a
   rights holder bucket has a commercial relationship with is flagged
   `rights.coi_review: true` and held in `_intake/` until cleared,
   matching the GOVERNANCE §7 arms-length rule.
4. **Takedown readiness.** GOVERNANCE §6 names "a takedown notice"
   as a formalization trigger. Tier B's metadata-only design means a
   takedown surface barely exists; any Tier A item also carries
   enough provenance to be removed cleanly to `_archive/` on notice
   without breaking citing claims (the locator survives even if the
   text is pulled).

## 5. Hard rules (checklist for every ingestion runner)

- [ ] Edition classified Tier A or Tier B **before** any bytes are written.
- [ ] Tier A requires a named, URL-cited license instrument (PD basis or open license).
- [ ] Tier B writes metadata + locator + citation only. Zero passage text. Zero cached source pages.
- [ ] Fair-use micro-quote only inside a `claims/` object, only when the claim is about that exact span, with `rights.basis`.
- [ ] Every node's `rights` block is complete (tier, basis, license, holder, url, coi_review).
- [ ] No PII, no raw scrapes of paywalled translation sites, no zips of restricted text (mirrors AGFarms gdrive rules).
- [ ] Ambiguous rights → `_intake/`, not `traditions/`. When in doubt, leave it out.
