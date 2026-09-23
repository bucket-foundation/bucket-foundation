# Evidence corpus

The admitted public-source corpus behind evidence search, bead `ros-ai-corpus`, under the architecture in [IMPLEMENTATION.md](IMPLEMENTATION.md), "Source identities". It turns public graph nodes and their curated passages into local artifacts an encoder may index and Quote may check, and it records why every other node stays out. The build reads the graph and writes nothing to it.

## What a build writes

`scripts/research-os/evidence/build-corpus.ts build` writes one directory per corpus revision under `local/evidence/`, which git ignores:

| File | Holds |
|---|---|
| `sources.jsonl` | One record per admitted node: `graph:<uuid>` id, normalized body, both hashes, citation, rights rule, source revision |
| `passages.jsonl` | One record per quotable curated passage: its byte span inside the source body, the text as Quote serves it, its quote revision and rights rule |
| `manifest.json` | Pins both files by hash, with the rights policy hash, the builder commit, the counts, the cap, and the groups of nodes that share one body |
| `rejected.jsonl` | Every node or passage left out, with its reason. Diagnostic, unpinned |

The directory name is the corpus revision, a hash over what the manifest pins and nothing else, so the same graph and policy give the same revision and a rebuild writes nothing. Files land through a temporary directory and one rename, and the validator reads them back before the rename. `check <dir>` validates a built corpus and lists every source whose live node has changed since.

The build stops before writing when two admitted records share a source id or a DOI alias. It refuses to run with less than 50 GiB free on the output disk, the reserve in IMPLEMENTATION.md, "Operating envelope". The development cap is 500 records; quotable sources come first, then the policy's rule order, so the 22 sky-blue seed nodes and their 13 passages are always inside it.

## Rights

[rights-policy.json](rights-policy.json) answers two questions with two rule lists. `index` asks whether a node's own title and summary may be copied into the local index, and turns on who wrote that text. `quote` asks whether a curated passage may be quoted, and turns on the license of the page it comes from. The first matching rule answers, and a node or passage no rule matches has unknown copying rights and stays out.

| Index rule | Decision | Basis |
|---|---|---|
| `sky-blue-seed` | admit | Paraphrases written for the seed in this repository, MIT |
| `academy-atom` | admit | Lesson summaries written here; resources are links only |
| `canon-figure`, `canon-concept`, `canon-site` | admit | The contributor index, concept names, and site facts composed by the ingest |
| `intake-digest`, `intake-target` | admit | Count lines and target notes written here |
| `source-excerpt` | refuse | A third party's video transcripts; the Kruse corpus stays private until its author agrees |
| `canon-paper` | refuse | The summary is the paper's own opening text |
| `canon-bridge` | refuse | The summary carries a transcript claim's title |
| `literature-paper` | refuse until read | Notes on papers that can carry abstract text |
| `intake-paper` | refuse | A paper title with no text written here |

The four quote rules cover every curated passage in `src/lib/research-os/passages.ts`: NASA Space Place, Wikipedia under CC BY-SA 4.0, Rayleigh's 1871 paper on Wikisource, and Tyndall's 1869 essay on Project Gutenberg.

**For the founder.** The policy's status is `draft`. Two points are yours: the policy as a whole, and the NASA Space Place label. The seed records that page as public domain as a US government work, and Space Place is produced with JPL-Caltech, whose text may carry its own terms. Every Space Place quotation is under 90 words, attributed, and already served by Quote today. Changing the status to `approved` is one line. The admission step refuses a draft policy unless it is told this is local development.

## Admission

`build-corpus.ts admit <dir>` validates a built corpus and records it in `graph.evidence_source_admissions`, one `index` row per source under its `sourceRevision` and one `quote` row per passage under its `quoteRevision`. `graph.admit_evidence_corpus` stages every row and makes the corpus the active set in one transaction: a new revision supersedes the one it replaces, and an active source missing from the corpus is superseded too. A draft policy admits only with `--allow-draft`.

`withdraw <sourceId> --reason <text>` withdraws every revision of a source. Its rights revision becomes a fence: admitting the source again takes a newer rights review, so an older policy cannot undo a withdrawal. A re-admitted row keeps its withdrawal date.

Quote's check is `graph.quote_admission(source_id, source_revision)`, which reads the row `FOR SHARE`. A withdrawal of that source waits until the Quote transaction ends; the database test measures the wait, and it drops to 25 ms when the lock is removed. `graph.record_quote_receipt` on #196 calls this check once both land, and from then a curated passage without an active quote admission is refused. `graph.eligible_evidence_sources()` is the set a search request may score: active index rows whose node is still public and not merged away.

No browser role reads or calls any of it, and the service role reads the table and moves rows only through the functions.

On the local database on 2026-09-22, the capped corpus admitted with `--allow-draft` as 513 rows, 500 index and 13 quote, and a second admission changed nothing. For all 13 real passages, `curatedSourceRevision` from #196 computes the revision the quote row holds.

## Identity and revisions

A node's source id is `graph:<uuid>`, the form `graph.source_quote_receipts.source_id` already stores. A primary-source node's DOI becomes its alias, lowercased with the resolver prefix stripped, so two nodes standing for one paper stop the build. A law and a fact that both cite one paper stay two sources: the first local build caught `lambda-minus-4-law` and `rayleigh-scattering-law` sharing Rayleigh's DOI, and they are two claims resting on one paper.

`sourceRevision` hashes the normalized body, the citation, the extraction and normalization names, and every carried passage's revision and span. An edit to anything search shows or Quote returns makes a new one.

`quoteRevision` is the revision a receipt records for that quotation: the hash `curatedSourceRevision` computes on the receipts branch, over the node id, the passage as served, its locator and its citation line. The test pins a value computed with that function, so the corpus and the receipts join on one column, and a change on either side fails the test.

## Text and offsets

Every retained text goes through `nfc-lf/1`: a leading byte-order mark dropped, CRLF and lone CR turned into LF, then Unicode NFC. A span is a half-open UTF-8 byte range into that text, and an offset inside a multibyte character is refused. Records keep a hash of the original bytes beside the hash of the normalized text.

`src/lib/research-os/evidence/normalization-fixtures.json` holds eight cases generated with Python's `unicodedata`: plain ASCII, CRLF with a lone CR, a byte-order mark, combining accents, an astral emoji, a zero-width-joiner sequence, Greek with superscripts, and Hangul jamo that compose. The TypeScript test matches every normalized string, length, hash and span, and refuses every split offset. The encoder worker's Python test reads the same file.

## Measured on the local graph

2026-09-22, 1,905 nodes read.

| Admitted by rule | Records |
|---|---|
| `academy-atom` | 486 |
| `canon-concept` | 105 |
| `canon-figure` | 99 |
| `canon-site` | 47 |
| `intake-digest` | 26 |
| `sky-blue-seed` | 22, with 13 quotable passages |
| `intake-target` | 8 |
| Total | 793 |

| Left out | Nodes |
|---|---|
| Source excerpts | 599 |
| Literature notes, unread | 178 |
| Intake paper titles | 159 |
| Canon papers | 133 |
| Canon bridges | 30 |
| Unknown provenance type | 11 |
| A learner's production, a superseded node | 2 |

## The path to 2,000 records

The evaluated corpus in [EVALUATION.md](EVALUATION.md) needs at least 2,000 permitted records. Today's 793 leave 1,207 to find. Every count here is measured, and none of these candidates is fetched or admitted yet.

| Candidate | Measured | License basis | What admission takes |
|---|---|---|---|
| English Wikipedia pages the academy lessons link to | 1,517 distinct pages | CC BY-SA 4.0, copying with attribution under the same license | Fetch each page's lead section with its revision id, keep the attribution line, and add a `wikipedia` index rule. A fetch confirms how many resolve with a lead section |
| Primary works of canon figures who died before 1931 | 48 of the 89 figures with a lifespan row | Published before 1931, so public domain in the US | Locate each work on Wikisource or Project Gutenberg and record the edition; the count of works is unmeasured |
| Literature notes | 178 files | Unknown until each file is read | Read each note, admit the ones written here, and quote nothing from an abstract |

Wikipedia alone would carry the corpus past 2,000 if 1,207 of the 1,517 pages resolve, and it needs no money and no new account. The fetch writes a new source kind, `url:<normalized url>@<sha256>` in the imports memo's scheme, so it waits on the import storage in `ros-import 1` to 3. The four-hour acquisition audit in `ros-ai-research` decides between these paths and records the counts it finds.
