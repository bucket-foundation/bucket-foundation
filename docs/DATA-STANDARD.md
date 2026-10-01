# Bucket Data Standard

Status: draft v2, `bucket.data/1`. A proposal. Nothing is built. Awaiting critic review and founder decisions. Epic `bkt-0o06`. Every count here was read from `origin/dev` at `78f980bb1` on 2026-10-01.

## First Founder Decisions

Each answer unblocks named work. No other part of the standard waits on the founder.

| # | Decision | Blocks |
|---|---|---|
| 1 | Do the 599 canon excerpts ship, and under which facet: no, link only, or yes. | The excerpt migration, every pack, every node. |
| 2 | Which rights model is the base, who owns the licence list, who may set `verified`. | The validator's hard failures. |
| 3 | Does `-17000` in `src/data/canon-timeline.json` mean 17000 BCE or 17,000 years ago. | The globe records and the time scrubber. |

Lascaux is dated to about 17,000 years ago, which is near 15000 BCE. The file's other negative years read as BCE: Giza at `-2560`, Buddha at `-563`. Decision 3 settles one convention for the whole file and names the reference year if the answer is "years ago".

## Scope

The standard covers every dataset the app, the site, a pack or a feed402 response reads. It fixes one record model, the id grammar, dates, rights, verification, relations, the canonical byte form and the order of migration. Ranking, embedding models and payment stay outside it.

## Inventory

### Canon and research data

| Dataset | Path | Count | Id today | Gaps |
|---|---|---|---|---|
| Canon excerpts | `bucket-canon/*/sub-claims/*/*.md` | 599 files, plus 7 `INDEX.md` | The path; `rowid` is the sorted position, 0 to 598 | Every one is a YouTube transcript quotation. URL and capture date present, licence absent. 219 files name Kruse in their text; 235 quote a video whose folder or `info.md` names him. 280 distinct videos. |
| Evidence passages | `_intake/embeddings/claim-evidence.jsonl` | 599 lines, 5,990 passages, ten per excerpt | Line number as `claim_id`; packs look passages up by `concept::slug` | 582 distinct `concept::slug` keys: 17 keys belong to two excerpts in different branches. 198 passages hold an escaped HTML entity. Scores are floats. Licence is inferred from the top folder of `source_path`. |
| Primary papers | `bucket-canon/**/primary-papers.yaml` | 166 records in 36 files, 164 unique ids | `bkt-` plus 12 hex, the same shape as a bead id | Two ids appear twice inside `05-biophysics/bioelectric-lineage`. `oa_status.license` is null on 143. `provenance_signoff` reads `pending: gianyrox` on 31. Two records have no DOI. 21 carry `tier: OUTCOME`, a different meaning from the protocol's `canon_tier`. |
| Explore sources | `src/data/explore-sources.json` | 11,619 rows | Tuple of kind letter and upstream id | 258 null years. Author is one string. Licence is one line per kind letter. 21 titles, compared without case, appear under two kind letters. |
| Founding works | `src/data/founding-works.json` | 40 rows: 32 DOI, 8 OpenAlex; 26 founding, 14 landmark | Concept name plus work id | 0 rows have `basis_verified` true and 0 name a reviewer. 6 of the 32 DOIs are lower case here and mixed case in the yaml. |
| Canon figures | `canon-figures/figures.json` | 99 | Slug | Lifespan is free text. Two rows hold two people: `watson-crick`, `hodgkin-huxley`. |
| Canon timeline | `src/data/canon-timeline.json` | 114 events, `-17000` to `2020` | Slug | Integer year, no precision, no source, no licence. 34 ids also name a figure in `figures.json`. |
| Canon sites | `src/data/canon-sites.json` | 47 | Slug | Same gaps as the timeline. `catalhoyuk` is both a site and an event. |
| Canon embeddings | `src/data/canon-embeddings.json` and `.bin` | 260 vectors: 114 events, 47 sites, 99 figures | The source slug, with `figure:` on every figure and `site:` on a clash | See Hashes on the Globe Files. |
| Canon space | `src/data/explore/canon.space.json` | 260 observations, 12 components | Same ids as the embeddings | Float scores. `license` is free text. |
| Reference basis | `src/data/explore/reference-basis.json` | 6,000 terms, 12 components, built from 4,516 OpenAlex topics | None | Float loadings. No licence field. |
| Sacred history | `src/data/sacred-history.json` | 13 traditions, 22 figures, 52 correlations, 21 timeline rows | Slug; correlations use `clm-corr-` plus a hash | Timeline rows already carry `precision` and `disputed`. Rights is one Tier A statement for the file. |
| Connections graph | `_intake/connections/graph.json` | 283 author nodes, 344 edges | OpenAlex author id | Every edge is a coauthor count in `weight`; the edge has no type field. |
| What's New | `data/whats-new.json` | 316 entries | `pr-<n>`, or a commit hash plus a suffix | Two id grammars in one file. |
| World indicators | `src/data/world-indicators.json` | 211 countries, 32 indicators | `wb-<iso3>` | Float values with the unit inside the label text. Source and licence in one sentence. |
| Blue zones | `src/data/blue-zones.json` | 5 | `bz-<slug>` | Source is one sentence. No licence. |

### Learning corpus

| Deck | Path under `learning/app/corpus` | Count | Gaps |
|---|---|---|---|
| Eight science decks | `00-learning-to-learn.json` to `07-mind.json`, `biophysics.json` | 487 atoms, 998 quiz items | Seven atom ids repeat across decks with different content: `central-limit-theorem`, `godel-incompleteness`, `lagrange-multipliers`, `equivalence-principle`, `le-chatelier`, `nernst`, `hodgkin-huxley`. A quiz item has no id in the file. Licence is one sentence per deck. |
| `lang-core` | `lang-core.json` | 244 atoms, 16 languages plus Chinese as a bonus | Licence is a paragraph naming Wiktionary under CC BY-SA 3.0. |
| `lang-cognates` | `lang-cognates.json` | 244 concepts | Keyed by the same 244 ids as `lang-core`. |
| `lang-phrases` | `lang-phrases.json` | 82 phrases | 7 phrase ids equal a `lang-core` id. |

### Packs

Four shapes leave `packages/bkt/src/pack`. None is signed.

| Shape | File | Contents | Hash |
|---|---|---|---|
| `export` | `export.ts` to `content/pack.json` | Quiz items, decks, slim atoms | First 12 hex of sha256 over `JSON.stringify([items, atoms])` |
| `canon` | `canon.ts` | Excerpts with `rowid`, evidence keyed by `rowid`, licence table, drop counts | sha256 over `JSON.stringify(body)` |
| `pysrc` | `pysrc.ts` to `content/pysrc.json` | Python and HTML sources as a path to text map | First 16 hex of sha256 over sorted names and contents |
| `staff` | `staff.ts` to `content/staff-ros.json` | Three atlas files, included when `BKT_INCLUDE_STAFF_DATA=1` | None |

Two of the hashes depend on the key order `JSON.stringify` happens to produce.

### Database tables

`graph.silver_items` and `graph.gold_lineage` are defined in `supabase/migrations/20260924000000_research_os_medallion.sql`. A silver item has a uuid, `source_id`, `source_revision`, a `kind` of `claim`, `term` or `edge_candidate`, a character span, a 64 hex `text_hash`, a parser name and a float `confidence`. A gold lineage row ties one node or one edge to the silver item it came from and records `promoted_by` as `reviewer`, `importer` or `backfill`. Both tables key on uuids that exist only in the database.

### Rights models in use

| Model | File | Shape | Count |
|---|---|---|---|
| Research OS policy | `learning/research-os/ai/rights-policy.json` | `allow`, `permission`, `basis`, `evidence` per rule; status `draft`, reviewer an agent | 33 index rules, 4 quote rules; 25 allow, 12 refuse |
| Sacred history tiers | `_intake/sacred-history-corpus/spec/rights.json` | Tier A full text, Tier B citation and locator only, manuscript images never stored | 44 sources: 18 A, 6 B, 20 decided per item; 15 licence classes |
| Canon pack | `packages/bkt/src/pack/canon.ts` and `rights.ts` | A `permitted` flag per source, plus a denylist of one name pattern, two path prefixes and the video ids that match | Computed at build time |
| Explore licences | `src/data/explore-sources.json` | One sentence per kind letter | 7 |

### Hashes on the Globe Files

`canon-embeddings.json` lists three sources: `src/data/canon-timeline.json`, `src/data/canon-sites.json`, `canon-figures/figures.json`. It carries two hashes. `inputSha256` is the sha256 of the 260 `id<TAB>text` lines that `scripts/canon-explorer/embed.py` derives from those files. `rankSourceSha256` is the sha256 of the source text of two Python functions, `rank_order` and `load_vectors`. Proposal v2 states that `rankSourceSha256` covers the three files. The code says `inputSha256` does. The Migration section keeps the v2 decision and asserts both.

## Record Model

A record is one JSON object. Every record carries the common fields. A kind adds its own.

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | `bucket.data/1` |
| `id` | yes | See Ids |
| `kind` | yes | One of the 16 kinds |
| `title` | yes | Display name |
| `aliases` | no | Other identifiers, each `<scheme>:<value>` |
| `language` | no | BCP 47 tag |
| `creators` | no | `[{type: person or org, family, given, name, ids, role}]` |
| `dates` | no | See Dates |
| `source` | yes | `{url, license, retrieved_at, file, sha256}`; `file` is the repo path the record came from |
| `sha256` | when Bucket holds the bytes | Hash of the work's bytes, as in `PROTOCOL.md` |
| `tier` | yes | `draft`, `candidate` or `canon` |
| `provenance` | no | `[{action, at, by, via}]` |
| `rights` | yes | See Rights |
| `verification` | yes | See Verification |
| `relations` | yes, may be empty | See Relations |
| `location` | no | `{lat_e6, lng_e6}`, degrees times 10^6 |
| `living` | on `person` | See Additional Coverage |
| `embargo_until` | no | Date before which the record stays out of packs and feeds |

An implementation preserves a field it does not know. `PROTOCOL.md` section 4 already requires this of sidecars.

## Kinds

| Kind | Extra fields, as today's records carry them |
|---|---|
| `work` | `venue {name, issn, publisher}`, `open_access {is_oa, oa_url, repository}`, `citation_count`, `concepts`, `canon_score`, `canon_score_reasons`, `branches`, `summary`, `snippet`, `subjects`, `formats` |
| `excerpt` | `claim_no`, `text`, `text_sha256`, `locator {timestamp, seconds}`, `branch`, `concept`, `cross_concepts`, `score`, `pattern_signals`, `curation` |
| `claim` | `statement`, `side_a`, `side_b`, `confidence_e6`, `claim_class`; evidence arrives through `evidence-for` relations |
| `figure` | `era`, `region`, `tradition`, `branches`, `cross_branches`, `primary_works`, `tags`, `added_in_pass`, `bio`, `alt_names` |
| `group` | The `figure` fields; members point at it with `part-of` |
| `person` | `living`, `figure_class`, `historicity`, `motifs`; name parts sit in `creators[0]` |
| `site` | `location`, `civilization`, `site_class`, `branch`, `links {lidar, wikipedia, unesco}` |
| `event` | `location`, `event_class`, `branch`, `traditions`, `disputed`, `note`, `layer` |
| `concept` | `branch`, `alt_names` |
| `topic` | `branch`, `top_terms`, `variance_ratio_e6` |
| `atom` | `shell`, `type`, `equation`, `summary`, `depths {eli5, core, deep}`, `note`, `sources`, `resources`, `art_prompt`, `lesson`, `quiz`, `deck_version`; language atoms add `gloss`, `category`, `pos`, `forms` |
| `quiz-fact` | `level`, `prompt`, `answer`, `prompt_hash` |
| `dataset` | `record_count`, `sha256`, `generator`, `inputs` |
| `pack` | `record_count`, `sha256`, `min_client`, `manifest` |
| `generation` | `tool`, `run_id`, `model`, `revision`, `state`, `links` |
| `production` | `category`, `commit`, `pr`, `url`, `summary` |

## Ids

1. An id is authored. A person writes it into the file. No tool mints one from content.
2. The form is `<kind>:<slug>`. The first colon ends the kind. The slug is printable ASCII with no space, no `#` and no second colon.
3. CI rejects a duplicate id anywhere in the repo.
4. Today's slugs stay. `euclid` becomes `figure:euclid`; the timeline row with the same slug becomes `event:euclid`. An explore row becomes `work:<letter>/<upstream id>`. An excerpt becomes `excerpt:<branch>/<concept>/<slug>`, which separates the 17 pairs that share a `concept::slug` key.
5. A child id is `<parent>#<16 hex>`. The hex is the first 16 characters of the sha256 of the child's text after NFC normalisation, collapse of each whitespace run to one space, and trim. Quiz items are children of their atom, hashed over the prompt. Evidence passages are children of their excerpt.
6. A DOI is lower case and held as the alias `doi:<value>`. The original spelling is kept in `doi_original`. This joins the 6 founding DOIs to their yaml records.
7. Copies of one work stay separate records. A `same-as` relation joins them. A title is never an identity: 21 titles already collide inside `explore-sources.json`.
8. An atom id that repeats becomes `atom:<deck>/<slug>` in each deck, joined by `same-as` only where the two atoms teach the same thing. The seven repeats today differ in `requires` and prose.
9. Every existing id is kept as a `legacy:<dataset>/<old id>` alias. A `legacy:` alias resolves to exactly one record. An external alias such as `doi:` may sit on several records only when `same-as` joins them.
10. A retired id stays in the file as a tombstone with a `superseded-by` relation.

The two duplicated paper ids in `bioelectric-lineage/primary-papers.yaml` fail rule 3 today and are merged before the works migration.

## Stored References

Bug `bkt-3wv3`. `export.ts` builds an item id as `<deck file>/<atom id>/<index>`. `Store.importPack` upserts on that id and deletes nothing. `attempts.item_id` references it. Reorder a deck and each stored attempt points at a different question.

The fix, in one PR ahead of every other migration:

1. `export.ts` emits the child id and a `prompt_hash`, the full sha256 of the normalised prompt.
2. `store.ts` gains migration 9. `MIGRATIONS` holds eight entries today. Migration 9 adds `items.prompt_hash`, `items.retired_at` and the table `item_alias(old_id, new_id)`.
3. `importPack` first snapshots the device's own `(id, prompt_hash)` rows, computing the hash from the stored prompt. Where an incoming item has the same prompt hash, it writes an alias row and re-points the attempts, inside one transaction. Where no incoming item matches, it sets `retired_at` on the old row and leaves its attempts attached to it. It never rebinds by position.
4. A property test generates decks, applies a random sequence of reorder, insert, delete and edit, imports, and asserts that every attempt still joins to an item with the prompt hash it was answered under.

## Dates

A date is `{role, year_min, year_max, precision, original, edtf}`.

- `year_min` and `year_max` are integers in astronomical years. Year 1 CE is 1. N BCE is 1 minus N, so 1 BCE is 0 and 300 BCE is -299.
- `precision` is one of `day`, `year`, `decade`, `century`, `millennium`, `circa`.
- `original` keeps the source's own string.
- `edtf` is optional and is a rendering. Sorting and range queries use the integers.

`sacred-history.json` already stores `precision` on its 21 timeline rows: 13 `year`, 7 `century`, 1 `decade`. Ten of them are `disputed`. The canon timeline and sites store neither field, so their records fail validation on `precision` until a person supplies it.

## Rights

One object replaces the four models in use.

```json
{
  "licence": "CC-BY-4.0",
  "status": "asserted",
  "share_alike": false,
  "facets": { "metadata": "allow", "abstract": "allow", "quotation": "allow", "transcript": "link-only", "image": "deny" },
  "basis": "where the claim comes from"
}
```

- `licence` is an SPDX identifier from the licence list. A record with no licence fails validation.
- `status` is `asserted` or `verified`. `verified` follows the rule in Verification.
- Each facet is `allow`, `link-only` or `deny`. An absent facet reads as `deny`.
- The effective facet is the minimum, with `deny` lowest and `allow` highest, over the record and every record it reaches by `quotes` or `derived-from`. A vector built from a denied transcript is denied. So is an evidence passage, and so is a graph node derived from one.
- `share_alike` true carries the licence onto every record `derived-from` this one.

### Mappings

| Today | Becomes |
|---|---|
| Sacred history Tier A | `metadata`, `abstract`, `quotation`, `transcript` allow; `image` deny |
| Sacred history Tier B | `metadata` allow; every other facet deny |
| Manuscript images, either tier | `image` deny |
| `rights-policy.json` rule with `allow: true` | Facets allow, `basis` copied, `permission` mapped to an SPDX id where one exists, `status` asserted |
| `rights-policy.json` rule with `allow: false` | Facets deny, `basis` copied |
| Canon pack `permitted: true` | `quotation` allow |
| Canon pack `permitted: false` | `quotation` deny |
| Canon pack denylist match | Every facet deny |

### The 599 Excerpts

| Founder answer | Outcome |
|---|---|
| No | Text, vectors and evidence passages leave every pack. A numbered tombstone stays for each `claim_no`, so 0 to 598 remain addressable. |
| Link only | Title, link and timestamp ship. Text, vectors and passages stay out. |
| Yes | `quotation` is allow, under a length cap and with attribution on every quotation. Kruse rows stay denied until he decides. |

## Verification

```json
{ "status": "unverified", "by": "role:reviewer", "at": "2026-10-01", "basis": "what was checked", "dispute": "what is contested" }
```

- `status` is one of `unverified`, `machine-checked`, `verified`, `disputed`, `withdrawn`.
- `by` is a role id.
- The validator rejects `verified` from an agent role. A machine reaches `machine-checked` and stops there.
- `disputed` requires `dispute`. `founding-works.json` and `sacred-history.json` both hold disputed rows today.

Which roles count as human reviewers is founder decision 2.

## Canonical Form

1. UTF-8 JSON, no byte order mark.
2. Keys match `[a-z0-9_]+` and sort bytewise. ASCII keys make bytewise order and UTF-16 order agree, so TypeScript and Rust produce the same bytes.
3. No floats. A fraction is an integer scaled by 10^6, rounded half to even, in a field named with the suffix `_e6`. The evidence score `0.9619635939598083` becomes `score_e6: 961964`.
4. A quotation's `text` is stored as the raw bytes of the source and hashed as raw bytes in `text_sha256`. It is never normalised. Only the child id hash uses the normalised copy.
5. Hashing runs in TypeScript and in Rust. Lean checks test vectors as data and computes no hash.
6. One JSONL file per kind, one record per line, sorted by id. Excerpts sort by `claim_no`.

## Protocol Mapping

Checked against `PROTOCOL.md` section 4 and `src/lib/feed402-client.ts`.

| Field | Origin | Use in a record |
|---|---|---|
| `sha256` | `PROTOCOL.md` | Kept: hash of the work's bytes |
| `canon_tier` | `PROTOCOL.md`: `draft`, `candidate`, `canon` | Kept as `tier` |
| `provenance[]` | `PROTOCOL.md`: `action`, `at`, `by`, `via` | Kept |
| `authors[].orcid`, `authors[].wallet` | `PROTOCOL.md` | Kept inside `creators[].ids` and `creators[].wallet` |
| `source.url`, `source.license` | `PROTOCOL.md` | Kept |
| `cite.license` | `PROTOCOL.md` sidecar | Cite policy. It says nothing about the work's own licence, which lives in `rights.licence`. |
| `canonical_url` | feed402 `CitationSource` | Bucket's URL for the record. The origin of the bytes is `source.url`. |
| `kind`, `rights.facets`, `verification`, `relations`, `dates` | Bucket | New in `bucket.data/1` |

`PROTOCOL.md` does not define `canonical_url`. The field belongs to the feed402 envelope, beside `retrieved_at` and `license`.

## Relations

A relation is `{type, target}` plus the attributes its type allows. It is stored on the record it starts from.

| Type | Attributes | From, to |
|---|---|---|
| `cites` | | work to work |
| `quotes` | | excerpt to work |
| `founds` | `tier`: `founding` or `landmark` | work to concept |
| `requires` | | atom to atom |
| `part-of` | | any record to its container |
| `same-as` | | two copies of one thing |
| `translation-of` | | work or atom to its original |
| `coauthor` | `weight` | person to person |
| `authored` | | person or group to work |
| `derived-from` | | dataset, vector or node to its input |
| `evidence-for` | `score_e6` | passage to excerpt or claim |
| `located-at` | | event or figure to site |
| `superseded-by` | | retired record to its replacement |
| `correlates` | | figure to figure, across traditions |

The 344 edges of `graph.json` become `coauthor` with their `weight`. The 40 founding rows become `founds` with their tier. The 52 sacred history correlations become `correlates` between figures, each backed by a `claim` record.

## Lean Predicate

`WellFormed` is a predicate over a list of records, in a new file under `lean/BucketMath`. It holds when:

1. Ids are unique.
2. Every relation target is present.
3. No record in a pack has a text facet other than `allow`.
4. `requires` is acyclic, shown by a rank witness. This reuses `acyclic_of_rank` in `lean/BucketMath/Graph.lean`, which exists today over `List Edge` with a `StrictRank` hypothesis.
5. Aliases are unique under rule 9 of Ids.
6. The `superseded-by` chain is acyclic, by the same rank argument.
7. `year_min ≤ year_max` on every date.

The validator emits the rank as data and Lean checks it.

## Borrowed Standards

| Standard | Part used |
|---|---|
| SPDX | Licence identifiers in `rights.licence` and `source.license` |
| BCP 47 | `language` tags |
| EDTF | The optional `edtf` rendering of a date |
| UCUM | Unit codes on quantities |
| CSL | Name parts in `creators`: `family`, `given`, `name` |
| DataCite | Name identifiers in `creators[].ids`: scheme and value, as in `nameIdentifier` |
| W3C PROV | The vocabulary of `provenance`: `action` is an activity, `by` an agent, `at` its time; `derived-from` is `wasDerivedFrom` |

## Additional Coverage

- **Living persons.** A `person` carries `living`. A living person's record holds public professional facts only. A correction is made on request.
- **Takedown.** A withdrawn record becomes a tombstone with `verification.status: withdrawn`, and a signed revocation is published. A revocation recalls nothing already copied. Bead `bkt-12f3` records four Zenodo records that hold the repo at each release tag.
- **Embargo.** `embargo_until` keeps a record out of packs and feeds until the date.
- **Quantities.** A quantity is `{value_e6, unit}` with a UCUM unit. The 32 world indicators carry their unit inside a label today.
- **Images.** An image is `{sha256, alt, source}` and falls under the `image` facet.
- **Translations.** `translation-of` plus `language` on each side. The language decks need this for 17 languages.
- **Encrypted user records.** A user's encrypted records never enter a pack. A pack refers to them by id only.

## Migration

The excerpt `rowid` becomes an authored field, `claim_no`, written into each record and frozen at 0 to 598. A number is never reused. Files sort by it. The website's parity fixture, `scripts/fixtures/canon-search-parity.json`, pins results as `<rowid>:<concept>/<slug>`, and the vector file is aligned by row, so neither moves.

One PR per step:

1. The `bkt-3wv3` fix.
2. The validator, plus sidecar records for the globe: 114 events, 47 sites, 99 figures. The three hashed files stay byte-identical, and CI asserts `rankSourceSha256`. CI also asserts `inputSha256`, which is the hash that moves when those files change.
3. Works: explore sources, primary papers, founding works.
4. Excerpts and evidence, after founder decision 1.
5. Atoms and quiz facts.
6. One pack format.
7. The rest: sacred history, What's New, the graph, world indicators, blue zones, the database tables.

An embedding rebuild is its own PR.

## Open Contradictions

Points where the repo disagrees with proposal v2. The decision stands in each case.

1. `rankSourceSha256` hashes ranking code. `inputSha256` covers the three globe files.
2. `canonical_url` is a feed402 field and is absent from `PROTOCOL.md`.
3. The seven repeated atom ids hold different atoms, so `same-as` applies to none of them without an editor's call.
4. Alias uniqueness and shared DOI aliases conflict as first written. Rule 9 of Ids resolves it.
5. Evidence lookup by `concept::slug` already merges 17 pairs of excerpts.

## Worked Examples

Each record is built from the file named in its `source.file`. A null or empty value in the file is left out. A value the file lacks is left out and listed under the record as a validator failure. Relation targets are records that the same migration creates from rows that exist today.

### Canon Excerpt

From `bucket-canon/07-mind/sub-claims/consciousness/004-doing-that-because-the-evidence-is-that-consciousness-and-fr.md`. The talk is by Federico Faggin on the Essentia Foundation channel.

```json
{
  "schema": "bucket.data/1",
  "id": "excerpt:07-mind/consciousness/004-doing-that-because-the-evidence-is-that-consciousness-and-fr",
  "kind": "excerpt",
  "claim_no": 461,
  "title": "Claim — doing that because the evidence Is that consciousness and free will which are th",
  "aliases": [
    "legacy:canon-excerpts/bucket-canon/07-mind/sub-claims/consciousness/004-doing-that-because-the-evidence-is-that-consciousness-and-fr.md",
    "legacy:rowid/461"
  ],
  "branch": "07-mind",
  "concept": "consciousness",
  "cross_concepts": [
    "free-will"
  ],
  "text": "doing that because the evidence Is that consciousness and free will which are the aspects of wanting and the aspect of knowing itself because for one to know itself it must be conscious. It must",
  "text_sha256": "63aa379eedd9b99a2a70ddf574674a5096eb9be86d783b5e15b40b497cd4d98a",
  "locator": {
    "timestamp": "00:24:23.279",
    "seconds": 1463
  },
  "score": 7,
  "pattern_signals": [
    "must",
    "because",
    "evidence"
  ],
  "dates": [
    {
      "role": "captured",
      "year_min": 2026,
      "year_max": 2026,
      "precision": "day",
      "original": "2026-05-11",
      "edtf": "2026-05-11"
    }
  ],
  "source": {
    "url": "https://www.youtube.com/watch?v=cXlxCOoNZ7E&t=1463",
    "file": "bucket-canon/07-mind/sub-claims/consciousness/004-doing-that-because-the-evidence-is-that-consciousness-and-fr.md",
    "transcript_file": "yt/cXlxCOoNZ7E-spacetime-is-the-memory-of-a-self-knowing-universe-federico-/transcript.clean.json",
    "video_slug": "cXlxCOoNZ7E-spacetime-is-the-memory-of-a-self-knowing-universe-federico-",
    "original_url": "https://www.youtube.com/watch?v=cXlxCOoNZ7E"
  },
  "tier": "draft",
  "curation": [
    {
      "task": "Verify excerpt against source",
      "done": false
    },
    {
      "task": "Promote to canon (axiom / law / principle / derivation / observation)",
      "done": false
    },
    {
      "task": "Cross-cite primary sources (PubMed / archive.org / arXiv)",
      "done": false
    },
    {
      "task": "File under `bucket-canon/<branch>/`",
      "done": false
    }
  ],
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow",
      "transcript": "link-only"
    },
    "basis": "src/data/explore-sources.json licenses.y: YouTube transcript, link only"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "quotes",
      "target": "work:y/cXlxCOoNZ7E"
    },
    {
      "type": "part-of",
      "target": "concept:consciousness"
    }
  ]
}
```

Validator failures: `rights.licence` and `source.license` are absent, and `rights.facets.quotation` waits on founder decision 1. Its ten evidence passages are separate records; the first is `excerpt:07-mind/consciousness/004-doing-that-because-the-evidence-is-that-consciousness-and-fr#264633f0a9fea047` with `score_e6` 961964.

### Journal Paper

The first record of `bucket-canon/01-mathematics/category-theory/primary-papers.yaml`. Its DOI is one of the six that differ in case from `founding-works.json`.

```json
{
  "schema": "bucket.data/1",
  "id": "work:bkt-3466e5d777f7",
  "kind": "work",
  "title": "General theory of natural equivalences",
  "aliases": [
    "doi:10.1090/s0002-9947-1945-0013131-6",
    "legacy:primary-papers/bkt-3466e5d777f7"
  ],
  "doi_original": "10.1090/S0002-9947-1945-0013131-6",
  "creators": [
    {
      "type": "person",
      "family": "Eilenberg",
      "given": "Samuel",
      "role": "author"
    },
    {
      "type": "person",
      "family": "MacLane",
      "given": "Saunders",
      "role": "author"
    }
  ],
  "dates": [
    {
      "role": "published",
      "year_min": 1945,
      "year_max": 1945,
      "precision": "year",
      "original": "1945",
      "edtf": "1945"
    }
  ],
  "venue": {
    "name": "Transactions of the American Mathematical Society",
    "issn": "0002-9947"
  },
  "source": {
    "url": "https://doi.org/10.1090/S0002-9947-1945-0013131-6",
    "file": "bucket-canon/01-mathematics/category-theory/primary-papers.yaml"
  },
  "open_access": {
    "is_oa": true,
    "oa_url": "https://www.ams.org/tran/1945-058-00/S0002-9947-1945-0013131-6/S0002-9947-1945-0013131-6.pdf",
    "repository": "American Mathematical Society"
  },
  "citation_count": 361,
  "concepts": [
    "Mathematics",
    "Natural (archaeology)",
    "Algebra over a field",
    "Calculus (dental)",
    "Pure mathematics",
    "Geography",
    "Archaeology",
    "Dentistry"
  ],
  "canon_score": 75,
  "canon_score_reasons": [
    "+30 peer-reviewed type (journal-article)",
    "+20 citation_count>50 (361)",
    "+15 survived >5y (year=1945)",
    "+10 open access"
  ],
  "branches": [
    "01-mathematics"
  ],
  "tier": "draft",
  "provenance": [
    {
      "action": "fetched",
      "at": "2026-05-19T18:20:25Z",
      "via": "crossref"
    },
    {
      "action": "fetched",
      "at": "2026-05-19T18:20:25Z",
      "via": "openalex"
    }
  ],
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "src/data/explore-sources.json licenses.d: Crossref and OpenAlex metadata, CC0"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "same-as",
      "target": "work:d/10.1090/s0002-9947-1945-0013131-6"
    },
    {
      "type": "founds",
      "target": "concept:category-theory",
      "tier": "founding"
    }
  ]
}
```

Validator failures: `rights.licence` and `source.license` are absent, because `oa_status.license` is null. Left out as null: both ORCID values, `venue.publisher`.

### Gutenberg Book

From `gutenberg/PG-1041-shakespeare-s-sonnets/metadata.json` and the explore row `["g", "1041", ...]`.

```json
{
  "schema": "bucket.data/1",
  "id": "work:g/1041",
  "kind": "work",
  "title": "Shakespeare's Sonnets",
  "aliases": [
    "gutenberg:1041",
    "legacy:explore-sources/g/1041"
  ],
  "language": "en",
  "creators": [
    {
      "type": "person",
      "family": "Shakespeare",
      "given": "William",
      "name": "Shakespeare, William",
      "role": "author",
      "dates": [
        {
          "role": "birth",
          "year_min": 1564,
          "year_max": 1564,
          "precision": "year",
          "original": "1564"
        },
        {
          "role": "death",
          "year_min": 1616,
          "year_max": 1616,
          "precision": "year",
          "original": "1616"
        }
      ]
    }
  ],
  "summary": "\"Shakespeare's Sonnets\" by William Shakespeare is a collection of poems published in 1609. The work includes 154 sonnets, with sonnets 127-152 addressing a mysterious figure known as the Dark Lady, described as having black wiry hair and dark skin. These poems contrast sharply with earlier sonnets through their overtly sexual nature. The Dark Lady's true identity remains one of literature's enduring mysteries, with scholars debating whether she was a real person or purely Shakespeare's artistic invention. (This is an automatically generated summary.)",
  "snippet": "\"Shakespeare's Sonnets\" by William Shakespeare is a collection of poems published in 1609. The work includes 154 sonnets, with sonnets 127-152 addres…",
  "subjects": [
    "English poetry",
    "Sonnets, English"
  ],
  "bookshelves": [
    "Category: British Literature",
    "Category: Classics of Literature",
    "Category: Poetry"
  ],
  "media_type": "Text",
  "formats": {
    "text/html": "https://www.gutenberg.org/ebooks/1041.html.images",
    "application/epub+zip": "https://www.gutenberg.org/ebooks/1041.epub3.images",
    "application/x-mobipocket-ebook": "https://www.gutenberg.org/ebooks/1041.kf8.images",
    "application/rdf+xml": "https://www.gutenberg.org/ebooks/1041.rdf",
    "image/jpeg": "https://www.gutenberg.org/cache/epub/1041/pg1041.cover.medium.jpg",
    "application/octet-stream": "https://www.gutenberg.org/cache/epub/1041/pg1041-h.zip",
    "text/plain; charset=utf-8": "https://www.gutenberg.org/ebooks/1041.txt.utf-8",
    "text/plain; charset=us-ascii": "https://www.gutenberg.org/files/1041/1041-0.txt"
  },
  "download_count": 7439,
  "source": {
    "url": "https://www.gutenberg.org/ebooks/1041",
    "license": "Project Gutenberg, public domain in the US",
    "retrieved_at": "2026-05-10T21:00:30",
    "file": "gutenberg/PG-1041-shakespeare-s-sonnets/PG-1041.txt"
  },
  "sha256": "9034dcbdb674f365d6e399b229f8389052e3894a0213d1caa4fa3537a554fb3f",
  "tier": "draft",
  "provenance": [
    {
      "action": "fetched",
      "at": "2026-05-10T21:00:30",
      "via": "gutendex"
    }
  ],
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow",
      "abstract": "allow",
      "quotation": "allow",
      "transcript": "allow"
    },
    "basis": "gutenberg/PG-1041-shakespeare-s-sonnets/metadata.json copyright: false; packages/bkt/src/pack/canon.ts permits a Gutenberg source whose info.md reads Copyright: False"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failures: `rights.licence` is absent, since "public domain in the US" has no SPDX identifier and the licence list has no owner yet. The explore row's year is null, so the record has no publication date. The author's name parts are split from the file's `Shakespeare, William`.

### Euclid

From `canon-figures/figures.json`.

```json
{
  "schema": "bucket.data/1",
  "id": "figure:euclid",
  "kind": "figure",
  "title": "Euclid of Alexandria",
  "aliases": [
    "legacy:canon-figures/euclid"
  ],
  "creators": [
    {
      "type": "person",
      "name": "Euclid of Alexandria"
    }
  ],
  "dates": [
    {
      "role": "birth",
      "year_min": -324,
      "year_max": -324,
      "precision": "circa",
      "original": "c.325-c.265 BCE"
    },
    {
      "role": "death",
      "year_min": -264,
      "year_max": -264,
      "precision": "circa",
      "original": "c.325-c.265 BCE"
    }
  ],
  "era": "Hellenistic",
  "region": "Alexandria, Ptolemaic Egypt",
  "tradition": "Greek geometry",
  "branches": [
    "01-mathematics"
  ],
  "cross_branches": [],
  "primary_works": [
    {
      "title": "Elements",
      "language": "grc",
      "language_original": "Koine Greek",
      "dates": [
        {
          "role": "composed",
          "year_min": -299,
          "year_max": -299,
          "precision": "circa",
          "original": "c.300 BCE"
        }
      ]
    }
  ],
  "tags": [
    "axiomatic-method",
    "geometry",
    "proof",
    "foundation-of-foundations"
  ],
  "added_in_pass": 1,
  "source": {
    "file": "canon-figures/figures.json"
  },
  "tier": "draft",
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "Bucket-authored index row"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failures: `rights.licence` and `source.url` are absent. The years are read from the file's `c.325-c.265 BCE` and `c.300 BCE`; `grc` is the tag for the file's "Koine Greek".

### Watson and Crick

The row `watson-crick` in `canon-figures/figures.json` becomes one group and two people. The shared fields stay on the group.

```json
{
  "schema": "bucket.data/1",
  "id": "group:watson-crick",
  "kind": "group",
  "title": "James Watson & Francis Crick",
  "aliases": [
    "legacy:canon-figures/watson-crick"
  ],
  "lifespan_original": "Watson 1928-, Crick 1916-2004",
  "era": "Mid-20th century",
  "region": "Cambridge",
  "tradition": "Anglo-American molecular biology",
  "branches": [
    "05-biophysics"
  ],
  "cross_branches": [],
  "primary_works": [
    {
      "title": "Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid",
      "language": "en",
      "language_original": "English",
      "dates": [
        {
          "role": "published",
          "year_min": 1953,
          "year_max": 1953,
          "precision": "year",
          "original": "1953",
          "edtf": "1953"
        }
      ]
    }
  ],
  "tags": [
    "double-helix",
    "base-pairing",
    "central-dogma"
  ],
  "added_in_pass": 1,
  "source": {
    "file": "canon-figures/figures.json"
  },
  "tier": "draft",
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "Bucket-authored index row"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "authored",
      "target": "work:o/W2126466006"
    }
  ]
}
```

```json
{
  "schema": "bucket.data/1",
  "id": "person:james-watson",
  "kind": "person",
  "title": "James Watson",
  "creators": [
    {
      "type": "person",
      "family": "Watson",
      "given": "James"
    }
  ],
  "dates": [
    {
      "role": "birth",
      "year_min": 1928,
      "year_max": 1928,
      "precision": "year",
      "original": "Watson 1928-"
    }
  ],
  "living": true,
  "source": {
    "file": "canon-figures/figures.json"
  },
  "tier": "draft",
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "Bucket-authored index row"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "part-of",
      "target": "group:watson-crick"
    }
  ]
}
```

```json
{
  "schema": "bucket.data/1",
  "id": "person:francis-crick",
  "kind": "person",
  "title": "Francis Crick",
  "creators": [
    {
      "type": "person",
      "family": "Crick",
      "given": "Francis"
    }
  ],
  "dates": [
    {
      "role": "birth",
      "year_min": 1916,
      "year_max": 1916,
      "precision": "year",
      "original": "Crick 1916-2004"
    },
    {
      "role": "death",
      "year_min": 2004,
      "year_max": 2004,
      "precision": "year",
      "original": "Crick 1916-2004"
    }
  ],
  "source": {
    "file": "canon-figures/figures.json"
  },
  "tier": "draft",
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "Bucket-authored index row"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "part-of",
      "target": "group:watson-crick"
    }
  ]
}
```

Validator failures: `rights.licence` and `source.url` are absent on all three. The person ids are new, since the file has no slug for either man. The file gives Watson an open lifespan, `1928-`, so the record reads `living: true`; a verifier confirms that before the flag is relied on.

### Giza Site

The first row of `src/data/canon-sites.json`.

```json
{
  "schema": "bucket.data/1",
  "id": "site:giza-pyramids",
  "kind": "site",
  "title": "Giza Pyramid Complex",
  "aliases": [
    "legacy:canon-sites/giza-pyramids"
  ],
  "location": {
    "lat_e6": 29979200,
    "lng_e6": 31134200
  },
  "dates": [
    {
      "role": "built",
      "year_min": -2559,
      "year_max": -2559,
      "original": "-2560"
    }
  ],
  "civilization": "Old Kingdom Egypt",
  "site_class": "archaeological-site",
  "branch": "deep-history",
  "links": {
    "lidar": "https://opentopography.org/news/aerial-lidar-survey-giza-plateau-egypt",
    "wikipedia": "https://en.wikipedia.org/wiki/Giza_pyramid_complex",
    "unesco": "https://whc.unesco.org/en/list/86"
  },
  "source": {
    "file": "src/data/canon-sites.json"
  },
  "tier": "draft",
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "Bucket-authored index row"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failures: `dates[0].precision`, `rights.licence` and `source.url` are absent. The file's `-2560` is read as 2560 BCE.

### Lascaux Event

The first row of `src/data/canon-timeline.json`.

```json
{
  "schema": "bucket.data/1",
  "id": "event:lascaux",
  "kind": "event",
  "title": "Lascaux cave paintings",
  "aliases": [
    "legacy:canon-timeline/lascaux"
  ],
  "location": {
    "lat_e6": 45050000,
    "lng_e6": 1160000
  },
  "dates": [
    {
      "role": "occurred",
      "year_min": -16999,
      "year_max": -16999,
      "original": "-17000"
    }
  ],
  "event_class": "work",
  "branch": "deep-history",
  "source": {
    "file": "src/data/canon-timeline.json"
  },
  "tier": "draft",
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "Bucket-authored index row"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failures: `dates[0].precision`, `rights.licence` and `source.url` are absent. The year shown reads `-17000` as 17000 BCE. Under the other reading it falls near 15000 BCE. Founder decision 3 picks one.

### Learning Atom

The atom `interleaving` in `learning/app/corpus/00-learning-to-learn.json`, and the first of its three quiz items. The file's empty `equation` is left out. `requires` becomes a relation. `quiz` becomes a list of child ids.

```json
{
  "schema": "bucket.data/1",
  "id": "atom:interleaving",
  "kind": "atom",
  "title": "Interleaving — mix it up instead of blocking",
  "aliases": [
    "legacy:learning-corpus/00-learning-to-learn/interleaving"
  ],
  "language": "en",
  "shell": "nucleus",
  "type": "method",
  "summary": "Interleaving — mixing different problem types or topics within a study session rather than practicing one to exhaustion before moving on — improves the ability to tell categories apart and to choose the right approach. It is a desirable difficulty: it feels harder and slower but transfers better.",
  "depths": {
    "eli5": "Instead of doing twenty of the same kind of problem in a row, mix different kinds together. It feels messier and harder, but it trains you to recognize which kind of problem you're looking at — which is the part that actually matters on a real test, where the problems don't come labeled.",
    "core": "Interleaving — mixing different problem types or topics within a session, rather than 'blocking' (doing all of one type before the next) — is rated MODERATE utility by Dunlosky et al. (2013). Its main benefit is on DISCRIMINATION and choice: blocked practice lets you apply the same method on autopilot, but interleaving forces you to first figure out WHICH method a problem calls for, which is the skill you actually need when problems aren't pre-sorted. It is a desirable difficulty — it feels harder and lowers in-session performance while improving later transfer.",
    "deep": "Interleaving illustrates a subtlety of desirable difficulties: it can make practice-session performance look WORSE even as it makes test performance better, which is exactly the kind of signal the fluency illusion misreads. A learner judging by how smoothly the session went would wrongly prefer blocking. This is also why interleaving is rated 'moderate' rather than 'high' — the benefit is real but more context-dependent (strongest when the categories are confusable and the skill is choosing among them) than the across-the-board wins of retrieval and spacing."
  },
  "note": "Interleaving lowers how well practice FEELS while raising how well you do on the test. Mixing related-but-confusable topics is where it helps most — it trains you to tell them apart.",
  "sources": [
    "Dunlosky et al. (2013), PSPI — interleaving rated moderate utility",
    "Bjork — desirable difficulties"
  ],
  "resources": [
    {
      "label": "American Educator — \"Strengthening the Student Toolbox\" (Dunlosky summary; interleaving)",
      "url": "https://www.aft.org/ae/fall2013/dunlosky"
    },
    {
      "label": "Bjork — desirable difficulties (interleaving as an instance)",
      "url": "https://www.structural-learning.com/post/robert-bjork-teachers-guide-desirable"
    }
  ],
  "art_prompt": "two decks of differently shaped cards being shuffled together into one mixed stack, beside a tidy unmixed stack that looks easier but duller",
  "lesson": "### Mix it up\n\n**Interleaving** means mixing different problem types or topics within a session, instead of *blocking* (doing all of one type before moving on). Dunlosky et al. rate it **moderate utility**.\n\n### What it actually trains\n\nBlocked practice lets you run the same method on autopilot. Interleaving forces you to first figure out **which** method a problem calls for — and that discrimination skill is exactly what you need on a real test, where problems don't come labeled.\n\n### A desirable difficulty with a twist\n\nInterleaving can make your *practice session* look worse even as it makes your *test* better. A learner judging by how smoothly the session went (the fluency illusion) would wrongly prefer blocking. It's rated 'moderate' rather than 'high' because the benefit is more context-dependent — strongest when categories are confusable.",
  "quiz": [
    "atom:interleaving#ac1d97bdc93b4d23",
    "atom:interleaving#018d5df9caa590a0",
    "atom:interleaving#c00d0b722d82d2af"
  ],
  "source": {
    "file": "learning/app/corpus/00-learning-to-learn.json",
    "license": "CC-BY-4.0 (prose); empirical claims are facts traceable to cited sources"
  },
  "deck_version": "0.1.0",
  "tier": "draft",
  "rights": {
    "licence": "CC-BY-4.0",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow",
      "abstract": "allow",
      "quotation": "allow",
      "transcript": "allow"
    },
    "basis": "deck meta.license: CC-BY-4.0 (prose); empirical claims are facts traceable to cited sources"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "requires",
      "target": "atom:desirable-difficulties"
    },
    {
      "type": "part-of",
      "target": "dataset:learning-corpus/00-learning-to-learn"
    }
  ]
}
```

```json
{
  "schema": "bucket.data/1",
  "id": "atom:interleaving#ac1d97bdc93b4d23",
  "kind": "quiz-fact",
  "title": "Interleaving — mix it up instead of blocking",
  "aliases": [
    "legacy:items/00-learning-to-learn/interleaving/0"
  ],
  "language": "en",
  "level": "recall",
  "prompt": "What is interleaving, and how is it rated by Dunlosky et al.?",
  "answer": "Interleaving is mixing different problem types or topics within a study session rather than blocking (doing all of one type first). Dunlosky et al. (2013) rate it MODERATE utility.",
  "prompt_hash": "ac1d97bdc93b4d23c44dcd8125a9de977e537f9871f0fd6f65d041b5af77c2ac",
  "source": {
    "file": "learning/app/corpus/00-learning-to-learn.json",
    "license": "CC-BY-4.0 (prose); empirical claims are facts traceable to cited sources"
  },
  "tier": "draft",
  "rights": {
    "licence": "CC-BY-4.0",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow",
      "abstract": "allow",
      "quotation": "allow",
      "transcript": "allow"
    },
    "basis": "deck meta.license: CC-BY-4.0 (prose); empirical claims are facts traceable to cited sources"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "part-of",
      "target": "atom:interleaving"
    }
  ]
}
```

Validator failures: `source.url` is absent on both. The quiz item's id today is `00-learning-to-learn/interleaving/0`.
