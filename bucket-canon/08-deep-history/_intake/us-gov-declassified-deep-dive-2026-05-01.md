# US Government Declassified Corpus — Deep Dive (Pass 2) — 2026-05-01

Intake document. Not promoted. Builds on the first-pass sweep at
`_intake/us-gov-declassified-corpus-index-2026-05-01.md` (pass-1) and the
mirror manifest at `bucket-foundation/_intake/gov-declassified/2026-05-01/INDEX.md`.
Pass-1 inventoried the archives and proposed a three-tier filing rule; pass-2
goes a level deeper into the highest-leverage targets, builds an
engineering-grade ingest spec for the two archives that actually deserve one,
fixes pass-1's misses, and answers the only operational question that matters:
**if Bucket can ingest exactly one archive in 2026, which one and how**.

Author: data pillar.
Method: re-read pass-1 + INDEX.md + chemistry pass-2 deep dive (style template)
+ MANIFESTO.md; targeted verification via WebFetch and WebSearch against
`history.state.gov`, `github.com/HistoryAtState/frus`, `archives.gov`,
`bundesarchiv.de`, `cia.gov/readingroom`, `archive.org`, NARA ISOO blog,
TEI-C issue tracker, Hoover Institution finding aids.

Bar: match the chemistry pass-2 voice (plain declarative, no AI tells, edition-
of-record specificity, named gaps where unconfirmed). Length is a function of
material, not target. The chemistry deep dive earned ~1000 lines because
chemistry's substantive primary literature warrants it; this corpus is
larger but thinner per-document, so the deep dive is correspondingly more
operational and less doxographic.

---

## 1. FRUS — full operational spec

Pass-1 §3 and §6(a) called Foreign Relations of the United States the highest-
leverage US government archive in the corpus and the easiest to ingest.
Pass-2 confirms both calls and writes the spec.

### 1.1 What FRUS actually is

The *Foreign Relations of the United States* series is the official
documentary record of US foreign policy decisions and significant diplomatic
activity, published by the Office of the Historian inside the State
Department's Bureau of Public Affairs. The series began in 1861 (the Lincoln
administration's "Papers Relating to Foreign Affairs"), was put on a
statutory footing by the Foreign Relations Authorization Act of 1991 (22
U.S.C. § 4351 et seq.), and is the single longest-running official-history
publication program in the United States government.

Volume coverage at the time of writing reaches the Clinton administration
(2000); the 30-year-from-events publication target set by the 1991 statute
is honored in spirit but not always in fact (some recent volumes lag, others
catch up). The series is published as discrete volumes organized by
presidential administration ("administration triennium" in HAC parlance) and
within an administration by a sub-series structure that has been stable since
the Truman volumes:

- **General/strategic** volumes (worldwide foreign policy, national security
  policy, intelligence, foreign economic policy, energy policy)
- **Regional** volumes (Western Europe; Eastern Europe; the Soviet Union;
  China; Japan/Korea; Southeast Asia; South Asia; Near East; Africa;
  American Republics; etc.)
- **Bilateral/crisis** volumes (Cuban Missile Crisis; Vietnam; Berlin Crisis;
  Arab–Israeli Wars; etc.)
- **Conferences** (Yalta, Potsdam, Paris Peace Conference 1919, etc.)
- **Microfiche supplements** (older series; supplementary documentation
  released as microfiche between 1979 and the early 2000s, since being
  retro-digitized into the main HTML/TEI corpus)

Total: approximately 500 volumes spanning 1861–2000, with new
administration-trienniums entering the publication queue on a roughly
30-year schedule.

### 1.2 Editorial pipeline

The pipeline is the part most ingest specs miss because it explains why
documents in the same volume can carry very different evidentiary weight.

1. **Compilation.** A historian inside the Office of the Historian selects
   documents from State Department records (RG 59 at NARA), Presidential
   Library holdings, NSC files, CIA, DoD, and other agency holdings that
   bear on the topic of the volume.
2. **Declassification review.** Selected documents go to the originating
   agencies for declassification review. A document the historian wants but
   the agency will not release becomes one of three things: (a) released
   in full; (b) released with redactions, marked in the FRUS text by the
   convention `[text not declassified]` or, less commonly, by the
   bracketed note giving the number of withheld words/lines; (c) withheld
   entirely, in which case the volume's editorial note records the gap.
3. **HAC review.** The Historical Advisory Committee — a statutorily
   chartered nine-member panel of historians and political scientists —
   reviews each volume for completeness and accuracy ("thorough,
   accurate, and reliable" is the statutory standard; see 22 U.S.C.
   § 4351(a)). The HAC reports annually; its reports are themselves a
   secondary primary source on what got pulled.
4. **Publication.** Volumes are published in print (GPO), as HTML at
   `history.state.gov/historicaldocuments/<volume-id>`, as PDF, and as
   EPUB/MOBI ebooks. The TEI source is committed to the public GitHub
   repository `HistoryAtState/frus` simultaneously.

The redaction marker matters for ingest. `[text not declassified]` is not
metadata — it is inline text in the published volume, and downstream
re-releases sometimes overwrite the redaction with the recovered text
without revising the surrounding apparatus. A serious ingest must preserve
the marker as a structured token, not lossily strip it.

### 1.3 Technical surface — verified

- **Source repo**: `github.com/HistoryAtState/frus`. Public domain. One
  XML file per volume in `volumes/`. Volume naming convention:
  `frus<ADMIN_YEARS>v<VOL>[p<PART>]`, e.g. `frus1969-76v19p1` = Nixon-Ford
  triennium, Volume XIX, Part 1. Element identifiers use `@xml:id`
  attributes (`d176` = Document 176, `ch1` = Chapter 1). Identifiers are
  declared canonical and stable post-release for volumes and documents;
  person and term identifiers (entity layer) are explicitly *not*
  guaranteed stable.
- **Schema**: TEI P5 with project-specific customizations defined in an
  ODD file plus Schematron and RelaxNG schemas in `schema/`. Conformance
  is enforceable, not aspirational — the repo's CI validates.
- **Catalog API**: OPDS-formatted REST catalog at
  `history.state.gov/developer/catalog`. Atom XML over HTTP, no auth, no
  rate-limit documented (treat as polite-crawl). Returns ebook download
  URLs (PDF/EPUB/MOBI) and cover images. Suitable for a production
  bibliographic mirror; not suitable as the primary text source (the
  ebooks are derived from the TEI).
- **Resolved document URL pattern**:
  `https://history.state.gov/historicaldocuments/{VOLUME_ID}/{ELEMENT_ID}`.
  Stable. This is the citation-target URL.
- **Server-side stack** (informational, not load-bearing for ingest): the
  Office of the Historian publishes via eXist-db with XQuery 3.0
  transforms. None of that matters to a downstream consumer; the GitHub
  TEI source is the contract.
- **License**: US government work, public domain, no attribution
  requirement (citation requested as a courtesy).
- **Update cadence**: irregular per-volume. New volumes are pushed to the
  GitHub repo as they pass HAC sign-off and declassification clearance —
  typically 3–8 volumes per calendar year. The OPDS catalog updates on
  publication.

### 1.4 TEI elements that carry the substantive content

A FRUS volume's TEI tree is large but the substantive content sits in a
small set of elements. For ingest the load-bearing ones are:

- `<TEI>/<teiHeader>` — volume metadata. Inside it, `<fileDesc>` carries
  the title, editor, publication info; `<profileDesc>` carries dating
  ranges, languages, document classifications. **Treat as authoritative
  bibliographic source.**
- `<TEI>/<text>/<front>` — front matter (preface, list of documents,
  list of names, list of abbreviations, sources note). The list of
  sources note is operationally critical: it tells you which RG/agency
  files the volume was compiled from, which is the bridge to NARA
  Catalog (§2).
- `<TEI>/<text>/<body>/<div type="document">` — the document containers.
  Each carries `@xml:id="dN"` where N is the document number. This is
  **the unit of ingest**.
- Inside each document `<div>`:
  - `<head>` — the document headline (e.g. "Telegram From the Embassy
    in the Soviet Union to the Department of State")
  - `<dateline>` — the date and place of origin
  - `<opener>` — addressee, classification line, subject line
  - `<p>` — the paragraphs of the document body
  - `<note>` — editorial footnotes (the FRUS editor's apparatus —
    cross-references, source citations, contextual notes). These are
    canonical secondary content; they carry the historian's
    interpretive scaffolding and should be preserved as first-class.
  - `<gap reason="redaction">` and inline `[text not declassified]` —
    the redaction markers. The TEI standard recommends `<gap>` for
    censorship/redaction (TEI-C issue #2421 is the canonical
    discussion); FRUS's actual practice mixes `<gap>` and inline
    bracketed text. Ingest must handle both.
- `<TEI>/<text>/<back>` — back matter (index, list of persons, list of
  short titles). The `<listPerson>` and `<listOrg>` entries are the
  controlled-vocabulary entity layer; pass-1 missed that this exists at
  all. Useful for cross-volume entity disambiguation.

### 1.5 Concrete ingest spec

The minimum viable FRUS ingest is a single weekend's work. The
production-grade ingest is two weeks. Both fit Bucket.

**Citation key format (recommended):** `frus.<admin>.<volume>[.<part>].<doc>`,
e.g. `frus.1961-63.v11.d176` for FRUS 1961–63 Vol. XI ("Cuban Missile Crisis
and Aftermath") Document 176. Rationale: matches the GitHub volume naming
exactly except dotted, sortable, URL-safe, deterministic. Stable across
re-releases because the underlying volume + document IDs are guaranteed
stable.

**Pipeline (minimum viable):**

1. `git clone https://github.com/HistoryAtState/frus` — gets the entire
   ~500-volume corpus as TEI XML. ~1.5 GB checkout (estimate; verify on
   first clone).
2. For each `volumes/frus*.xml`:
   - Parse the `<teiHeader>` into a `volume` row (volume_id, title,
     editor, pub_year, admin_triennium, sub_series, source_collections).
   - Walk `<body>//div[@type='document']` and emit one `document` row
     per element (citation_key, volume_id, doc_number, headline, date,
     origin, addressee, classification, body_text, footnotes_jsonb,
     redactions_jsonb, source_url).
   - Normalize redactions: `<gap reason="redaction">` → `{type:
     "structured", words_omitted: <n if available>}`; inline
     `[text not declassified]` → `{type: "inline_marker", offset: <n>}`.
     Never strip; never silently fold into surrounding text.
3. Emit a `frus_index.jsonl` (one line per document) for downstream
   indexing. ~250k–400k documents total across the series (estimate based
   on average ~500–800 documents per volume × ~500 volumes; verify on
   first run, do not assume).
4. Mirror the canonical PDF per volume from `history.state.gov` to
   `gdrive:AGFarms/Nucleus/research/frus-canon/<admin-triennium>/`.
   Idempotent; resume on next run.

**Production-grade additions:**

- Cross-link `<note>` source citations into the document graph
  (footnote → cited document, where the cited document is in the same
  volume or another FRUS volume — the FRUS editorial apparatus uses
  short-form citations that resolve cleanly).
- Build the entity graph from `<listPerson>` and `<listOrg>` (back
  matter). Person IDs are not stable across volumes per the repo's own
  README, so deduplicate by (name, dates) and treat the back-matter ID
  as a within-volume key only.
- Mirror to Walrus on-chain storage (Bucket's existing stack per
  MANIFESTO §3) at the volume level, content-addressed by the SHA-256
  of the canonical TEI XML. Each FRUS volume becomes one Walrus blob;
  each document becomes a Story Protocol IP NFT child of the volume IP
  parent. This is the natural fit between FRUS and Bucket's stack.
- Surface via Bucket's Supabase as a `frus_documents` table with full-
  text search on body + footnotes; cite via the resolved
  `history.state.gov` URL plus the IP NFT ID.

**What NOT to do:**

- Do not reformat the TEI. The TEI source is the contract.
- Do not flatten footnotes into body. They are independent epistemic
  objects.
- Do not try to mirror the OPDS-served EPUB/PDF as the primary form;
  they are derived. The TEI is canonical.
- Do not attempt OCR; FRUS is born-digital downstream of the historian's
  transcription. (Pre-1990 source documents are typewritten or
  handwritten; FRUS publishes the historian's transcription, not the
  scan. Where an image of the original exists it is referenced by URL
  in the editorial apparatus, not embedded.)

### 1.6 Why FRUS is the highest-leverage target

It is the only US government archive in the entire corpus that is:

- Born-machine-readable (TEI, not scanned-PDF-with-OCR).
- Versioned in public Git.
- Carries an explicit, statutorily mandated quality bar (HAC review).
- Carries a controlled-vocabulary entity layer.
- Carries an explicit redaction-encoding convention.
- Public domain, no API key, no rate limit, no auth.
- Bounded — ~500 volumes is a finite ingest, not an open-ended scrape.
- Citationally clean — every document has a canonical URL and a
  canonical key.

Nothing else in the corpus comes close on more than two of these
dimensions. CREST is large but is scanned-PDF; NARA Catalog is huge but
is mostly description-only; the Wilson Center is curated but has no
public API. FRUS is the only one where the gap between "intake" and
"citable canon-adjacent reference" is a single git clone.

---

## 2. NARA Catalog API — full operational spec

Pass-1 §3 ranked NARA Catalog as the second-highest-leverage target.
Pass-2 confirms but qualifies sharply: **most of NARA's holdings are
described in the catalog but not digitized**, which changes the ingest
math. The bounded sub-collection — JFK Records — is where to start.

### 2.1 What NARA Catalog actually is

The National Archives Catalog at `catalog.archives.gov` is the master
discovery index for all NARA holdings. It indexes records at three
hierarchical levels:

- **Record Group (RG)** — top-level organizational unit. Examples
  relevant here: RG 59 (State Department), RG 226 (Office of Strategic
  Services), RG 263 (CIA records held by NARA), RG 272 (President's
  Commission on the Assassination of President Kennedy — the Warren
  Commission), RG 457 (NSA records held by NARA, the SRH/SRMD/SRMN
  series). Pass-1 listed several of these by name; pass-2 confirms the
  structure is stable and is the right level to mount an ingest at.
- **Series** — a bounded set of records within a RG, defined by the
  agency's own filing scheme (e.g. RG 59 → Central Foreign Policy
  Files 1973–1979).
- **File Unit** — a folder within a series.
- **Item** — a single document, photograph, or other record.

The OBJECT vs FILE_UNIT vs ITEM distinction in the API is the
machine-readable expression of this hierarchy: an OBJECT is a digital
asset (PDF, JPG, MP4); a FILE_UNIT is the descriptive container at the
folder level; an ITEM is the descriptive container at the document
level. A single file unit can have zero, one, or many objects attached;
a single item can have zero, one, or many objects attached.

**The critical operational fact:** as of the pass-2 sweep, the catalog
records description-level metadata for hundreds of millions of items,
but only a fraction of those items have an associated OBJECT (a digital
scan). Exact percentage unconfirmed; the API documentation does not
publish the digitized:described ratio. Working assumption: under 20% of
indexed items are digitized, with massive variance by collection (JFK
Records is now near-100% digitized post-2025; Founders Online is 100%
digitized; mid-century operational records of most agencies are <10%
digitized). **An ingest plan that does not condition on this ratio will
generate empty bibliographic shells.**

### 2.2 Verified API surface

- **Base URL**: `https://catalog.archives.gov/api/v2/`.
- **Auth**: API key required for all requests. Procurement: email
  `Catalog_API@nara.gov`. Two key types: read-only (default; immediate)
  and read/write (requires NARA Catalog user account; longer turnaround,
  unconfirmed but likely 1–2 weeks).
- **Rate limits**: 10,000 queries/month per key (default); 150,000/mo
  for researchers; 1.5M/mo for partners; unlimited for staff. The
  default tier is sufficient for steady-state lookups but not for bulk
  ingest. Bulk ingest goes through the AWS Open Data path, not the API.
- **Query model**: OpenSearch-style. Keyword search across any field,
  range queries, custom sort, field selection, combined refinements.
  Response is JSON only.
- **Identifiers**: NAID (National Archives Identifier) — a stable
  integer assigned to every described record at every level of the
  hierarchy. Citation-grade; never recycled per NARA practice.
- **Bulk export**: Hosted on the AWS Registry of Open Data as the
  `nara-national-archives-catalog` dataset (S3 bucket; the public bucket
  name is unconfirmed in the search results, must verify before use).
  Direct bulk scraping of the catalog UI is explicitly prohibited —
  bulk consumers go through the AWS path.
- **Open-source tooling**: `github.com/usnationalarchives/Catalog-API`
  (server source) and Python helper scripts in NARA's GitHub org for
  bulk metadata pulls.

### 2.3 The JFK Records Collection — concrete bounded ingest plan

The JFK Records Collection is the right NARA sub-collection to mount a
first ingest against because it is bounded (~6M pages total), high-
signal, post-2025 nearly fully digitized, and has a real political-
historical ceiling on its growth. RG 272 (Warren Commission records) is
the original spine; the Assassination Records Review Board (ARRB)
collection mandated by the 1992 JFK Records Act adds CIA, FBI, NSA, and
DoD records that were folded into a unified "JFK Collection" addressable
by NARA.

**Verified release waves:**

- **March 18, 2025, 7 PM EST**: 32,000 pp in 1,123 PDFs.
- **March 18, 2025, 10:30 PM EST**: 31,400 pp in 1,059 PDFs.
- **March 20, 2025, 9:30 PM EST**: 13,700 pp in 161 PDFs.
- **March 26, 2025, 3:30 PM EST**: 53 pp in 16 PDFs.
- **April 3, 2025, 7:00 PM EST**: 704 pp in 207 PDFs.
- **January 30, 2026**: 11,022 pp in 140 PDFs (per pass-1; verify
  against current NARA release page).

Total fresh release 2025–2026: ~89,000 pp in ~2,700 PDFs on top of the
pre-2025 collection. The 2025 release is the largest single-year
declassification in the collection's history.

**Bounded ingest plan:**

1. NAID-walk the JFK Collection: query
   `/api/v2/records/search?ancestor.naid=<jfk-collection-naid>&type=item`
   with pagination. Verify the collection NAID before starting; do not
   assume. The query yields the item-level descriptive metadata for
   every record in the collection.
2. For items with `objects` populated, download the PDF; for items
   without objects, skip and log to `non_digitized.jsonl` for tracking.
3. OCR is unnecessary; the post-2017 release waves are OCR'd by NARA
   before publication. Verify per-PDF; fall back to local OCR
   (`tesseract` or `ocrmypdf`) for the ~5% that aren't.
4. Index into Supabase as `nara_jfk_documents` with NAID as primary key,
   plus a `text` column for the OCR'd body and `metadata` JSONB for the
   descriptive record. Citation key format:
   `nara.jfk.<NAID>` (NAID alone is sufficient because NAIDs are
   globally unique within NARA).
5. Mirror PDFs to `gdrive:AGFarms/Nucleus/research/nara-jfk/<release-
   wave>/` for durable cite-to-PDF.
6. **Important hygiene step:** the March 2025 release exposed live
   Social Security numbers of former CIA and Secret Service staffers
   (pass-1 §1 NARA flagged this). Any Bucket-side full-text search must
   include a redaction pass for SSN patterns (`\d{3}-\d{2}-\d{4}`)
   before any document is exposed via Bucket's public surface. Do this
   at ingest, not at query time. Treat as a Tier-A discipline rule
   (§5 below).

**Time estimate:** end-to-end ingest of the full 6M-page JFK Collection
into Supabase + gdrive mirror, single engineer: 4–6 weeks. Ingest of
just the 2025–2026 release waves (~89k pp): one week.

### 2.4 Other RG-level sub-collections worth knowing

- **RG 59** (State Department, Central Foreign Policy Files 1973–
  present). The largest single agency RG at NARA. Most of it is
  described, much of the post-1973 cable traffic (the Access to Archival
  Databases / AAD subset) is digitized. Heavy overlap with FRUS at the
  document level (FRUS pulls heavily from RG 59).
- **RG 226** (OSS records, ~7M pp). Partially digitized; much
  re-mounted on Fold3 (subscription, Ancestry-owned).
- **RG 263** (CIA records held by NARA — distinct from the CREST
  collection on cia.gov, though there is overlap). Includes the Nazi
  War Crimes Disclosure Act releases (from 1998).
- **RG 272** (Warren Commission). The original 26-volume Hearings and
  Exhibits plus internal staff working files. Spine of the JFK
  Collection.
- **RG 457** (NSA records held by NARA — the SRH/SRMD/SRMN cryptologic
  series). VENONA decrypts and Friedman papers also live here in
  parallel to the NSA-side releases.

### 2.5 Honest assessment vs FRUS

NARA Catalog is bigger but is structurally messier and most of it is
not digitized. The API tier is real and usable, but the bulk-ingest
path goes through AWS Open Data and is operationally less clean than
`git clone HistoryAtState/frus`. **FRUS first; NARA JFK second; broader
NARA RG-level ingests deferred until both are shipping.**

---

## 3. CIA CREST — what's actually in the 13M pages

Pass-1 §1 (CIA) noted CREST as ~930k documents / ~13M pages, mirrored
at `archive.org/details/CIA-CREST` from a 2016 snapshot. Pass-2 names
the sub-collections worth prioritizing.

The CREST collection is the body of CIA records declassified under the
EO 12958 25-year automatic-review program. It originally lived on four
standalone terminals at NARA II (College Park) until the 2017 online
release that followed a multi-year MuckRock / National Security
Counselors FOIA suit (Emma Best, Kel McClanahan).

Since the 2017 release, CREST has been progressively re-organized on
`cia.gov/readingroom`. The original "CREST" container is now mostly
dispersed into named topical sub-collections; the Reading Room search
queries across all of them.

### 3.1 Named sub-collections worth knowing

These are the high-signal ones; the rest is operational paperwork that
matters for a researcher with a specific question and very little
otherwise.

- **National Intelligence Estimates (NIE) on the Soviet Union and
  International Communism.** The agency's flagship analytic product,
  released across the declassification waves of the 1990s and 2000s.
  Several hundred NIEs covering 1947–1991. Substantive, citable. The
  closest thing in CREST to canon-adjacent material — long-form
  analytic reasoning on bounded subjects.
- **National Intelligence Council (NIC) Collection.** Successor body
  to the NIE program; long-form analytic products from the 1980s
  forward.
- **President's Daily Brief 1961–1969** (Kennedy through Johnson) and
  **President's Daily Brief 1969–1977** (Nixon through Ford). The PDB
  is the daily intelligence summary delivered to the President; the
  released runs are partial but substantial. The Kennedy PDBs are the
  successor product to the President's Intelligence Checklist (PICL),
  first delivered 17 June 1961. (The post-Ford PDBs remain mostly
  classified; expect rolling future releases on the 25-year clock.)
- **STARGATE.** The remote-viewing program, ~12,000 pp released
  January 2017 in the CREST drop. The documents are an interesting
  record of what an agency spent ~$20M on; the program produced no
  operationally actionable intelligence. Pass-1 called this correctly:
  the secondary literature is credulous; the primary documents are
  dull.
- **CIA Family Jewels** (702 pp, released 2007). The internal report
  that surfaced what the Church Committee then investigated in public.
- **MKULTRA fragment** (~20,000 pp; surviving fragment found 1977 in
  financial-records storage after Helms's destruction order). Mostly
  contracts, expense reports, dosing protocols. Pass-1 flagged the
  conspiracy-research-aesthetic problem here; pass-2 affirms — the
  documents are administratively damning, not narratively explosive.
- **CIA in-house histories.** The Pfeiffer Bay of Pigs volumes
  (Vols. I–IV; Vol. III released 2016 after long withholding); the
  Cullather Operation PBSUCCESS history (Guatemala 1954); the Kirkpatrick
  Inspector General's Survey of the Cuban Operation (declassified 1998).
- **Studies in Intelligence.** The agency's in-house unclassified
  journal; selected articles released. Of interest mainly as a window
  into how the agency thinks about its own work.
- **VENONA-CIA-side releases.** Companion to the NSA VENONA tranche;
  CIA's role in the joint 1995–1996 release.
- **CIA Library / Center for the Study of Intelligence monographs.**
  Includes the in-house *Venona: Soviet Espionage and the American
  Response, 1939–1957* (Benson and Warner, eds.).

### 3.2 What to ignore

- The vast bulk of the field-station operational paperwork (signals
  receipts, expense vouchers, internal personnel matters, routine
  administrative cables) is searchable but rarely citable for any
  Bucket-relevant purpose.
- The UFO/UAP topical pool is high-volume, low-signal.
- The early-Cold-War bulk-cable traffic (1947–1955) is heavy on
  routine reporting, light on analytic value at the document level
  (the analytic value is upstream in the NIEs that summarize it).

### 3.3 Ingest assessment

Pass-1 was right to defer CREST. The ~13M-page PDF corpus is
operationally a different problem from FRUS or the JFK Records: it is
all scanned-PDF-with-OCR-of-variable-quality, the cia.gov surface has
aggressive bot mitigation, and the archive.org mirror is a 2016
snapshot that does not reflect post-2017 additions.

**Recommended sub-collection-only ingest** (if and when CREST attention
is warranted): pull the NIE collection only (~500–800 documents,
bounded, high signal), via the archive.org mirror's S3-style API.
Estimate: one week. Defer the rest indefinitely.

---

## 4. NSA — Friedman Collection + the cryptologic heritage corpus

Pass-1 §4(a) flagged Friedman's *Military Cryptanalysis* I–IV as
future-canon-eligible for `04-information/cryptography/`. Pass-2 makes
the call concrete and writes the citation form.

### 4.1 The Friedman Collection (FOIA case unconfirmed; April 2015 release)

NSA's April 20, 2015 release was approximately 50,000+ pp from William
F. Friedman's personal papers and library, declassified together and
dropped to NARA + the NSA Cryptologic Heritage portal. Pass-1's "~52,000
pages" figure is consistent with the NSA blog announcement on
*Transforming Classification* (April 30, 2015 post). The FOIA case
number cited in pass-1 ("FOIA case 60494") could not be re-verified in
pass-2 — `nsa.gov/...Friedman-Documents/` returned 403 to WebFetch. Flag
as **unconfirmed** pending direct manual fetch.

The collection contains:

- Friedman's own pedagogical works (the *Military Cryptanalysis*
  series, the Riverbank publications from his pre-Army Signal Corps
  Riverbank Laboratories days, internal Signal Intelligence Service
  monographs).
- Friedman's correspondence (with Yardley, Rowlett, Kullback, Sinkov,
  and other early American cryptologic figures).
- Materials Friedman collected from others — Yardley papers, MI-8
  ("Black Chamber") materials Friedman acquired or referenced,
  Rowlett's working files in part.
- Friedman's library proper (cryptologic books and journals from the
  16th century forward; a non-trivial portion of the holdings).

**The pedagogical core — *Military Cryptanalysis* Vols. I–IV.** Written
1938–1941 as Signal Intelligence Service training material under the
title *Military Cryptanalysis*. Reorganized and expanded in the 1950s
under the title *Military Cryptanalytics* (with Lambros D. Callimahos as
co-author from Vol. I onward). The titles are easily confused; pass-1
used "Military Cryptanalysis" correctly for the original four-volume
SIS-era series.

Verified per-volume page counts (from the Internet Archive mirror of
the 2015 release):

- *Military Cryptanalysis*, Part I (Monoalphabetic Substitution Systems
  Using Standard Cipher Alphabets) — page count not recovered in pass-2
  search; Part I is the foundational volume and is on the order of
  ~150 pp.
- *Military Cryptanalysis*, Part II (Simpler Varieties of Polyalphabetic
  Substitution Systems) — page count not recovered.
- *Military Cryptanalysis*, Part III (Simpler Varieties of Aperiodic
  Substitution Systems) — **123 pp**, archive.org item upload date
  2015-09-23.
- *Military Cryptanalysis*, Part IV (Transposition and Fractionating
  Systems) — **156 pp**, archive.org item upload date 2015-09-23.

### 4.2 The cryptography canon-tier call

The pre-Shannon vs Shannon question is settled:

- **Shannon, "Communication Theory of Secrecy Systems," *Bell System
  Technical Journal* 28(4), 656–715, October 1949.** Shannon's paper is
  the mathematical foundation of cryptography (perfect secrecy,
  unicity distance, the information-theoretic framing). Public domain
  via the Shannon-papers Wiley/IEEE re-license; widely mirrored. **This
  is the canon-tier text for `04-information/cryptography/`.** Bar:
  primary statement of the theory by the originator. Edition of record:
  the 1949 BSTJ original; the convenient modern reprint is in *Claude
  Shannon: Collected Papers* (IEEE Press, 1993, eds. Sloane and
  Wyner).
- **Friedman, *Military Cryptanalysis* Vols. I–IV (SIS, 1938–1941;
  declassified 2015 in the NSA Friedman Collection).** Friedman's
  series is canon at a different tier — **pedagogical-primary**, not
  mathematical-foundation. It is the load-bearing systematic
  introduction to classical cryptanalysis (substitution, polyalphabetic,
  aperiodic, transposition) by the practitioner who built American
  cryptanalysis from scratch and trained the people who broke
  PURPLE and contributed materially to ULTRA. **Promote at the
  pedagogical-primary tier**, alongside (not above) Shannon.
  Edition of record: the NSA 2015 release scans, mirrored at
  `archive.org/details/nsa-friedman` and on the NSA Cryptologic
  Heritage portal. Citation key: `nsa.friedman.mc.<vol>` (e.g.
  `nsa.friedman.mc.iii` for Part III). Folder when
  `04-information/cryptography/` is seeded:
  `04-information/cryptography/foundations/` (Shannon) and
  `04-information/cryptography/pedagogical-primary/` (Friedman).
- **Friedman & Callimahos, *Military Cryptanalytics* Vols. I–III**
  (NSA, 1956–1977; declassified in tranches). The expanded
  successor series. Promote with caveats — it is an enlarged and
  partially reorganized version of the SIS *Military Cryptanalysis*,
  not an independent work. File next to the Friedman *Military
  Cryptanalysis* with explicit cross-reference noting the relationship.
- The remainder of the Friedman Collection (correspondence, Yardley
  materials, the library proper) is **landscape, not canon** — primary
  historical material for an information-history sub-folder under
  `08-deep-history/`, not foundation.

### 4.3 Other NSA cryptologic-heritage holdings

- **VENONA** (~3,000 cables, released 1995–1996 in seven tranches under
  DCI Deutch). Operational primary documents, not foundation. Land in
  `08-deep-history/`. The accompanying Benson/Warner monographs are
  secondary scholarship; cite, do not promote.
- **Cryptologic Almanac, Cryptologic Quarterly, Center for Cryptologic
  History anniversary monographs** (Korean War SIGINT, Cuban Missile
  Crisis SIGINT, USS Liberty, Pueblo, Tonkin Gulf reassessment).
  Tier B in the pass-1 filing scheme — agency-curated histories with
  named authors. Cite, do not promote.

### 4.4 Friedman vs Shannon tier structure for `04-information/cryptography/`

When the cryptography sub-folder is seeded (deferred to a separate
sweep per pass-1 §4 verdict), the structure should be:

```
04-information/cryptography/
├── foundations/              # mathematical foundation
│   └── shannon-1949/         # Shannon, "Communication Theory of
│                             # Secrecy Systems," BSTJ 28(4), 1949.
├── pedagogical-primary/      # systematic primary pedagogy
│   ├── friedman-mc-i/        # Military Cryptanalysis Part I (SIS 1938)
│   ├── friedman-mc-ii/       # Military Cryptanalysis Part II
│   ├── friedman-mc-iii/      # Military Cryptanalysis Part III
│   ├── friedman-mc-iv/       # Military Cryptanalysis Part IV
│   └── friedman-callimahos-mca/  # Military Cryptanalytics I–III
│                             # (NSA 1956–1977; expanded successor)
└── modern/                   # post-Shannon, deferred to its own sweep
                              # (Diffie–Hellman 1976, RSA 1978, Goldwasser–
                              # Micali 1982, etc.)
```

Two text files, one bar each. The structure honors the chemistry pass-2
discipline of naming edition-of-record per text and not bundling
distinct epistemic tiers.

---

## 5. The leaked vs declassified line — discipline rule for `08-deep-history/`

Pass-1 §5 sketched the three-tier filing rule (A: officially
declassified; B: curated third-party compilations; C: leaked). Pass-2
hardens it because Bucket's epistemic hygiene depends on the rule being
explicit at the file-system level, not just in editorial intent.

### 5.1 The rule

A document's **provenance** is a mandatory metadata field, not a soft
editorial flag. Every artifact in `08-deep-history/` carries a
`provenance.yaml` (or equivalent JSON) at the document level with at
minimum:

```yaml
provenance:
  release_type: declassified | leaked | published | unauthorized | forged
  release_authority: <agency>      # if declassified or published
  release_date: YYYY-MM-DD
  release_program: <e.g. EO 12958 25-year, FOIA, MDR, JFK Records Act>
  source_url: <canonical URL>
  source_archive: <e.g. nara.gov/jfk, theintercept.com/snowden>
  evidentiary_tier: A | B | C
  notes: <free text, e.g. "redacted version; full version withheld">
```

`release_type` is the controlling field. The five values:

- **declassified** — formally released by the originating agency under
  one of the established declassification authorities. EO 13526
  (current) or its predecessors (EO 12958, EO 12356, EO 12065, EO
  12356) for executive-branch records under classification review;
  Mandatory Declassification Review (MDR; see §5.3 below) for
  individual-document requests; the FOIA exemption-by-exemption release
  process for FOIA responses; statutory mandate (JFK Records Act, Nazi
  War Crimes Disclosure Act, Japanese Imperial Government Disclosure
  Act). All of these are "declassified" for Bucket's purposes; the
  `release_program` field captures the specific mechanism.
- **leaked** — unauthorized disclosure of currently or formerly
  classified material. Snowden archive (post-2013), Manning/Wikileaks
  diplomatic cables (2010), Vault 7 (2017), the Pentagon Papers
  (Ellsberg 1971, before the 2011 NARA release made the same content
  declassified — note that the same document text can shift from
  `leaked` to `declassified` as the underlying document is later
  released, in which case Bucket carries both records and links them).
- **published** — agency-authorized open publication that was never
  classified. FRUS volumes; Studies in Intelligence unclassified
  articles; in-house monographs published openly. Distinct from
  declassified because there was no declassification step.
- **unauthorized** — published material whose internal-vs-external
  status is ambiguous or contested (e.g. the Pike Committee draft
  leaked to the Village Voice in 1976 after the House voted to suppress
  the official report). A subset of "leaked" with the additional flag
  that the originating *body* was a public one acting in a public
  capacity.
- **forged** — material that entered the historical record under false
  provenance and is now known or strongly suspected to be a fabrication.
  Examples: the 1924 Zinoviev letter; the 1980s KGB-fabricated "AIDS
  was created at Fort Detrick" documents (Operation INFEKTION) that
  resurfaced in legitimate-looking online archives in the 2000s; the
  forged Niger uranium documents cited in the run-up to the 2003 Iraq
  invasion.

### 5.2 Filing consequences

- **Declassified and published documents** file together in the
  agency-organized tree (`08-deep-history/cia/`, `08-deep-history/
  state-frus/`, etc.). Cite freely.
- **Leaked documents** file in a sibling tree at
  `08-deep-history/_leaked/` organized by the publishing outlet (not
  the originating agency, because the chain of custody runs through the
  publisher). E.g. `08-deep-history/_leaked/snowden/intercept/`,
  `08-deep-history/_leaked/wikileaks/cablegate/`. **Never co-mingle
  with the declassified tree.** Cite with explicit provenance flag in
  any downstream Bucket reference: a Snowden-era NSA slide is *not* a
  CIA Reading Room release and Bucket must never let a citation appear
  to launder one as the other.
- **Forged documents** file in a sibling tree at
  `08-deep-history/_forged/` with a mandatory `analysis.md` per
  document explaining the basis for the forgery determination and the
  current scholarly consensus. **Citable only as evidence of
  disinformation operations, never as evidence of the underlying
  claim.** Bucket's epistemic hygiene depends on this. The Operation
  INFEKTION corpus is in this tree; treating it as primary evidence of
  US biowarfare research would be a category error of exactly the kind
  the Bucket canon thesis is built to prevent.

### 5.3 MDR vs FOIA — pass-1 missed this

Pass-1 collapsed the declassification mechanisms into a single category.
The two most-used mechanisms are operationally distinct and the
distinction matters for provenance.

**FOIA** (Freedom of Information Act, 5 U.S.C. § 552, 1967). A
statutory right of access to executive-branch records. 20-working-day
statutory response window (in practice, often years). Enforceable in
federal court. Subject to nine exemptions (b)(1)–(b)(9), of which
(b)(1) — properly classified national security information — is the
operative one for intelligence material. A successful (b)(1)
exemption-challenge produces a release; an unsuccessful one produces
nothing.

**Mandatory Declassification Review** (MDR, governed by EO 13526
§ 3.5 and 32 C.F.R. § 2001). A specific request for declassification
review of an individual classified document (or specific information
within a document). Distinct from FOIA in that it operates **only on
classified records** (an unclassified record is a FOIA matter, not an
MDR matter). Different appeal path: MDR appeals route to the
Interagency Security Classification Appeals Panel (ISCAP), which has
historically released material after agency denials at materially
higher rates than FOIA appeals. Typical timeline: a year minimum.
**Critically: requesters must choose one path or the other; the same
document cannot be requested via both simultaneously.**

For Bucket's provenance scheme, the `release_program` field captures
which path produced the document. Intelligence-community released
material is overwhelmingly FOIA + (b)(1); Presidential Library
material before 1981 is overwhelmingly MDR (because pre-Reagan
Presidential records are not subject to FOIA — they predate the 1978
Presidential Records Act).

A third mechanism worth flagging: **systematic declassification
review** under the EO 12958/13526 25-year automatic-review program.
This is the source of CREST, the post-25-year Presidential Library
releases, and most of the bulk-tranche declassifications. It is
neither FOIA nor MDR; it is a calendar-driven internal program. Pass-1
did not name this distinction; it should be in the
`release_program` field as `25-year-automatic` or `30-year-automatic`
depending on the era.

### 5.4 Declassified-but-still-classified-at-a-lower-level

A subtle but real category. A document originally classified TOP
SECRET // SI // TK can be downgraded to SECRET on a 25-year review —
released to a cleared researcher under a downgraded clearance regime
but never released to the public. The published-public version may
itself be a redacted SECRET version of an originally TOP SECRET
document. Pass-1 did not handle this. The discipline: the
`provenance.notes` field should record the originating classification
where it appears in the document header, and a downstream consumer
should never assume "released" means "fully released." The redaction
markers in the document text (the FRUS `[text not declassified]`
pattern, the CIA Reading Room `███` blackout pattern) are the
inline evidence of this.

---

## 6. Foreign-power equivalents — what `international-peers/` should hold

Pass-1 §1 (international peers) named UK National Archives HW series,
Wilson Center CWIHP, and "German Federal Archive (Bundesarchiv) Stasi
Records" in a half-line aside, then moved on. **The Bundesarchiv Stasi
Records are arguably the largest declassified intelligence archive in
the world and pass-1 underweighted them by an order of magnitude.**
Pass-2 enumerates.

### 6.1 The list

**United Kingdom — UK National Archives at Kew.** Catalogued via the
Discovery API (`discovery.nationalarchives.gov.uk/API/`), which is
genuinely usable (REST/JSON, free, no auth for read). Relevant series:

- **HW** — GCHQ and predecessors (GC&CS, Government Code & Cypher
  School). 17 series covering 1914–1949 with material trickling into
  later decades. HW 12 (Diplomatic Section decrypts), HW 13 (WWII
  intelligence summaries), HW 15 (UK-side VENONA), HW 14 (Bletchley
  Park internal admin and cryptanalytic records). The Bletchley
  decrypts proper are dispersed across HW 1, HW 5 (signals intelligence
  reports to Churchill), and others.
- **KV** — MI5 (Security Service) records. KV 2 (personal files) is
  the public-research workhorse — Klaus Fuchs (KV 2/1245), Anthony
  Blunt, Kim Philby, Guy Burgess all live here.
- **DEFE** — Ministry of Defence and predecessors. DEFE 28 (signals
  intelligence policy), DEFE 31 (Chiefs of Staff Committee).
- **CAB** — War Cabinet and Cabinet Office files. CAB 79 / CAB 80 (WWII
  Chiefs of Staff Committee), CAB 120 (Churchill's wartime "secretariat
  files").
- **The "migrated archives"** released from the Hanslope Park Foreign
  Office repository in tranches 2011–2013, after the Mau Mau colonial-
  abuse litigation forced disclosure. ~20,000 files on the
  decolonization era previously withheld.

Gale Cengage publishes a paywalled curated digital edition (*Twentieth-
Century British Intelligence: Monitoring the World*) of selected HW and
KV material; the underlying records are free at Kew or via the
Discovery API.

**Germany — Bundesarchiv Stasi Records Archive (formerly BStU,
absorbed into the Bundesarchiv on 17 June 2021).** This is the archive
pass-1 underweighted.

- **Total holdings: 111 kilometres of records** (linear shelving), of
  which approximately 50 km are held in the Berlin archive. By
  comparison, NARA's total holdings are on the order of ~1,000+ km but
  spread across all federal government records since 1789; the Stasi
  archive concentrates ~111 km on the operational records of a single
  intelligence service over ~40 years (1950–1990).
- **Status: fully open since 1992** under the Stasi Records Act
  (Stasi-Unterlagen-Gesetz). Since 1992, more than 1.5 million
  individuals have accessed their personal files.
- **Digitization**: ongoing since 2014 using feed-in scanners, flatbed
  scanners, and book scanners for paper documents; the audio collection
  is approximately 56% digitized as of February 2019 (~20,200 hours).
  Digital portal launched January 2015; living-person privacy
  restrictions limit which files appear online.
- **Document reconstruction**: the archive runs a long-running effort
  to reconstruct documents that Stasi officers tore by hand in the
  closing weeks of the GDR (~15,000 sacks of torn fragments). Since
  2021 the Bundesarchiv legislation has codified this as a permanent
  task.
- **Research access**: comparatively open. Foreign researchers can
  apply directly; access is granted for documented research purposes
  with privacy restrictions on third-party personal data. The
  `bundesarchiv.de/en/stasi-records-archive/` portal is the entry.

**This is the single largest fully-open declassified intelligence
archive in the world by volume, and it is structurally different from
the US corpus**: the US declassification mechanism is an opt-in
release of documents that originating agencies still nominally control;
the Stasi archive is a regime-collapse archive that was forced open by
statute in 1992 with the originating service no longer in existence.
The differing political logics produce different archive shapes —
Stasi records are operationally complete in a way no US agency record
is, because the Stasi did not get to redact on the way out.

**USSR / Russia.** Three distinct sources, none currently open:

- The brief "yeltsin window" (1991–1994) when the Russian state
  archives selectively released material. Closed since the late 1990s.
- The **Volkogonov Collection at the Library of Congress**.
  Photocopies of Russian-archive documents accumulated by Soviet
  general and historian Dmitriĭ Antonovich Volkogonov during his
  privileged-access period in the early 1990s, donated to the Library
  of Congress by his family in 1996 and 2000 (the latter via Mark
  Kramer of Harvard). Significant for early Soviet history (Lenin,
  Stalin, Trotsky operational records) and CPSU Politburo material.
- The **Bukovsky Soviet Archives** — Vladimir Bukovsky's smuggled-out
  CPSU Central Committee documents from 1992, hosted at
  `bukovsky-archive.com`. Smaller than Volkogonov but covers the
  Brezhnev–Gorbachev era including KGB operational documents.
- The **Mitrokhin Archive** — handwritten notes on KGB operations
  (1930s–1980s) made by KGB archivist Vasili Mitrokhin and delivered
  to British intelligence in 1992 on his defection. **This is leaked-
  to-foreign-intelligence material, not declassified material**, and
  per the §5 rule files in `_leaked/` not in
  `international-peers/russia/`. Selected portions are translated and
  hosted by the Wilson Center CWIHP.
- **CWIHP translations from RGANI / RGASPI** — fragments of Soviet-era
  Politburo material, translated to English, hosted at
  `digitalarchive.wilsoncenter.org`. These are **the most usable
  Soviet-side primary sources for US-based research**.

**People's Republic of China.** Substantially closed. CWIHP holds
translated fragments (Foreign Ministry archives released briefly in
the 2000s and then re-restricted). No open archive comparable to FRUS,
NARA, or the Stasi archive.

**Israel — Israel State Archives** at `archives.gov.il`. Selective
releases on a 30-year clock with national-security exemptions. Mossad
operational records are essentially closed; Foreign Ministry material
is partially open.

**Brazil, Argentina, Chile.** The dirty-war-era truth-commission
declassifications: Argentina's archives via the National Memory Archive
(Archivo Nacional de la Memoria); Chile's via the Museo de la Memoria y
los Derechos Humanos and the National Security Archive's Chile
Documentation Project (Pinochet Declassification Project). Brazil's
National Truth Commission (CNV) report (2014) plus the Vladimir Herzog
Institute's archive.

**France — Service Historique de la Défense at Vincennes**. Military
intelligence records released selectively on a 50-year clock; most
post-WWII material remains restricted.

### 6.2 The three to actually mirror

If `international-peers/` gets bandwidth to mirror three foreign
sources, the right three are:

1. **Wilson Center CWIHP** (`digitalarchive.wilsoncenter.org`). The
   single best non-US-side companion to FRUS. ~100,000+ documents from
   ~100 archives in ~24 languages, all with English translations.
   No public API but the site search uses an undocumented JSON
   endpoint that is scrapable politely. **First because it gives
   broadest coverage per unit of effort.**
2. **UK National Archives Discovery API** (HW + KV series). Real REST
   API, free, no auth. Bounded sub-collection ingest (e.g. all of HW
   12) is a week of work. **Second because the API quality matches
   FRUS-tier and the cryptologic material complements the §4 Friedman
   pedagogy.**
3. **Bundesarchiv Stasi Records portal**. Hardest to mirror (no
   public API, partial digitization, German-language metadata, privacy
   restrictions on third-party data). **Third because it is the
   highest-volume open intelligence archive on Earth and Bucket's
   non-US history thesis is hollow without acknowledging it exists.**
   Realistic Bucket-side approach: index the 20,200-hour audio
   digitized portion's metadata as a reference catalog;
   defer full-document mirror until a German-language pillar exists or
   a Bundesarchiv research agreement is in place.

---

## 7. Pass-1 self-critique

Held to the standard chemistry pass-2 held its first pass to. Concrete
corrections, in priority order.

### 7.1 Bundesarchiv Stasi Records — under-called by an order of magnitude

Pass-1 dismissed the Stasi archive in a single half-line under
"International peers worth flagging." This is the single largest
fully-open declassified intelligence archive in the world by linear
volume (111 km of records vs CREST's ~13M pages, which corresponds to
roughly 1.5–2 km of paper). The Stasi archive is also structurally
distinguishable from any US release because it is regime-collapse open,
not opt-in declassified. **Correction: §6 above promotes it to
explicit treatment, and the discipline rule (§5) flags the
"regime-collapse open vs agency-opt-in declassified" distinction as
something the provenance metadata should capture.**

This does not, however, reset the highest-leverage ranking for Bucket
ingest in 2026. The Stasi archive is German-language, partially
digitized, has no public API, and Bucket has no German-language
pipeline. **The highest-leverage US ingest remains FRUS; the
highest-leverage non-US ingest is CWIHP; the Stasi archive is third.**
Volume does not equal leverage when the surface is wrong-shape.

### 7.2 MDR vs FOIA — collapsed in pass-1

Pass-1 treated declassification as a single category. It is not. §5.3
above corrects this with the FOIA / MDR / 25-year-automatic /
statutory-mandate breakdown. The provenance scheme captures it as
`release_program`.

### 7.3 The "released-but-still-classified-at-a-lower-level" category

Pass-1 did not handle the case where a document released to the public
was originally classified at a higher level than its released form
(TOP SECRET → released as redacted SECRET). §5.4 above adds the
required `provenance.notes` discipline.

### 7.4 CORONA — pass-1's "primary observational data" call

Pass-1 §4(b) called the CORONA imagery "primary observational data" of
historic significance and put it in the same epistemic category as
WMAP/Planck CMB data or Apollo lunar samples. **That call is correct
in epistemic shape but understated in scientific value.** CORONA imagery
has been used as primary data in published peer-reviewed work in
archaeology (the dispersed-Roman-frontier mapping projects;
the Mesopotamian site-discovery work using HEXAGON/CORONA stereo
pairs), in glaciology (1960s ice-extent baseline data feeding into
modern glacial-retreat measurement), and in landscape change detection.
The right move is to add a satellite-imagery slot in
`08-deep-history/observational/` (parallel to a future
`06-cosmology/observational/`) and to flag CORONA as a candidate
primary-data resource for any future biophysics or cosmology branch
work that needs a half-century baseline of Earth-surface measurement.

The HEXAGON and GAMBIT releases since 2011 have added stereo and
higher-resolution material that materially improves CORONA's research
utility.

### 7.5 The feed402 candidacy steelman

Pass-1 §6(c) verdict: "not a feed402 candidate. Different protocol
entirely; this is a citation-and-mirror problem, not a metered-data-
merchant problem." Pass-2 holds the verdict but steelmans the
counterargument:

The counterargument runs: while the underlying documents are free, a
*verification service* could be metered. A signed, hash-anchored
canonical citation — "this PDF you are about to cite is genuinely
NARA NAID 12345, retrieved date X, SHA-256 Y, verified against NARA's
own AWS Open Data dataset" — is a real service that has real cost
(the verifier must maintain a live mirror against authoritative
source) and could plausibly route micropayments to fund the
mirroring infrastructure.

The steelman has merit but the call still stands: this is a service
Bucket should provide as part of the canon promotion infrastructure,
funded by the canon citation flow that already exists in the
PROTOCOL.md design, not as a separate feed402 endpoint. The reason is
discipline: making citation-verification a metered service introduces
a perverse incentive to charge for verification of free public-domain
documents, which is exactly the kind of patronage-layer rent-seeking
the MANIFESTO is built to route around. **The verification belongs
inside the canon flow as a free byproduct, not as a metered side
service.** Verdict unchanged: not a feed402 candidate.

### 7.6 Major archives pass-1 omitted entirely

- **Hoover Institution Library & Archives at Stanford.** The largest
  research collection on twentieth-century Poland outside Poland
  itself, with substantial Solidarity-era SB (Polish security service)
  files (the Poland-Sluzba Bezpieczenstwa-Departament III Collection,
  the Okragly Stol Collection of round-table negotiations material, the
  Polish Independent Publications Collection 1976–1990). Plus
  significant Cold War USSR / East European holdings, parts of the
  Aleksandr Yakovlev archive, the Bukovsky materials. Pass-1's
  international-peers list missed Hoover entirely. **Add as a
  Tier B host** — academically curated, finding-aids-driven access.
  Romanian Securitate holdings at Hoover: not confirmed in pass-2
  search; flag as **unknown**.
- **Presidential Libraries — specific high-signal collections.** Pass-1
  mentioned the libraries in passing but did not name the collections
  worth knowing: the LBJ Library's National Security File (NSF); the
  Nixon Library's National Security Council Files (the parallel
  agency-side record to FRUS for the Nixon-Kissinger period); the
  Reagan Library's Executive Secretariat NSC files (declassification
  ongoing, MDR-driven); the Bush 41 Library's Brent Scowcroft files
  (still partially restricted). These are the core MDR-target
  collections for late-Cold-War foreign policy research and they bridge
  directly to FRUS.
- **Cold War International History Project Bulletin issues.** The
  CWIHP publishes a *Bulletin* (~30 issues since 1992) that pairs
  newly-translated Soviet/PRC/East-European primary sources with brief
  scholarly framing. Pass-1 named the digital archive but missed the
  Bulletin. The Bulletins are the curated editorial layer over the
  digital archive's primary sources; cite both.
- **National Cryptologic Museum Library.** The NSA-affiliated
  research library at Fort Meade, with a significant published catalog
  of cryptologic monographs and the Friedman Library proper as a
  physical reading-room collection. Pass-1 covered the digital
  Friedman Collection but missed the physical NCM library context.
- **The Oral History collections** — the FAOH (Foreign Affairs Oral
  History) collection at the Association for Diplomatic Studies and
  Training (ADST), the Naval History and Heritage Command oral
  histories, the Air Force Historical Research Agency oral histories.
  Not declassified-document material per se, but primary historical
  evidence on the same operations and decisions FRUS documents,
  produced by the participants. Tier B (curated by the host
  organization, named oral historian as interviewer).

### 7.7 The "Nazi War Crimes Disclosure Act" releases — pass-1 understated

Pass-1 noted the 1998 Nazi War Crimes Disclosure Act and the 2000
Japanese Imperial Government Disclosure Act under NARA Catalog and
gave them ~8.5M pages combined. The understatement: this corpus is the
largest topical declassification ever conducted by the US government
and it includes the bulk of the agency-side records on Operation
PAPERCLIP, on US intelligence relationships with Klaus Barbie and other
Nazi-era figures, and on the post-war disposition of Imperial Japanese
intelligence assets. The IWG (Interagency Working Group) finding aids
are themselves a research artifact. **Promote in a future pass to a
named topical sub-collection of the NARA ingest plan, parallel to the
JFK Records.**

---

## 8. The actual recommendation

If Bucket has engineering bandwidth to ingest exactly **one** archive
in 2026, ingest **FRUS**. The reasoning is elsewhere in this memo (§1.6)
and need not be repeated. The 90-day plan:

### 8.1 Citation-key scheme

Per §1.5: `frus.<admin>.<volume>[.<part>].<doc>`, e.g.
`frus.1961-63.v11.d176`. Stable across re-releases. Resolves to
`https://history.state.gov/historicaldocuments/frus1961-63v11/d176`.
Maps to one Walrus blob per volume + one Story Protocol IP NFT per
document, with the volume IP as the parent.

### 8.2 Pipeline shape (Bucket stack)

- **Source**: `git clone HistoryAtState/frus`. Re-pull weekly via cron
  on the Bucket server.
- **Parser**: TypeScript or Python TEI walker. Output: one JSONL line
  per document into `frus_documents.jsonl`.
- **Storage layer 1 — Walrus**: each volume's TEI XML mints as a
  Walrus blob, content-addressed by SHA-256. Volume = blob; document =
  TEI subtree referenced by `xml:id`.
- **Storage layer 2 — Story Protocol**: each volume mints as a parent
  IP NFT (license: CC0 / public-domain attribution); each document
  mints as a child IP NFT under the volume parent. The IP NFT IDs are
  the on-chain canonical identifiers; the Walrus blob hash is the
  content-addressed identifier; the FRUS citation key is the human-
  readable identifier. All three resolve to the same document.
- **Storage layer 3 — Supabase**: `frus_volumes` and `frus_documents`
  tables, full-text search via Postgres `tsvector` on body + footnotes,
  faceted search on date / origin / addressee / classification.
- **Surface**: a Next.js page at `bucket.foundation/frus` that
  exposes the search and the citation-resolver. Each document page
  shows: the rendered TEI body, the editorial footnotes, the
  citation key, the resolved `history.state.gov` URL, the Walrus blob
  hash, the Story Protocol IP NFT ID, and a "cite-this-document" panel
  with copy-paste citations in the major academic styles.

### 8.3 Week-by-week milestones

**Weeks 1–2 — Parse and schema.**
- File a `bkt-` bead for the FRUS ingest epic (`bkt-epic-frus-ingest`).
- Stand up the TEI parser. Test against a single volume (recommended
  first volume: FRUS 1961–63 Vol. XI, Cuban Missile Crisis and
  Aftermath — used as the worked example in pass-1 §6(b); already in
  the index).
- Define the `frus_documents` and `frus_volumes` Supabase schemas.
- Output: working parser, single-volume parsed and indexed locally.
  Demoable Bucket-side query of "documents by John F. Kennedy on
  October 16, 1962."

**Weeks 3–4 — Full corpus parse.**
- Run the parser across all ~500 volumes.
- Land everything in Supabase. Emit the `frus_documents.jsonl`
  artifact.
- Write the redaction-handling code (§1.4) — `<gap>` and inline
  `[text not declassified]` both preserved as structured tokens.
- Build the cross-volume entity-disambiguation pass on
  `<listPerson>` / `<listOrg>`.
- Output: ~250k–400k document corpus indexed in Supabase. Full-text
  search live locally.

**Weeks 5–6 — Walrus and Story Protocol mint.**
- Mint each volume as a Walrus blob (one-time, idempotent on hash).
- Mint each volume as a parent IP NFT on Story Protocol; mint each
  document as a child IP NFT.
- Wire the Walrus and Story IDs back into the Supabase rows.
- Output: every document is on-chain addressable. Citations resolve
  three ways (FRUS key, Walrus hash, IP NFT ID).

**Weeks 7–8 — Surface the corpus on bucket.foundation.**
- Build the Next.js `/frus` page set: search UI, document detail
  page, citation panel, volume browse, administration browse.
- Wire the cite-this-document panel to emit the multi-format
  citations.
- Write a single curator's note for the Cuban Missile Crisis
  volume as the worked example of how a FRUS volume sits in
  `08-deep-history/`.
- Output: public Bucket page set live. FRUS becomes the worked
  example for every subsequent `08-deep-history/` ingest.

**Weeks 9–10 — Cross-link to NARA.**
- For each FRUS document, parse the `<note>` source citations to
  identify the underlying NARA records (RG, series, file unit,
  often by name). Store the linkage.
- Where possible, resolve the NARA citation to a NAID via the NARA
  Catalog API (10k queries/month is enough for a steady-state
  background job; bulk resolution goes through AWS Open Data).
- Output: every FRUS document carries a link to its underlying NARA
  source record, where NARA's catalog records the original.

**Weeks 11–12 — Production hardening and the second-archive
decision.**
- Cron the weekly re-pull. Differential parsing (only re-process
  volumes whose XML changed). Idempotent re-mint logic (skip if
  Walrus hash is unchanged).
- Write the `gdrive:AGFarms/Nucleus/research/frus-canon/` mirror.
- Write the `08-deep-history/state-frus/README.md` referencing the
  worked example.
- File the bead for the second archive (recommended next: NARA JFK
  Records 2025-2026 release, ~89k pp, ~one week given the FRUS
  pipeline as scaffold).

### 8.4 Deliverables summary

- Production FRUS ingest pipeline (TS/Python, Bucket-server-hosted).
- ~250k–400k document Supabase corpus.
- One Walrus blob per volume, one Story IP NFT per volume + per
  document.
- `bucket.foundation/frus` public surface with search, browse, and
  citation export.
- `gdrive:AGFarms/Nucleus/research/frus-canon/` durable mirror.
- `08-deep-history/state-frus/` worked-example README + Cuban Missile
  Crisis volume curator's note.
- Cross-link layer to NARA Catalog at the source-citation level.
- A re-runnable, idempotent ingest that any future engineer can
  re-execute on a fresh checkout in under a day.

This is the cleanest first US-government-archive ingest Bucket can
mount in 2026, and it sets the template for every subsequent
`08-deep-history/` agency.

---

## Sources used in this pass

- [Office of the Historian — Developer Resources](https://history.state.gov/developer)
- [HistoryAtState/frus on GitHub](https://github.com/HistoryAtState/frus)
- [NARA — National Archives Catalog API documentation](https://www.archives.gov/research/catalog/help/api)
- [NARA — JFK Assassination Records 2025 release](https://www.archives.gov/research/jfk/release-2025)
- [Bundesarchiv — Stasi Records Archive](https://www.bundesarchiv.de/en/stasi-records-archive/)
- [Bundesarchiv — Digitisation of Stasi Records](https://www.bundesarchiv.de/en/research-our-records/research-archive-material/digitised-records/digitisation-of-stasi-records/)
- [Wikipedia — Stasi Records Agency](https://en.wikipedia.org/wiki/Stasi_Records_Agency)
- [CIA — STARGATE collection](https://www.cia.gov/readingroom/collection/stargate)
- [CIA — President's Daily Brief 1961–1969](https://www.cia.gov/readingroom/collection/presidents-daily-brief-1961-1969)
- [CIA — President's Daily Brief 1969–1977](https://www.cia.gov/readingroom/collection/presidents-daily-brief-1969-1977)
- [CIA — Declassified NIEs on the Soviet Union and International Communism](https://www.cia.gov/readingroom/collection/declassified-national-intelligence-estimates-soviet-union-and-international-communism)
- [CIA — National Intelligence Council (NIC) Collection](https://www.cia.gov/readingroom/collection/national-intelligence-council-nic-collection)
- [MuckRock — FOIA FAQ: searching CIA's declassified archives](https://www.muckrock.com/news/archives/2017/sep/22/crest-search-guide/)
- [Internet Archive — William F. Friedman NSA Collection](https://archive.org/details/nsa-friedman)
- [Internet Archive — Military Cryptanalysis Part III](https://archive.org/details/41761619080075)
- [Internet Archive — Military Cryptanalysis Part IV](https://archive.org/details/41761079080022)
- [NARA Transforming Classification — NSA Declassifies the Friedman Collection (April 2015)](https://transforming-classification.blogs.archives.gov/2015/04/30/nsa-declassifies-and-releases-the-friedman-collection/)
- [Wikipedia — Military Cryptanalytics](https://en.wikipedia.org/wiki/Military_Cryptanalytics)
- [ISOO — Seeking Access to Classified Records: MDR vs FOIA](https://isoo-overview.blogs.archives.gov/2021/10/01/seeking-access-to-classified-records-requesting-mandatory-declassification-review-mdr-versus-freedom-of-information-act-foia/)
- [State Department — Mandatory Declassification Review](https://foia.state.gov/Learn/MDR.aspx)
- [NARA — Mandatory Declassification Review (MDR)](https://www.archives.gov/isoo/training/mdr)
- [TEI-C issue #2421 — Encoding redacted/censored text](https://github.com/TEIC/TEI/issues/2421)
- [National Security Archive — Redactions: The Declassified File](https://nsarchive.gwu.edu/briefing-book/foia/2019-04-18/redactions-declassified-file)
- [Library of Congress — Volkogonov Papers](https://www.loc.gov/item/mm97083838/)
- [Wikipedia — Mitrokhin Archive](https://en.wikipedia.org/wiki/Mitrokhin_Archive)
- [Wilson Center — Mitrokhin Archive (translated material)](https://digitalarchive.wilsoncenter.org/topics/mitrokhin-archive)
- [Hoover Institution — Europe Collections by Country](https://guides.hoover.org/europe/collections)
- [Hoover Institution — Polish Collections digitized](https://www.hoover.org/news/hoover-archives-polish-collections-digitized)
