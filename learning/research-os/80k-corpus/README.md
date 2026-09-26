# Raw source corpus

Beads: `bkt-in9n` tracks the request. `bkt-48qv` tracks collection. The five research ideas are recorded in [IDEAS.md](IDEAS.md).

## Source storage

`scripts/corpus/collect.py` stores raw HTTP response bodies in content-addressed revision directories. Requests decodes HTTP transfer and content encoding before the hash is computed. `response.bin` preserves those bytes. `text.txt` is a deterministic extraction of source text. Publisher transcript sections have a separate `transcript.txt`. No language model generates either file.

The local corpus root is `_intake/80k-ea-longtermism/` in the main checkout. That folder is ignored by Git. It contains `corpus.sqlite`, a full-text search index, acquisition events, and raw response files. Source text with unreviewed redistribution rights stays local. The checked-in manifest contains identity and acquisition metadata.

Identity is SHA-256 of the canonical source URL. Canonicalization lowers the scheme and hostname, removes fragments and known tracking parameters, and preserves other query parameters and trailing slashes. A redirected URL retains its requested identity and records its final URL. Aliases can therefore be separate nodes; count URLs and byte-identical revisions separately.

Each revision has a raw SHA-256, text SHA-256, UTC fetch time, extraction version, selector, and content type. Text offsets use Unicode code points with exclusive end positions. The extraction may retain page boilerplate. Raw HTML remains available for correcting extraction without inventing source text.

## Commands

Run from the feature worktree. Set `CORPUS_ROOT` to the local corpus directory.

```bash
python3 scripts/corpus/collect.py inventory --root "$CORPUS_ROOT"
python3 scripts/corpus/collect.py crawl --root "$CORPUS_ROOT" --collection 80000hours --limit 10000
python3 scripts/corpus/collect.py status --root "$CORPUS_ROOT"
python3 scripts/corpus/collect.py search --root "$CORPUS_ROOT" --query '"expected value"'
python3 scripts/corpus/collect.py build --root "$CORPUS_ROOT" --out learning/research-os/80k-corpus/results
python3 -m unittest discover -s scripts/corpus -p 'test_*.py'
```

Install `scripts/corpus/requirements.txt` if the dependencies are absent. PDF extraction uses Poppler's `pdftotext`. The adjacent AGFarms `agf-yt` command retrieves YouTube metadata and source captions; publisher website transcripts provide a separate source representation.

`import_youtube.py` imports saved `agf-yt` VTT and text into the same archive and search index. `enrich.py` adds twelve topic labels, literal-phrase candidate edges with rehydratable text spans, and a catalog of adjacent links. `verify.py` checks the raw and text hashes and the search index. `refresh_metadata.py` reads publisher titles and canonical URL hints from saved HTML; it preserves source bodies.

## Scope and operations

`scripts/corpus/sources.json` declares the collection domains and entry points. Site inventories and in-scope links expand the collection. EA Forum discovery starts from topic pages and links encountered in 80,000 Hours material; the whole forum is outside this finite inventory.

Each collector process uses four workers, at least 0.5 seconds between requests to a host, up to three attempts, and a 12 MiB response limit. Robots crawl delays take precedence. Two collection processes may run on disjoint collection sets, for a total of eight workers. Each process stops scheduling at a 4 GiB decoded-response budget. Every yielded chunk counts, including aborted responses. Four in-flight workers can overshoot by at most 256 KiB of yielded chunks; transport buffering and headers are outside this accounting. Unfinished URLs remain pending. URL discovery stops at 30,000 records. Inventory traversal stops at 150 sitemap files. These caps bound the run and can leave pending sources.

Robots retrieval failure blocks that host. A missing robots file with HTTP 404 or 410 permits retrieval. Every redirect is checked against the declared hosts and public DNS addresses, with a five-hop cap. Authentication walls and bot challenges remain failures. Retrieval uses public requests without account cookies.

The first acquisition pass used Python's standard robots parser, which missed wildcard exclusions. The corrected collector uses Protego 0.7.0. A local audit identified 805 disallowed URLs, including 770 fetched pages. Those records were changed to blocked and removed from search. The retained response files are quarantined acquisition evidence. `results/robots-audit.json` records every affected URL and prior state. Later builds expose their blocked status and exclude their text from topic matches.

The ledger partitions discovered URLs into pending, fetched, failed, blocked, excluded, and withdrawn states. Asset URLs from sitemap image entries are excluded. `fetched` means a response and usable extracted text were retained; it does not mean the entire document was read by an agent or its claims verified. Coverage applies to discovered URLs, with no denominator for the whole web.

## Graph contract

The graph preview follows `IngestNodeDraft` and `IngestEdgeDraft` in `src/lib/research-os/ingest/types.ts`. Source nodes use `primary_source`, null summaries, and explicit acquisition states. Here `primary_source` means the original publication being archived. Scientific evidence grades require a separate review.

Observed HTML links use `bridges` with `relation: html_link`. They carry source and target URLs. They assert no citation, agreement, prerequisite, or causal relation. Every emitted endpoint must exist. Pending and failed source nodes expose their acquisition state. Text lives in the local source archive and search index.

Live apply is disabled. The existing `apply-drafts.ts` writer can skip unresolved endpoints and lacks a transaction receipt for rollback. The source graph is local and the import artifact is a preview. No deployed Bucket graph or learner mastery record is changed by collection.

`withdraw --url URL` excludes a source from the next graph build and deletes its search entry. Rebuilding removes incident edges. Raw revisions remain in local storage pending the owner's retention decision. Physical erasure requires a separate retention action.

## Verification

Boundary tests check URL identity, rejected credentials, transcript fidelity, PDF extraction failure, robots failure, declared-host rejection, stored hashes, repeat graph-build identity, endpoint closure, coverage counts, and withdrawal. Results from the acquisition run are reported separately from unit tests.

The Bucket critic's plan review passed at 9.125/10 in round two. The final implementation review remains pending until its evidence is recorded in CRITIC.md. The initial connection check to the configured Nucleus endpoint timed out from this machine; that observation does not establish a service outage.
