# Imports

**Status:** research memo, bead `ros-import`. No code. Citations are pinned to `083ead80b`.

Quotation convention: `[...]` inside a quoted passage marks text cut from the middle. Everything else inside quotation marks is byte-equal to the source at the locator given.

A learner brings in a paper, a dataset, a page, a passage. Research OS already accepts it, fetches it, and makes a private node out of it. What it does not do is record who may read the text afterwards, name the source in a way that survives the page changing, or tell the learner when the thing they cited stopped saying what they cited it for.

## What the code does today

### The table

`graph.imports` is declared at `supabase/migrations/20260915000000_research_os_access.sql:75-83`:

```sql
create table if not exists graph.imports (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  kind        text        not null check (kind in ('dataset','paper','notes','corpus')),
  title       text        not null,
  source      jsonb       not null default '{}'::jsonb,   -- {"url"?, "filename"?, "sha256"?, "license"?}
  node_id     uuid        references graph.nodes (id) on delete set null,
  created_at  timestamptz not null default now()
);
```

The `source` comment names four keys. `license` is declared on the `Provenance` interface at `src/lib/research-os/types.ts:91` and no code in the import path reads or writes it; `sha256` has no declaration and no reader anywhere in `src/` or `scripts/`. Row-level security is owner-only, `select using (auth.uid() = owner_id)` at `:88`, and `GET /api/research-os/loop` counts a learner's own rows at `src/app/api/research-os/loop/route.ts:41`.

### The write

`createImport` at `src/lib/research-os/access-db.ts:295` takes a kind, a title and an optional `source` object, and writes two rows. The node first, `:389-401`:

```ts
      title: input.title,
      kind: input.kind === "paper" ? "primary_source" : "artifact",
      tier: 0,
      branch: "00-imports",
      summary: fetched ? fetched.text.slice(0, SUMMARY_CHARS) : null,
      worked_example: fetched ? { text: fetched.text, source: url } : null,
      provenance: { type: "import", kind: input.kind, ...(input.source ?? {}), ... },
      created_by: ownerId,
      owner_id: ownerId,
      visibility: "private",
```

Then the import row at `:406`, carrying `source: input.source ?? {}` unchanged. The route is `POST /api/research-os/access` with `action: "import"`, and its whole validation is one line at `src/app/api/research-os/access/route.ts:118`: the kind must be one of the four and the title must be non-empty, trimmed and cut to 200 characters. `source` is passed through untouched.

Three consequences follow from those lines, and all three matter later.

The fetched text lands in `worked_example`. That field is typed in `src/lib/research-os/types.ts` as a short model explanation of a node's own idea; here it holds up to 6,000 characters of somebody else's prose. Every reader of `worked_example` now has two shapes to expect.

`provenance` spreads `input.source` after `type` and `kind`, so a learner who posts `{"source": {"type": "canon_entry"}}` overwrites `type: "import"` on their own node. One SQL allowlist reads that field, `graph.idea_dependents` at `supabase/migrations/20260918020000_research_os_prime_decompose_review.sql:80`, and it also filters `n.kind in ('concept', 'law', 'derivation')` at `:79`. An import is written as `primary_source` or `artifact`, so it cannot reach that count today. The hazard is latent today and sits one `kind` change away from being live.

The node is `visibility: "private"` at `:238`, so `graph.nodes`'s `visible_select` policy at `supabase/migrations/20260915000000_research_os_access.sql:99-103` keeps it to the owner and any grantee. Sharing an import is an explicit act by its owner.

### The fetch

`fetchTextFromUrl` at `src/lib/research-os/import-fetch.ts:69` is the only network call in the path. It is already careful in four ways.

| Control | Value | Where |
|---|---|---|
| Scheme and host allowlist | http and https, no loopback, link-local, private range, or bracketed IPv6 | `isPublicHttpUrl`, `src/lib/research-os/import-fetch.ts:6`, with the literal checks at `:24`, `:27` and `:29` |
| Wall-clock bound | 8,000 ms through an `AbortController` | `TIMEOUT_MS`, `src/lib/research-os/import-fetch.ts:2` |
| Byte bound | 1,000,000 bytes read, 6,000 characters kept | `MAX_BYTES` at `src/lib/research-os/import-fetch.ts:9`, `EXCERPT_CHARS` at `:11` |
| Content-type allowlist | `text/html`, `text/plain`, `application/xhtml` only | `src/lib/research-os/import-fetch.ts:62` |

It identifies itself. `src/lib/research-os/import-fetch.ts:59` sends `"user-agent": "bucket-foundation-research-os/1 (+https://www.bucket.foundation)"`, a name and a contact URL. `htmlToText` at `src/lib/research-os/import-fetch.ts:34` strips scripts, styles and comments before tags, which keeps script bodies out of the stored text. `scripts/test-research-os-import-fetch.ts` covers both exported pure functions, and its host cases at `:10-15` are the ones that matter: `localhost`, `127.0.0.1`, `10.0.0.5`, `192.168.1.1`, `169.254.169.254` and `[::1]` all return false.

Four things it does not do.

**Redirects are followed without re-checking the host.** `src/lib/research-os/import-fetch.ts:59` passes `redirect: "follow"`, and `isPublicHttpUrl` ran once at `:55` against the URL the learner typed. A public URL that answers `302` with a `Location` of `http://169.254.169.254/latest/meta-data/` is fetched. The host allowlist guards the first hop alone.

**Nothing reads the origin's `robots.txt`.** The repository serves its own at `src/app/robots.ts` and reads nobody else's.

**The byte cap truncates rather than refuses.** `src/lib/research-os/import-fetch.ts:79` slices the buffer at `MAX_BYTES` and parses whatever that produced, so a 4 MB page yields the first megabyte cut mid-tag. The text is then cut again to 6,000 characters at `:67`.

**Nothing is fetched twice.** `provenance.fetched_at` is stamped once in `createImport` and no job re-reads the URL, so a source that changes, moves or dies leaves the node holding a copy nobody has compared to anything since.

## The nearest neighbour

PR #196 on `feat/ros-ai-receipts` adds the identity and revision of a quoted span. `curatedSourceId` in that branch's `src/lib/research-os/quote-receipt.ts` returns `graph:<uuid>`, described in its own comment as "a source identity that survives a slug rename", and `curatedSourceRevision` hashes `{ v, nodeId, text, locator, citation }`. The file's header states the intent: "A passage edited later produces a different revision, so a receipt says which version was quoted rather than pointing at whatever the node holds now."

That branch's `graph.source_quote_receipts` already reserves room for this work. The comment at lines 19 to 21 of its migration, `20260921030000_research_os_quote_receipts.sql` on that branch, reads: "The curated slice quotes a source node and records it as its own target; the imported-passage slice passes the learner's research target instead."

An imported passage differs from a curated one on two axes, and both have consequences.

**Who can change the text.** A curated passage lives in `PASSAGES` at `src/lib/research-os/passages.ts:9`, a table in this repository, and its file header says every entry "was checked against the live source at the URL given, character for character, before being added here". A revision change on a curated source is a Bucket edit, visible in a diff, attributable to a commit. An imported passage lives on someone else's server. A revision change is a fact about the world that Bucket learns late or never.

**What a revision change means for a citation.** For a curated source, the old revision still exists in git, so a receipt naming it can always be resolved. For an imported source, the old revision may be gone. The receipt's `text_hash`, line 31 of that migration, then proves what the learner read and proves nothing about what a later reader will find.

So an import needs one field a curated source does without: a record of where the old bytes can still be reached, or a statement that they cannot.

## What may be imported

The four kinds in the check constraint stay. The rules below are what the door enforces, and each is something code can decide.

| Rule | Decision |
|---|---|
| Scheme and host | `isPublicHttpUrl` as written, applied to every hop of a redirect chain rather than the first |
| Redirect depth | At most five hops, each re-checked, and a chain that leaves the registrable domain of the URL the learner typed is recorded on the node rather than followed silently |
| Content type | The current allowlist, plus `application/pdf` behind a text extractor, and a refusal for everything else |
| Size | Refuse above `MAX_BYTES` rather than truncate. A page that does not fit is a fetch failure with a reason, and the import survives as a title and a link |
| Rate | One fetch per import at creation, and a re-fetch job bounded per origin |
| Identity | A source with a DOI is resolved through the DOI before the URL is tried |

What is refused at the door: a non-public host at any hop, a content type outside the allowlist, a body over the cap, and a URL the learner cannot name a purpose for. The first three are mechanical. The fourth is a product choice and it is in the open questions.

Two refusals look tempting and are wrong. Refusing on `robots.txt` at import time would refuse a learner a page their own browser would show them; RFC 9309 governs "automatic clients known as crawlers" (§1), and a learner pressing import is a person. Refusing on licence at import time would stop a learner reading anything restrictive, which defeats the point of teaching them to read a hard source. Both belong at the sharing boundary, where the rights rules below put them.

## Rights

The sharpest section, and the one with the most founder decisions in it. The frame below separates four questions the code confuses today, because `createImport` writes one row that answers all four the same way.

**What a learner may import.** Anything they can lawfully read. A learner holding no licence to a paywalled paper may still import a page they have access to, and Bucket does not adjudicate that access. This is the status quo and it is right: the node is private, owned, and readable only by them and their grantees.

**What the graph may store.** Today it stores 6,000 characters of fetched text in `worked_example` and 600 in `summary`, plus whatever `source` carried. The proposal narrows this by purpose rather than by length. The graph stores, for every import: the normalised URL, the fetch datetime, a `sha256` of the fetched bytes, the response content type, and the metadata the source declares. It stores the text itself only as the material a Quote call can rehydrate a span from, and marks it so.

**What it may show another learner.** Nothing of the stored text, unless one of two things holds: the import carries a recorded licence that permits redistribution, or the span leaving the node is a quotation a person selected and a locator identifies. A share of an import with no recorded licence shares the pointer, the metadata and the hash. The receiving learner sees what the source is and fetches it themselves.

This is the rule the code can check. An import's `source.license` is currently written by nobody and read by nobody. The proposal makes it a recorded field with three states: a licence the learner named, a licence the fetch found, and unknown. Unknown is the default and it is restrictive: an import at unknown licence may be shared as a pointer and never as text.

**What a citation over x402 may carry.** `src/lib/feed402-client.ts:22` defines `CitationSource` with `source_id`, `provider`, `retrieved_at`, an optional `license` at `:27` and an optional `canonical_url` at `:28`. Those four fields are exactly the pointer-shaped citation an unlicensed import can produce. The envelope's optional `snippet` is the field that must stay empty for an import at unknown licence.

`PROTOCOL.md` §4.2 requires `sha256` on a sidecar and says it "must match the hash of `paper.<ext>`", and §4.1's schema carries `source.url` and `source.license`. An import that records its bytes' hash is already sidecar-shaped. What `PROTOCOL.md` does not do is say what happens when the bytes are not Bucket's to redistribute: §4.3 grades a record by `canon_tier` and states the tiers are "advisory", and the word licence appears three times in the document, twice as a field value. The protocol has no rights model. That gap is the founder's, and it is question 1 below.

## Identity

A citation must survive the page changing under it. Three identifiers, in order of preference, each computable.

**`doi:<doi>`.** A DOI resolves through `doi.org`, which the Crossref documentation describes as an API that "determines which registration agency holds the metadata and redirects the request". Content negotiation against that host returns metadata in a declared type, `application/vnd.citationstyles.csl+json` among them for Crossref, and `application/vnd.datacite.datacite+json` among DataCite's ten, served from `https://data.crosscite.org`. An import that carries a DOI takes its identity and its metadata from there, and the URL becomes one more thing the record says rather than the thing the record is.

**`url:<normalised>@<sha256>`.** Without a DOI, the identity is the normalised URL plus the hash of the bytes that came back. Two learners importing the same page on the same day get the same identity. One importing it after an edit gets a different one, which is correct: they are holding different text.

**`graph:<uuid>`.** The fallback for an import with no URL at all, a file or a learner's own notes. This is `curatedSourceId`'s shape from the receipts branch, and using it here says the same thing it says there: this source exists because Bucket holds it.

The identity goes in `source_id` on `graph.source_quote_receipts`, line 24 of that migration, which is already `text` and already unconstrained, so no migration is needed to carry it.

## Revision

For a curated source, `curatedSourceRevision` hashes the span, the locator and the citation, and a change means an editor changed something. For an imported source the revision is the `sha256` of the fetched bytes and the datetime they were fetched. A change means the world changed, and the two events need different handling.

**A curated revision change invalidates nothing.** The old text is in git.

**An imported revision change invalidates nothing either, and it must be visible.** The receipt says what the learner read. The node says what the URL returns now. When they differ, both are true and the learner is told. A citation is not withdrawn because its source was edited; it is annotated with the date it was read, which is what the style manuals already require of a human writer.

Chicago's own 18th-edition guidance for a web source, in the publisher's free citation quick guide, is: "If a source does not list a date of publication or revision, include an access date." The Council of Science Editors asks for the same pair in its quick guide for the 9th edition of *The CSE Manual*, "a date of update/revision (if available) along with a URL", and an access date "if no date of publication or update is available". Both manuals treat the access date as the fallback when the source will not date itself. Research OS holds both dates for every import already, so the citation it emits can carry what a journal would ask a human for.

Where the old bytes can still be reached is a separate field, and there is a standard for it. Memento, RFC 7089, defines an Original Resource as "a resource that exists or used to exist, and for which access to one of its prior states may be required" (§1.1), a Memento as "a resource that encapsulates a prior state of the Original Resource" (§1.1), and a TimeGate as a resource "capable of datetime negotiation to support access to prior states" (§1.1). Datetime negotiation runs on the `Accept-Datetime` request header and the `Memento-Datetime` response header, §2.1.1. An import records a `timegate_url` when the origin advertises one, and a citation to a changed source carries the fetch datetime, which is exactly the value a reader needs to ask a TimeGate for the state that was read.

Whether Bucket should itself push a copy to a public archive at import time is a rights question, and it is question 3.

## The trust boundary

An import is learner-supplied input that reaches a model and a database. Five rules, each checkable.

**Every redirect hop is re-checked.** `isPublicHttpUrl` runs per hop, with `redirect: "manual"` and an explicit loop, capped at five. This closes the hole at `src/lib/research-os/import-fetch.ts:59`. A test mirrors the host cases already in `scripts/test-research-os-import-fetch.ts:10-15`, with each asserted as a redirect target rather than an entry point.

**`source` is parsed key by key.** `createImport` at `src/lib/research-os/access-db.ts:235` takes named keys from `input.source` and builds provenance from them. A key the schema does not name is dropped. This removes the `type` overwrite described above and makes the `source` comment at `supabase/migrations/20260915000000_research_os_access.sql:80` true.

**Fetched text is marked as untrusted where it is stored.** The 6,000 characters now written to `worked_example` at `src/lib/research-os/access-db.ts:234` move to a field of their own, so a reader of `worked_example` gets an authored explanation and nothing else. Any prompt that includes imported text labels it as quoted material the model may judge and may not follow, which is the rule `CHECK_SYSTEM_PROMPT` at `src/lib/research-os/grounding.ts:107` already applies to a learner's own explanation.

**Size is a refusal.** Above `MAX_BYTES` the fetch fails with a reason. RFC 9309 sets its own parsing floor for a related case, §2.5: "Crawlers SHOULD impose a parsing limit to protect their systems[...] The parsing limit MUST be at least 500 kibibytes [KiB]." Bucket's 1,000,000-byte read is already above that floor; what changes is refusing rather than truncating.

**The re-fetch job honours `robots.txt`.** The first fetch is a learner's own action. A scheduled re-fetch is a crawl, and RFC 9309 applies to it. The rules it sets are usable as written: §2.3.1.4 says that an unreachable `robots.txt` means "the crawler MUST assume complete disallow", §2.4 says a crawler "SHOULD NOT use the cached version for more than 24 hours", and §3 says the protocol "is not a substitute for valid content security measures". That last sentence is why `robots.txt` never appears in the rights section: it governs politeness and says nothing about a licence. RFC 9309 also states at §1 that these rules "are not a form of access authorization".

## How an import becomes a node

It already is one. `createImport` at `src/lib/research-os/access-db.ts:253` writes a `graph.nodes` row whose `branch` is `00-imports` at `src/lib/research-os/access-db.ts:232` and whose `visibility` is `private` at `:238`. `learning/research-os/ACCESS.md` states the intent in its model section: an import "creates a private node in branch `00-imports` owned by them".

The open move is promotion: private to public, `00-imports` to a real branch. The rule is the one the graph already uses for a learner's own work.

**An owner can share an import and cannot publish one.** Sharing is a grant under `graph.node_grants`, which `ACCESS.md` already covers, and it carries the text only under the licence rule above. Publishing moves a node into a branch other people route through, and that is a reviewer decision, gated by `verifyGraphReviewer` at `src/lib/research-os/reviewer.ts`, the same gate `POST /api/research-os/edges` uses to let a proposed edge into `graph.edges`.

**A published import is a pointer with metadata.** The node that becomes public carries the identity, the metadata, the fetch datetime, the hash and the licence. The stored text stays on the private original unless the licence permits otherwise. A learner routing through the public node gets a citation they can resolve and fetches the source themselves, which is what a bibliography does.

**An import is never a canon node.** `learning/research-os/TRUTH-TIERS.md` proposes a `footing` on every node; an imported node starts ungraded and a promotion decides a footing the same way any other node gets one. Nothing about importing a paper makes its claims established.

## What a learner sees when it breaks

Four states, and a learner sees which one they are in.

| State | How it is detected | What the learner sees |
|---|---|---|
| Never fetched | `provenance.fetched_at` absent, which is what `createImport` writes when `fetchTextFromUrl` returns null | The title and the link, labelled as not read. Quote is unavailable on this node |
| Fetch failed | The re-fetch job records a status and a reason | The last good excerpt, its fetch datetime, and the reason the newest attempt failed |
| Moved | A hop left the registrable domain, or the origin answered 404 or 410 | The recorded identity, the new location if there was one, and a prompt to confirm it is the same work |
| Changed | The new `sha256` differs from the recorded one | Both datetimes, and, for every span the learner has quoted, whether that span is still present in the new text |

The last row is the one that earns the design. A receipt carries `text_hash`, line 31 of that migration,, so a re-fetch can answer a narrow question: does the quoted span still appear? A span that survives an edit needs no notice. A span that vanished is the case a learner citing that source has to know about, and today nothing would tell them.

Silence is the wrong default here for the same reason `hasUnverifiedSource` at `src/lib/research-os/production-guard.ts` blocks an accept: a citation nobody can check is worse than a missing one.

## Open questions for the founder

| # | Question | Why it is yours |
|---|---|---|
| 1 | May Bucket store a full fetched copy of a source it holds no licence to, or only an excerpt and a hash? The code stores 6,000 characters today and nobody decided that number. | It sets Bucket's exposure and it is a legal posture, which a memo cannot pick. |
| 2 | What may a citation over x402 carry from an unlicensed import? This memo proposes the pointer, the metadata and the hash, with `snippet` empty. A stricter answer is that an unlicensed import produces no priced citation at all. | `PROTOCOL.md` has no rights model, and the answer changes what the protocol promises a buyer. |
| 3 | Should Bucket push an imported URL to a public web archive at import time, so a later reader can reach the state that was read? It makes citations durable and it republishes someone else's page. | It is a redistribution decision with a running cost. |
| 4 | Does a citation to an import pay anyone? The cite-forever rail routes a fee to an author. The author of an imported paper has no wallet in Bucket and did not consent. | Paying out on work Bucket holds no rights to is a governance decision, and the schema follows whatever you decide. |
| 5 | May a learner import from a source that forbids it in its terms of use, and does Bucket check? This memo says Bucket does not adjudicate a learner's own reading, and says nothing about terms of use. | It is the line between a tool and a publisher. |
| 6 | Must a learner state a purpose to import? The door could require it the way `graph.access_requests` already requires a purpose for a grant. | It is a product decision about friction against a teaching goal. |
| 7 | Who may publish an import into a public branch? This memo proposes the graph-reviewer gate. A teacher publishing into their own class region is a plausible middle. | It is the same governance question `TRUTH-TIERS.md` question 3 asks about `established`. |

## Sources

- Koster, M., Illyes, G., Zeller, H., Sassman, L. Robots Exclusion Protocol. RFC 9309, IETF Standards Track, September 2022. Sections 1, 2.3.1.4, 2.4, 2.5 and 3. doi:10.17487/RFC9309
- Van de Sompel, H., Nelson, M., Sanderson, R. HTTP Framework for Time-Based Access to Resource States: Memento. RFC 7089, Independent Submission, Informational, December 2013. Sections 1.1 and 2.1.1. doi:10.17487/RFC7089. Memento is an IETF RFC in the Independent Submission stream rather than a W3C Recommendation.
- The Chicago Manual of Style, 18th edition. Notes and Bibliography citation quick guide, websites and social media, chicagomanualofstyle.org/tools_citationguide/citation-guide-1.html. Section 14.104 covers website citation. Quoted from the publisher's free quick guide; the Manual itself is paywalled and was not read.
- Council of Science Editors. CSE Citation Quick Guide, csemanual.org/Tools/CSE-Citation-Quick-Guide.html, reflecting *The CSE Manual: Scientific Style and Format for Authors, Editors, and Publishers*, 9th edition. Quoted from the free quick guide; the Manual itself is paywalled and was not read. The 9th edition supersedes the 8th.
- Crossref. Content negotiation, crossref.org/documentation/retrieve-metadata/content-negotiation/. The supported types and the doi.org redirect behaviour.
- DataCite. DataCite Content Resolver, support.datacite.org/docs/datacite-content-resolver. The ten supported types and the `data.crosscite.org` host.
- `PROTOCOL.md` in this repository, sections 4.1, 4.2 and 4.3.
- `src/lib/research-os/quote-receipt.ts` and `supabase/migrations/20260921030000_research_os_quote_receipts.sql` on branch `feat/ros-ai-receipts`, PR #196, read at `09324bac3`. Both are unmerged at `083ead80b` and every claim about them is marked as being from that branch.

**Unverified.** Crossref's polite-pool and User-Agent etiquette was not found on either the content-negotiation page or the REST API tips page during this work, so no claim about it appears above. The maximum redirect depth of five and the per-origin re-fetch rate are this memo's proposals and rest on no external standard.
