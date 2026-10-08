# Bucket Data Standard

Status: draft v3, `bucket.data/1`. A proposal. Nothing is built. Awaiting critic review and founder decisions. Epic `bkt-0o06`. Every count here was read from `origin/dev` at `78f980bb1` on 2026-10-01.

## Founder Decisions

Only the founder can settle these eight. Each one blocks the named work, and nothing else in the standard waits.

| # | Decision | Blocks |
|---|---|---|
| 1 | Do the 599 canon excerpts ship, and under which facet: no, link only, or yes. If yes, the quotation length cap. | The excerpt migration, every pack, every node. |
| 2 | Which rights model is the base. | The validator's hard failures. |
| 3 | Does `-17000` in `src/data/canon-timeline.json` mean 17000 BCE or 17,000 years ago. | The globe records and the time scrubber. |
| 4 | Who allocates `claim_no` and approves a new authored id. | Step 4 of the migration and every later new record. |
| 5 | Deck prose: the decks state CC-BY-4.0 and `rights-policy.json` states MIT. One ruling. | The atom migration and the pack that ships atoms. |
| 6 | Which roles are human reviewers and may set `verified`. | Any record leaving `unverified`. |
| 7 | Who owns the licence list, including each `LicenseRef-*` entry. | Licence validation on every record. |
| 8 | Confirm that MIT is the licence of the figure, site and event indexes. | The globe records in step 2 of the migration. |

Lascaux is dated to about 17,000 years ago, which is near 15000 BCE. The file's other negative years read as BCE: Giza at `-2560`, Buddha at `-563`. Decision 3 settles one convention for the whole file and names the reference year if the answer is "years ago". The same answer governs `sacred-history.json`: reading Zoroaster's `-1000` at century precision as the century 1000 to 901 BCE is an assumption of this draft.

## Scope

The standard covers every dataset the app, the site, a pack or a feed402 response reads. It fixes one record model, the id grammar, dates, rights, verification, relations, the canonical byte form and the order of migration. Ranking, embedding models and payment stay outside it.

## Inventory

### Canon and research data

| Dataset | Path | Count | Id today | Gaps |
|---|---|---|---|---|
| Canon excerpts | `bucket-canon/*/sub-claims/*/*.md` | 599 files, plus 7 `INDEX.md` | The path; `rowid` is the sorted position, 0 to 598 | 573 distinct file slugs: 26 slugs appear in two branches, 11 of those pairs byte-identical. Every one is a YouTube transcript quotation. URL and capture date present, licence absent. 219 files name Kruse in their text; 235 quote a video whose folder or `info.md` names him. 280 distinct videos. |
| Evidence passages | `_intake/embeddings/claim-evidence.jsonl` | 599 lines, 5,990 passages, ten per excerpt | Line number as `claim_id`; packs look passages up by `concept::slug` | 582 distinct `concept::slug` keys: 17 keys belong to two excerpts in different branches. 37 excerpts hold one passage text twice. 198 passages hold an escaped HTML entity. Scores are floats. Licence is inferred from the top folder of `source_path`. |
| Primary papers | `bucket-canon/**/primary-papers.yaml` | 166 records in 36 files, 164 unique ids | `bkt-` plus 12 hex, the same shape as a bead id | Two ids appear twice inside `05-biophysics/bioelectric-lineage`. `oa_status.license` is null on 143. `provenance_signoff` reads `pending: gianyrox` on 31. Two records have no DOI. 21 carry `tier: OUTCOME`, a different meaning from the protocol's `canon_tier`. |
| Explore sources | `src/data/explore-sources.json` | 11,619 rows | Tuple of kind letter and upstream id | 258 null years. Author is one string; 7,652 end in `et al.`. One DOI holds a colon: `10.1023/a:1025493705728`. Licence is one line per kind letter. 21 titles, compared without case, appear under two kind letters. |
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
| World indicators | `src/data/world-indicators.json` | 211 countries, 32 indicators | `wb-<iso3>` | Float values keyed by the label text, such as `GDP (current US$)`. The largest is 28,750,956,130,731.2. Source and licence in one sentence. |
| Blue zones | `src/data/blue-zones.json` | 5 | `bz-<slug>` | Source is one sentence. No licence. |
| Research atlas manifest | `src/data/research-atlas-manifest.json` | 9 dataset entries | Table name | Licence is the string `MIT (code) / CC-BY-4.0 (data)`. Points at parquet files outside the repo. |
| Evidence search fixture | `scripts/research-os/route-characterization/evidence-search.json` | 11 recorded route cases | Case label | A test fixture. It holds no canon records and is listed so that no reader mistakes it for a dataset. |
| BibTeX exports | `bucket-canon/**/*.bib` | 37 files; 6 more `.bib` files sit under `papers` and `tools` and hold paper references | BibTeX key | A second rendering of the yaml papers. Under the standard it is generated from the work records. |
| Reports | `reports/<slug>/report.json`, rows in `graph.reports` | 7 records: 4 public, 3 private | Slug | `docs/REPORTS.md`. Already in canonical form. Four public papers hold only their PDF as source; the LaTeX is in research-atlas. |

### Learning corpus

| Deck | Path under `learning/app/corpus` | Count | Gaps |
|---|---|---|---|
| Eight science decks | `00-learning-to-learn.json` to `07-mind.json`, `biophysics.json` | 487 atoms, 998 quiz items | Seven atom ids repeat across decks with different content: `central-limit-theorem`, `godel-incompleteness`, `lagrange-multipliers`, `equivalence-principle`, `le-chatelier`, `nernst`, `hodgkin-huxley`. A quiz item has no id in the file. Licence is one sentence per deck. |
| `lang-core` | `lang-core.json` | 244 atoms, 17 languages | Licence is a paragraph naming Wiktionary under CC BY-SA 3.0. |
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
| Research OS policy | `learning/research-os/ai/rights-policy.json` | `allow`, `permission`, `basis`, `evidence` per rule; status `draft`, reviewer an agent | 33 index rules, 4 quote rules; 24 allow, 13 refuse |
| Sacred history tiers | `_intake/sacred-history-corpus/spec/rights.json` | Tier A full text, Tier B citation and locator only, manuscript images never stored | 44 sources: 18 A, 6 B, 20 decided per item; 15 licence classes |
| Canon pack | `packages/bkt/src/pack/canon.ts` and `rights.ts` | A `permitted` flag per source, plus a denylist of one name pattern, two path prefixes and the video ids that match | Computed at build time |
| Explore licences | `src/data/explore-sources.json` | One sentence per kind letter | 7 |

### Hashes on the Globe Files

`canon-embeddings.json` lists three sources: `src/data/canon-timeline.json`, `src/data/canon-sites.json`, `canon-figures/figures.json`. It carries two hashes. `inputSha256` is the sha256 of the 260 `id<TAB>text` lines that `scripts/canon-explorer/embed.py` derives from those files. `rankSourceSha256` is the sha256 of the source text of two Python functions, `rank_order` and `load_vectors`. Proposal v2 states that `rankSourceSha256` covers the three files. The code says `inputSha256` does. CI therefore asserts `inputSha256` for the globe files.

## Record Model

A record is one JSON object. Every record carries the common fields. A kind adds its own.

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | `bucket.data/1` |
| `id` | yes | See Ids |
| `kind` | yes | One of the 16 kinds |
| `title` | yes | Display name. A language atom takes its `gloss`. |
| `aliases` | no | Other identifiers, each `<scheme>:<value>` |
| `language` | no | BCP 47 tag. A record in several languages states `mul` and lists every tag in `languages`. |
| `creators` | no | `[{type: person or org, family, given, name, ids, wallet, role}]` |
| `creators_original` | no | The source's author string, kept when it cannot be split or ends in `et al.`; `creators_truncated` is then true |
| `dates` | no | See Dates |
| `source` | yes | `{url, license, retrieved_at, file, sha256}`; `file` is the repo path the record came from |
| `sha256` | when Bucket holds the bytes | Hash of the work's bytes, as in `docs/foundation/PROTOCOL.md` |
| `tier` | yes | `draft`, `candidate` or `canon` |
| `provenance` | no | `[{action, at, by, via}]` |
| `cite` | when a citation fee applies | `{price_usd, payout_wallet, license}` as in `docs/foundation/PROTOCOL.md`, where `payout_wallet` is required |
| `rights` | yes | See Rights |
| `verification` | yes | See Verification |
| `relations` | yes, may be empty | See Relations |
| `location` | no | `{lat_e6, lng_e6}`, degrees times 10^6 |
| `living` | on `person` | `yes`, `no` or `unknown`. See Additional Coverage |
| `embargo_until` | no | Date before which the record stays out of packs and feeds |

An implementation preserves a field it does not know. `docs/foundation/PROTOCOL.md` section 4 already requires this of sidecars.

A field name means one thing. `tier` is the canon tier everywhere. The yaml papers' `tier: OUTCOME` becomes `outcome_tier`, and the numeric `tier` of `lang-core`, which orders categories from 0 to 10, becomes `order_tier`.

## Kinds

| Kind | Extra fields, as today's records carry them |
|---|---|
| `work` | `venue {name, issn, publisher}`, `open_access {is_oa, oa_url, repository}`, `citation_count`, `concepts`, `canon_score`, `canon_score_reasons`, `branches`, `summary`, `snippet`, `subjects`, `formats [{media_type, url}]`, `doi_original`, `outcome_tier` |
| `excerpt` | `claim_no`, `text`, `text_sha256`, `locator {timestamp, seconds}`, `branch`, `concept`, `cross_concepts`, `score`, `pattern_signals`, `curation` |
| `claim` | `statement`, `side_a`, `side_b`, `confidence_e6`, `claim_class`; evidence arrives through `evidence-for` relations |
| `figure` | `era`, `region`, `tradition`, `branches`, `cross_branches`, `primary_works`, `tags`, `added_in_pass`, `bio`, `alt_names` |
| `group` | The `figure` fields; members point at it with `part-of` |
| `person` | `living`, `living_source`, `figure_class`, `historicity`, `motifs`; name parts sit in `creators[0]` |
| `site` | `location`, `civilization`, `site_class`, `branch`, `links {lidar, wikipedia, unesco}` |
| `event` | `location`, `event_class`, `branch`, `traditions`, `disputed`, `note`, `layer` |
| `concept` | `branch`, `alt_names` |
| `topic` | `branch`, `top_terms`, `variance_ratio_e6` |
| `atom` | `shell`, `type`, `equation`, `summary`, `depths {eli5, core, deep}`, `note`, `sources`, `resources`, `art_prompt`, `lesson`, `quiz`, `deck_version`; language atoms add `gloss`, `category`, `pos`, `order_tier`, `hv`, `languages`, `forms [{language, word, ipa}]` |
| `quiz-fact` | `level`, `prompt`, `answer`, `prompt_hash` |
| `dataset` | `record_count`, `sha256`, `generator`, `inputs` |
| `pack` | `record_count`, `sha256`, `min_client`, `manifest` |
| `generation` | `tool`, `run_id`, `model`, `revision`, `state`, `links` |
| `production` | `category`, `commit`, `pr`, `url`, `summary` |

## Ids

An id is fixed in the file and checked by CI. The validator never invents one at read time. Ids come from two origins, and each kind has exactly one.

| Origin | Kinds | Rule |
|---|---|---|
| Authored by a person | `figure`, `group`, `person`, `site`, `event`, `concept`, `topic`, `atom`, `dataset`, `pack`, and the `claim_no` of an excerpt | A person picks the slug. Founder decision 4 names who approves it. |
| Derived from an upstream identifier | `work`, `excerpt`, `claim`, `quiz-fact`, `generation`, `production`, and every child record | A deterministic rule maps the upstream identifier to the slug. CI recomputes the rule and rejects a mismatch. |

1. The form is `<kind>:<slug>`. The first colon ends the kind.
2. A slug is printable ASCII. Space, `:`, `#` and `%` are percent-encoded with upper case hex. The DOI `10.1023/a:1025493705728` gives `work:d/10.1023/a%3A1025493705728`.
3. CI rejects a duplicate id anywhere in the repo.
4. Today's slugs stay. `euclid` becomes `figure:euclid`; the timeline row with the same slug becomes `event:euclid`. The 164 `bkt-` paper ids stay as `work:bkt-<12 hex>`.
5. An explore row is `work:<letter>/<upstream id>`. The 11,619 ids are derived, written to the file once, and never recomputed from a title.
6. An excerpt is `excerpt:<slug>`, the file name without `.md`. Branch and concept are fields, so a reclassified excerpt keeps its id. 26 slugs occur twice today. For each, the lower `claim_no` keeps the bare slug and the higher takes `<slug>.<claim_no>`. The 11 byte-identical pairs are joined by `same-as`.
7. An atom is always `atom:<deck>/<slug>`. Two atoms are joined by `same-as` only on an editor's call. The seven repeats today differ in `requires` and prose.
8. A child id is `<parent>#<16 hex>`. The hex is the first 16 characters of the sha256 of the normalised text, a line feed, and the ordinal in decimal. Normalised means NFC, each whitespace run collapsed to one space, trimmed. The ordinal counts earlier children of the same parent with the same normalised text and is 0 for the first. The 37 repeated passage texts get ordinals 0 and 1. Reordering distinct children changes no id.
9. A DOI is lower case and held as the alias `doi:<value>`, with the original spelling in `doi_original`. This joins the 6 founding DOIs to their yaml records.
10. Copies of one work stay separate records joined by `same-as`. A title is never an identity: 21 titles already collide inside `explore-sources.json`.
11. Every existing id is kept as a `legacy:<dataset>/<old id>` alias.
12. Alias uniqueness is stated over `same-as` classes. Take the classes of the symmetric, transitive closure of `same-as`. An external alias such as `doi:` maps to exactly one class. A `legacy:` alias maps to exactly one record.
13. A retired id stays in the file as a tombstone with a `superseded-by` relation. A tombstoned id is never assigned again. CI checks every new id against the tombstones.
14. `claim_no` comes from a counter file, `bucket-canon/CLAIM-NO`, one line holding the next free number. It reads 599 after the migration. A PR that adds an excerpt takes the number and increments the line in the same commit. Two concurrent PRs both edit that line, so git reports a conflict on the second, and its author takes the next number after rebasing. CI checks that the file equals the highest `claim_no` plus one.

The two duplicated paper ids in `bioelectric-lineage/primary-papers.yaml` fail rule 3 today and are merged before the works migration.

## Stored References

Bug `bkt-3wv3`. `export.ts` builds an item id as `<deck file>/<atom id>/<index>`. `Store.importPack` upserts on that id and deletes nothing. `attempts.item_id` references it. Reorder a deck and each stored attempt points at a different question.

The fix, in one PR ahead of every other migration:

1. `export.ts` emits the child id, a `prompt_hash` that is the full sha256 of the normalised prompt, and an optional authored `replaces: [prompt hash]`.
2. `store.ts` gains migration 9. `MIGRATIONS` holds eight entries today. Migration 9 adds `items.prompt_hash`, `items.retired_at`, `attempts.prompt_hash` and the table `item_alias(old_id, new_id)`. It backfills both hash columns from the prompt each row holds at that moment, before any import runs.
3. `recordAttempt` writes the item's `prompt_hash` on every new attempt and into the sealed outbox payload.
4. `importPack` first snapshots the device's own `(id, prompt_hash)` rows. For each old row, inside one transaction, it looks for an incoming item of the same atom with the same prompt hash, then for one whose `replaces` lists that hash. On a hit it writes an alias row and re-points the attempts. On a miss it sets `retired_at` and leaves the attempts attached. It never rebinds by position.
5. A typo fix is an edit with `replaces`. The author lists the old prompt hash on the corrected item, and the history follows. An edit without `replaces` is a new question, and the old one retires with its history.
6. `item_alias` rows are permanent. A chain of renames resolves by following aliases to the end, and CI on packs rejects a cycle.

The oracle is `attempts.prompt_hash` read together with the atom id. A prompt hash alone is safe only while no prompt repeats across atoms. None of the 998 does today, and the standard does not rely on that. It records which question the learner answered, on the device, independent of any later id. The property test generates decks, applies a random sequence of reorder, insert, delete, edit, and edit with `replaces`, imports each, and asserts that every attempt joins to an item of the same atom whose `prompt_hash` or `replaces` holds the attempt's own hash, or to a retired item. On a real device the same query runs after migration 9 and reports attempts that fail it.

Backfill limit: an attempt recorded before migration 9 takes the hash of the prompt its item holds when the migration runs. If an earlier import already rebound it, the hash is wrong and nothing on the device can show it. The migration report states the count of pre-existing attempts so the scale is known.

### Sync

The app has an `outbox` of sealed attempt payloads and no receiving side in `packages/bkt`. The payload gains `prompt_hash`, so a server or a second device resolves an attempt by the atom id together with the prompt hash and ignores the sender's item id. Two devices on different pack versions agree on the hash even when their ids differ. `item_alias` is device-local and is not synced, because each device derives it from the packs it imports.

### Other Tables

| Table | Key today | Treatment |
|---|---|---|
| `learn_cards` | `(deck, card_id)`, where `card_id` is the atom slug | Already scoped by deck, so `atom:<deck>/<slug>` maps to it one to one. No row moves. An atom renamed later is carried by an `atom_alias` row added in the same migration. |
| `hai_answer` | `item_id` with no foreign key, scoped by `hai_probe.bank_version` | The probe bank is versioned as a whole and its item ids are authored in the bank. The standard requires those ids to be non-positional and leaves the rows alone. |
| `work_quiz_attempts` | `question_id` with no foreign key; daily questions use the prefix `daily:` | Questions are generated per day and never re-imported, so no rebinding can occur. The rows gain nothing and lose nothing. |

## Dates

A date is `{role, year_min, year_max, granularity, approximate, original, edtf}`, with `disputed`, `dispute_min`, `dispute_max` and `dispute` when the date is contested.

- `year_min` and `year_max` are integers in astronomical years. Year 1 CE is 1. N BCE is 1 minus N, so 1 BCE is 0 and 300 BCE is -299.
- `granularity` is one of `day`, `year`, `decade`, `century`, `millennium`. It states how fine the claim is.
- `approximate` is a flag, default false. It states that the source hedges, as in "c. 300 BCE". It is independent of granularity.
- `original` keeps the source's own string.
- `edtf` is optional and is a rendering. Sorting and range queries use the integers.

| Granularity | `year_min`, `year_max` |
|---|---|
| `day`, `year` | Equal: the year |
| `decade` | A 10-year span, such as 1920 and 1929 |
| `century` | A 100-year span. The 10th century BCE, 1000 to 901 BCE, is -999 and -900 |
| `millennium` | A 1000-year span |

The validator rejects a span that does not match the granularity. `approximate` does not widen the span.

A disputed date keeps the conventional claim in `year_min` and `year_max`. `dispute_min` and `dispute_max` bound every position in the dispute, and `dispute` states it in words. Zoroaster's conventional century is -999 to -900, and the dispute runs from -1999 to -500.

The scrubber shows an item at year Y when `year_min` is at or before Y. It uses the conventional span and ignores the dispute bounds.

EDTF renderings: a year of at most four digits is written with four, `-0299`. A year beyond four digits takes the `Y` prefix, so 17000 BCE is `Y-16999`. `approximate` adds `~`, as in `-0324~`. An aligned decade or century uses `X`, as in `-09XX`. Any other span is written as the interval `year_min/year_max`.

`sacred-history.json` stores `precision` on its 21 timeline rows: 13 `year`, 7 `century`, 1 `decade`. Ten rows are `disputed`. Its `precision` maps to `granularity` unchanged. The canon timeline and sites store neither field, so their records fail validation on `granularity` until a person supplies it.

## Rights

One object replaces the four models in use.

```json
{
  "licence": "CC-BY-4.0",
  "jurisdiction": "US",
  "status": "asserted",
  "share_alike": false,
  "facets": { "metadata": "allow", "abstract": "allow", "quotation": "allow", "full_text": "deny", "transcript": "link-only", "image": "deny" },
  "basis": "where the claim comes from"
}
```

- `licence` is an SPDX identifier from the licence list, or a `LicenseRef-*` identifier the list defines. It names the terms under which Bucket redistributes the allowed facets. A record with no licence fails validation.
- `jurisdiction` is an ISO 3166 code and is required on a `LicenseRef-*` whose reach is one country. "Public domain in the US" is `LicenseRef-PD-US` with `US`. A pack built for another jurisdiction treats the facets as `deny`.
- `status` is `asserted` or `verified`.
- Each facet is `allow`, `link-only` or `deny`. An absent facet reads as `deny`.
- `share_alike` true carries the licence onto every record `derived-from` this one.

### Facets

| Facet | Covers |
|---|---|
| `metadata` | Title, creators, dates, identifiers, venue, links |
| `abstract` | The author's or publisher's abstract or summary |
| `quotation` | A verbatim passage up to the length cap, with attribution and a locator |
| `full_text` | The complete text of a written work, such as a book |
| `transcript` | The complete text of speech from a recording |
| `image` | Any image bytes, including covers and manuscript scans |

The length cap is part of founder decision 1. The default is 90 words, the figure `rights-policy.json` already uses for attributed quotation.

### Rules

1. The effective facet is the minimum, with `deny` lowest and `allow` highest, over the record and every record it reaches by `quotes` or `derived-from`.
2. A derived artefact obeys rule 1 row by row. Each vector row, evidence passage and graph node either is a record or carries a `record` field holding the id of its source record. A builder drops the rows whose source is denied and keeps the rest. An artefact with no row-level link is denied as a whole.
3. `source.license` is the upstream's own statement, copied verbatim as evidence. `rights.licence` is Bucket's determination and governs what ships. Where the two disagree the validator warns, and the record cannot reach `verified` until `basis` explains the difference.
4. `status: verified` requires a human reviewer role under founder decision 6, a `basis` that names the licence document with its URL, and the date it was read. An agent role sets `asserted` only.
5. A record derived from sources under different licences takes the minimum facet of rule 1 and must name one licence that all sources permit. Where none exists, as with a share-alike source combined with a non-commercial one, the combined record is `deny` on every facet except `metadata`, and the sources ship as separate records.

### Mappings

| Today | Becomes |
|---|---|
| Sacred history Tier A | `metadata`, `abstract`, `quotation`, `full_text`, `transcript` allow; `image` deny |
| Sacred history Tier B | `metadata` allow; every other facet deny |
| Manuscript images, either tier | `image` deny |
| `rights-policy.json` rule with `allow: true` | Facets allow, `basis` copied, `permission` mapped to an SPDX id, `status` asserted. `project-authored` maps to `MIT`, the repository `LICENSE`. |
| `rights-policy.json` rule with `allow: false` | Facets deny, `basis` copied |
| Canon pack `permitted: true` | `quotation` allow |
| Canon pack `permitted: false` | `quotation` deny |
| Canon pack denylist match | Every facet deny |

### Logged Conflict

Each science deck states `CC-BY-4.0 (prose)` in `meta.license`. `rights-policy.json` rule `academy-atom` states the lesson summaries are under the repository's MIT licence. Both cannot be the licence of the same prose. This is founder decision 5. Until the ruling, atom records carry the deck's statement and the validator reports the conflict.

### The 599 Excerpts

| Founder answer | Outcome |
|---|---|
| No | Text, vectors and evidence passages leave every pack. A numbered tombstone stays for each `claim_no`, so 0 to 598 remain addressable. |
| Link only | Title, link and timestamp ship. Text, vectors and passages stay out. |
| Yes | `quotation` is allow, under the length cap and with attribution on every quotation. Kruse rows stay denied until he decides. |

## Verification

```json
{ "status": "unverified", "by": "role:reviewer", "at": "2026-10-01", "basis": "what was checked", "dispute": "what is contested" }
```

- `status` is one of `unverified`, `machine-checked`, `verified`, `disputed`, `withdrawn`.
- `by` is a role id.
- The validator rejects `verified` from an agent role. A machine reaches `machine-checked` and stops there.
- `disputed` requires `dispute`. `founding-works.json` and `sacred-history.json` both hold disputed rows today.

Which roles count as human reviewers is founder decision 6.

## Canonical Form

1. UTF-8 JSON, no byte order mark.
2. Keys match `[a-z0-9_]+` and sort bytewise. ASCII keys make bytewise order and UTF-16 order agree, so TypeScript and Rust produce the same bytes.
3. A source key outside that set is never used as a key. Either it becomes a value, as with `formats [{media_type, url}]` and `forms [{language, word}]`, or it is normalised and the label kept. Normalising lowers the case, replaces each run of other characters with `_`, and trims `_` from both ends. `GDP (current US$)` becomes the key `gdp_current_us` inside an entry `{key, label, value, exponent, unit}` whose `label` holds the original text. CI rejects two labels that normalise to one key.
4. No floats. Every integer lies within plus or minus 2^53 minus 1, so each one is exact in TypeScript.
5. A fraction is an integer scaled by 10^6, rounded half to even, in a field named with the suffix `_e6`. The evidence score `0.9619635939598083` becomes `score_e6: 961964`.
6. A quantity too large for that scale states its own: `{value, exponent, unit}` means `value` times 10 to the `exponent`. The United States GDP of 28,750,956,130,731.2 is `{"value": 287509561307312, "exponent": -1, "unit": "{USD}"}`. At 10^6 it would exceed the bound.
7. A timestamp is RFC 3339 in UTC with the suffix `Z`, such as `2026-05-19T18:20:25Z`. A source timestamp with no zone is kept under a name ending in `_original` and fails validation until its zone is known.
8. Strings follow RFC 8785 section 3.2.2.2: `"` and `\` are escaped with a backslash, the control characters use `\b`, `\t`, `\n`, `\f`, `\r` or lower case `\u00xx`, and every other character is written as raw UTF-8. Strings are NFC, with one exception in rule 10.
9. No whitespace between tokens. One record per line, ended by one line feed. The examples here are indented for reading, which the canonical form forbids.
10. A quotation's `text` is stored as the raw bytes of the source and hashed as raw bytes in `text_sha256`. It is never normalised. Only the child id hash uses the normalised copy.
11. Hashing runs in TypeScript and in Rust. Lean checks test vectors as data and computes no hash.
12. One JSONL file per kind, sorted by id. Excerpts sort by `claim_no`.

UCUM has no currency units. A currency is written as a UCUM annotation holding the ISO 4217 code, `{USD}`.

## Protocol Mapping

Checked against `docs/foundation/PROTOCOL.md` section 4 and `src/lib/feed402-client.ts`.

| Field | Origin | Use in a record |
|---|---|---|
| `sha256` | `docs/foundation/PROTOCOL.md` | Kept: hash of the work's bytes |
| `canon_tier` | `docs/foundation/PROTOCOL.md`: `draft`, `candidate`, `canon` | Kept as `tier` |
| `provenance[]` | `docs/foundation/PROTOCOL.md`: `action`, `at`, `by`, `via` | Kept |
| `authors[].orcid`, `authors[].wallet` | `docs/foundation/PROTOCOL.md` | Kept inside `creators[].ids` and `creators[].wallet` |
| `source.url`, `source.license` | `docs/foundation/PROTOCOL.md` | Kept |
| `cite.license` | `docs/foundation/PROTOCOL.md` sidecar | Cite policy. It says nothing about the work's own licence, which lives in `rights.licence`. |
| `cite.payout_wallet`, `cite.price_usd` | `docs/foundation/PROTOCOL.md` sidecar; the wallet is a required field there | Kept in `cite` |
| `canonical_url` | feed402 `CitationSource` | Bucket's URL for the record. The origin of the bytes is `source.url`. |
| `kind`, `rights.facets`, `verification`, `relations`, `dates` | Bucket | New in `bucket.data/1` |

`docs/foundation/PROTOCOL.md` does not define `canonical_url`. The field belongs to the feed402 envelope, beside `retrieved_at` and `license`.

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
3. No record in a pack has an effective text facet other than `allow`. The effective facet is the minimum of rule 1 of Rights, computed over `quotes` and `derived-from` with the rank order `deny` below `link-only` below `allow`. The validator emits it per record and Lean checks it against the relations.
4. `requires` is acyclic, shown by a rank witness. This reuses `acyclic_of_rank` in `lean/BucketMath/Graph.lean`.
5. Every external alias maps to one `same-as` class and every `legacy:` alias to one record, as in rule 12 of Ids. The classes are supplied as a class index per record, and Lean checks that each `same-as` edge joins equal indices.
6. The `superseded-by` chain is acyclic, by the same rank argument.
7. `year_min ≤ year_max` on every date.

What it needs: `lean/lakefile.toml` requires no Mathlib, and one file in `BucketMath` imports `Std` from the toolchain, `leanprover/lean4:v4.33.1`. The predicate fits core Lean plus `Std`. `Graph.lean` states edges over `Nat × Nat`, and record ids are strings, so the validator emits an index from id to number and Lean checks that the index is injective before reusing the theorem.

What it cannot state: that an id was never used before, which is a property of repository history, and that a hash equals the sha256 of its text, since Lean computes no hash here. CI checks both outside Lean.

The validator emits the ranks and indices as data and Lean checks them.

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

- **Living persons.** A `person` carries `living`: `yes`, `no` or `unknown`. The default is `unknown`. A record states `yes` or `no` only with a `living_source`. A record that is `yes` or `unknown` and has no death date holds public professional facts only. A correction is made on request.
- **Takedown.** A withdrawn record becomes a tombstone with `verification.status: withdrawn`, and a signed revocation is published. A revocation recalls nothing already copied. Bead `bkt-12f3` records four Zenodo records that hold the repo at each release tag.
- **Embargo.** `embargo_until` keeps a record out of packs and feeds until the date.
- **Quantities.** A quantity is `{value, exponent, unit}` with a UCUM unit, as in Canonical Form. The 32 world indicators carry their unit inside a label today.
- **Images.** An image is `{sha256, alt, source}` and falls under the `image` facet.
- **Translations.** `translation-of` plus `language` on each side. The language decks need this for 17 languages.
- **Encrypted user records.** A user's encrypted records never enter a pack. A pack refers to them by id only.

## Migration

The excerpt `rowid` becomes an authored field, `claim_no`, written into each record and frozen at 0 to 598. A number is never reused, and new numbers come from the counter file in rule 14 of Ids. Files sort by it. The website's parity fixture, `scripts/fixtures/canon-search-parity.json`, pins results as `<rowid>:<concept>/<slug>`, and the vector file is aligned by row, so neither moves.

One PR per step:

1. The `bkt-3wv3` fix.
2. The validator, plus sidecar records for the globe: 114 events, 47 sites, 99 figures. The three source files stay byte-identical, and CI asserts `inputSha256`.
3. Works: explore sources, primary papers, founding works.
4. Excerpts and evidence, after founder decision 1.
5. Atoms and quiz facts.
6. One pack format.
7. The rest: sacred history, What's New, the graph, world indicators, blue zones, the database tables.

An embedding rebuild is its own PR.

## Open Contradictions

Points where the repo disagrees with the proposal or with a review finding, and what the standard does about each.

1. `rankSourceSha256` hashes ranking code. `inputSha256` covers the three globe files, so CI asserts that one.
2. `canonical_url` is a feed402 field and is absent from `docs/foundation/PROTOCOL.md`.
3. The seven repeated atom ids hold different atoms, so `same-as` applies to none of them without an editor's call.
4. `excerpt:<slug>` alone leaves duplicates: 26 slugs occur twice. Rule 6 of Ids adds the `claim_no` suffix to the later one.
5. Evidence lookup by `concept::slug` already merges 17 pairs of excerpts.
6. No explore row has both a null year and an `et al.` author. All 258 null-year rows have a single author or none. The appendix shows one row of each.
7. `rights-policy.json` names MIT in the basis of `academy-atom` and `canon-timeline`. The rules `canon-figure` and `canon-site` say `project-authored` and name no licence. The mapping to MIT for those two rests on the repository `LICENSE`.

## Worked Examples

Each record is built by script from the file named in its `source.file`. A null or empty value in the file is left out. A value the file lacks is left out and listed under the record as a validator failure. A value that comes from no source file is a proposed default, and its `basis` says so. Relation targets are records that the same migration creates from rows that exist today. The JSON is indented for reading.

### Canon Excerpt

From `bucket-canon/07-mind/sub-claims/consciousness/004-doing-that-because-the-evidence-is-that-consciousness-and-fr.md`. The talk is by Federico Faggin on the Essentia Foundation channel.

```json
{
  "schema": "bucket.data/1",
  "id": "excerpt:004-doing-that-because-the-evidence-is-that-consciousness-and-fr",
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
      "original": "2026-05-11",
      "edtf": "2026-05-11",
      "granularity": "day"
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
    "basis": "transcript: src/data/explore-sources.json licenses.y, YouTube transcript, link only. metadata: proposed default, stated in no source file"
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

Validator failures: `rights.licence` and `source.license` are absent, and `rights.facets.quotation` waits on founder decision 1. `metadata: allow` is a proposed default. Its ten evidence passages are separate records; the first is `excerpt:004-doing-that-because-the-evidence-is-that-consciousness-and-fr#36c0b4b927ef7ae3` with `score_e6` 961964.

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
      "original": "1945",
      "edtf": "1945",
      "granularity": "year"
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
    "licence": "CC0-1.0",
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

`rights.licence` covers the metadata, the only facet allowed. Validator failure: `source.license` is absent, because `oa_status.license` is null. Left out as null: both ORCID values, `venue.publisher`.

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
          "original": "1564",
          "granularity": "year"
        },
        {
          "role": "death",
          "year_min": 1616,
          "year_max": 1616,
          "original": "1616",
          "granularity": "year"
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
  "formats": [
    {
      "media_type": "text/html",
      "url": "https://www.gutenberg.org/ebooks/1041.html.images"
    },
    {
      "media_type": "application/epub+zip",
      "url": "https://www.gutenberg.org/ebooks/1041.epub3.images"
    },
    {
      "media_type": "application/x-mobipocket-ebook",
      "url": "https://www.gutenberg.org/ebooks/1041.kf8.images"
    },
    {
      "media_type": "application/rdf+xml",
      "url": "https://www.gutenberg.org/ebooks/1041.rdf"
    },
    {
      "media_type": "image/jpeg",
      "url": "https://www.gutenberg.org/cache/epub/1041/pg1041.cover.medium.jpg"
    },
    {
      "media_type": "application/octet-stream",
      "url": "https://www.gutenberg.org/cache/epub/1041/pg1041-h.zip"
    },
    {
      "media_type": "text/plain; charset=utf-8",
      "url": "https://www.gutenberg.org/ebooks/1041.txt.utf-8"
    },
    {
      "media_type": "text/plain; charset=us-ascii",
      "url": "https://www.gutenberg.org/files/1041/1041-0.txt"
    }
  ],
  "download_count": 7439,
  "source": {
    "url": "https://www.gutenberg.org/ebooks/1041",
    "license": "Project Gutenberg, public domain in the US",
    "file": "gutenberg/PG-1041-shakespeare-s-sonnets/PG-1041.txt",
    "retrieved_at_original": "2026-05-10T21:00:30"
  },
  "sha256": "9034dcbdb674f365d6e399b229f8389052e3894a0213d1caa4fa3537a554fb3f",
  "tier": "draft",
  "provenance": [
    {
      "action": "fetched",
      "via": "gutendex",
      "at_original": "2026-05-10T21:00:30"
    }
  ],
  "rights": {
    "licence": "LicenseRef-PD-US",
    "jurisdiction": "US",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow",
      "abstract": "allow",
      "quotation": "allow",
      "full_text": "allow"
    },
    "basis": "gutenberg/PG-1041-shakespeare-s-sonnets/metadata.json copyright: false. The LicenseRef identifier is a proposed default"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failures: the capture time in `info.md` has no zone, so it sits in `retrieved_at_original`. `LicenseRef-PD-US` is a proposed default and waits on founder decision 7. The explore row's year is null, so the record has no publication date. The author's name parts are split from the file's `Shakespeare, William`. The `formats` map is a list because its keys are media types.

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
      "original": "c.325-c.265 BCE",
      "granularity": "year",
      "approximate": true,
      "edtf": "-0324~"
    },
    {
      "role": "death",
      "year_min": -264,
      "year_max": -264,
      "original": "c.325-c.265 BCE",
      "granularity": "year",
      "approximate": true,
      "edtf": "-0264~"
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
          "original": "c.300 BCE",
          "granularity": "year",
          "approximate": true
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
    "licence": "MIT",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "learning/research-os/ai/rights-policy.json rule canon-figure: project-authored, mapped to the repository LICENSE"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failure: `source.url` is absent. The years are read from the file's `c.325-c.265 BCE` and `c.300 BCE`; `grc` is the tag for the file's "Koine Greek". The licence follows the mapping table.

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
          "original": "1953",
          "edtf": "1953",
          "granularity": "year"
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
    "licence": "MIT",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "learning/research-os/ai/rights-policy.json rule canon-figure: project-authored, mapped to the repository LICENSE"
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
      "original": "Watson 1928-",
      "granularity": "year"
    }
  ],
  "source": {
    "file": "canon-figures/figures.json"
  },
  "tier": "draft",
  "rights": {
    "licence": "MIT",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "learning/research-os/ai/rights-policy.json rule canon-figure: project-authored, mapped to the repository LICENSE"
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
      "original": "Crick 1916-2004",
      "granularity": "year"
    },
    {
      "role": "death",
      "year_min": 2004,
      "year_max": 2004,
      "original": "Crick 1916-2004",
      "granularity": "year"
    }
  ],
  "source": {
    "file": "canon-figures/figures.json"
  },
  "tier": "draft",
  "rights": {
    "licence": "MIT",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "learning/research-os/ai/rights-policy.json rule canon-figure: project-authored, mapped to the repository LICENSE"
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

Validator failure: `source.url` is absent on all three. The person ids are new, since the file has no slug for either man. The file gives Watson the open lifespan `1928-` and cites no source for it, so his record states no `living` value and reads as `unknown`. His death was reported in November 2025; a reviewer adds the death date with a `living_source`.

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
    "licence": "MIT",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "learning/research-os/ai/rights-policy.json rule canon-site: project-authored, mapped to the repository LICENSE"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failures: `dates[0].granularity` and `source.url` are absent. The file's `-2560` is read as 2560 BCE.

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
      "original": "-17000",
      "edtf": "Y-16999"
    }
  ],
  "event_class": "work",
  "branch": "deep-history",
  "source": {
    "file": "src/data/canon-timeline.json"
  },
  "tier": "draft",
  "rights": {
    "licence": "MIT",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "learning/research-os/ai/rights-policy.json rule canon-timeline: project-authored, mapped to the repository LICENSE"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

Validator failures: `dates[0].granularity` and `source.url` are absent. The year shown reads `-17000` as 17000 BCE. Under the other reading it falls near 15000 BCE. Founder decision 3 picks one.

### Zoroaster Event

The row `anc-zoroaster-life` in `src/data/sacred-history.json`, a disputed date at century granularity.

```json
{
  "schema": "bucket.data/1",
  "id": "event:anc-zoroaster-life",
  "kind": "event",
  "title": "Traditional floruit of Zoroaster",
  "aliases": [
    "wikidata:Q4456",
    "legacy:sacred-history/anc-zoroaster-life"
  ],
  "event_class": "life-event",
  "traditions": [
    "zoroastrianism"
  ],
  "dates": [
    {
      "role": "occurred",
      "year_min": -999,
      "year_max": -900,
      "granularity": "century",
      "original": "-1000",
      "edtf": "-09XX",
      "disputed": true,
      "dispute_min": -1999,
      "dispute_max": -500,
      "dispute": "Dating ranges widely across scholarship, from the 2nd millennium to the 6th century BCE."
    }
  ],
  "links": {
    "wikidata": "https://www.wikidata.org/wiki/Q4456"
  },
  "layer": "anchor",
  "source": {
    "file": "src/data/sacred-history.json"
  },
  "tier": "draft",
  "rights": {
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "src/data/sacred-history.json rights.tier A: Tier-A (public-domain / open / CC0) only. No copyrighted text. Figure metadata, motifs, conventional dates, Wikidata QIDs, and AI-generated contestable correlation claims only."
  },
  "verification": {
    "status": "disputed",
    "dispute": "Dating ranges widely across scholarship, from the 2nd millennium to the 6th century BCE."
  },
  "relations": []
}
```

The file's `-1000` is read as 1000 BCE and placed in its century, an assumption that founder decision 3 confirms or corrects. The file's `generatedAt` describes the whole file and is left off the record. The dispute bounds are read from the file's note: the 2nd millennium BCE opens at 2000 BCE and the 6th century BCE closes at 501 BCE. Validator failures: `rights.licence` and `source.url` are absent. `label` becomes `title`, `eventClass` becomes `event_class`, and `wikidataUrl` moves into `links`.

### Learning Atom

The atom `interleaving` in `learning/app/corpus/00-learning-to-learn.json`, and the first of its three quiz items. The file's empty `equation` is left out. `requires` becomes a relation. `quiz` becomes a list of child ids.

```json
{
  "schema": "bucket.data/1",
  "id": "atom:00-learning-to-learn/interleaving",
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
    "atom:00-learning-to-learn/interleaving#8c44bab54682baa8",
    "atom:00-learning-to-learn/interleaving#1278abdb96f6a685",
    "atom:00-learning-to-learn/interleaving#ae6af26066382a87"
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
      "full_text": "allow"
    },
    "basis": "deck meta.license: CC-BY-4.0 (prose); empirical claims are facts traceable to cited sources. Conflicts with rights-policy.json rule academy-atom, which states MIT"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "requires",
      "target": "atom:00-learning-to-learn/desirable-difficulties"
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
  "id": "atom:00-learning-to-learn/interleaving#8c44bab54682baa8",
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
      "full_text": "allow"
    },
    "basis": "deck meta.license: CC-BY-4.0 (prose); empirical claims are facts traceable to cited sources. Conflicts with rights-policy.json rule academy-atom, which states MIT"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "part-of",
      "target": "atom:00-learning-to-learn/interleaving"
    }
  ]
}
```

Validator failures: `source.url` is absent on both, and the licence conflict of founder decision 5 is open. The quiz item's id today is `00-learning-to-learn/interleaving/0`.

### Language Atom

The atom `eight` in `learning/app/corpus/lang-core.json`. It has no title, no quiz items and an empty `requires`.

```json
{
  "schema": "bucket.data/1",
  "id": "atom:lang-core/eight",
  "kind": "atom",
  "title": "eight (8)",
  "gloss": "eight (8)",
  "aliases": [
    "legacy:learning-corpus/lang-core/eight"
  ],
  "language": "mul",
  "languages": [
    "en",
    "es",
    "fr",
    "it",
    "pt",
    "de",
    "nl",
    "sv",
    "ru",
    "ja",
    "ar",
    "el",
    "fi",
    "hi",
    "ko",
    "pl",
    "zh"
  ],
  "category": "number",
  "pos": "word",
  "shell": "prereq",
  "order_tier": 0,
  "hv": true,
  "forms": [
    {
      "language": "en",
      "word": "eight",
      "ipa": "eɪt"
    },
    {
      "language": "es",
      "word": "ocho"
    },
    {
      "language": "fr",
      "word": "huit"
    },
    {
      "language": "it",
      "word": "otto"
    },
    {
      "language": "pt",
      "word": "oito"
    },
    {
      "language": "de",
      "word": "acht"
    },
    {
      "language": "nl",
      "word": "acht"
    },
    {
      "language": "sv",
      "word": "åtta"
    },
    {
      "language": "ru",
      "word": "восемь"
    },
    {
      "language": "ja",
      "word": "八"
    },
    {
      "language": "ar",
      "word": "ثَمَانِيَة"
    },
    {
      "language": "el",
      "word": "οκτω"
    },
    {
      "language": "fi",
      "word": "kahdeksan"
    },
    {
      "language": "hi",
      "word": "आठ"
    },
    {
      "language": "ko",
      "word": "여덟"
    },
    {
      "language": "pl",
      "word": "osiem"
    },
    {
      "language": "zh",
      "word": "八"
    }
  ],
  "resources": [
    {
      "label": "Wiktionary: eight",
      "url": "https://en.wiktionary.org/wiki/eight"
    }
  ],
  "quiz": [],
  "source": {
    "file": "learning/app/corpus/lang-core.json",
    "url": "https://en.wiktionary.org/wiki/eight",
    "license": "Translations are VERIFIED from the English Wiktionary translation tables (kaikki.org raw-wiktextract-data, CC-BY-SA 3.0) — each concept ships only where Wiktionary lists a translation for the right sense. The Polingual semantic corpus is NOT used as a translation source (it is semantic-neighbour noise). English IPA from Wiktionary `sounds`. Concrete-first ordering & emoji tiles are original. Attribution: Wiktionary contributors via Kaikki (kaikki.org)."
  },
  "deck_version": "0.5.0",
  "tier": "draft",
  "rights": {
    "licence": "CC-BY-SA-3.0",
    "status": "asserted",
    "share_alike": true,
    "facets": {
      "metadata": "allow",
      "abstract": "allow",
      "quotation": "allow",
      "full_text": "allow"
    },
    "basis": "deck meta.license names Wiktionary via kaikki.org under CC-BY-SA 3.0"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": [
    {
      "type": "part-of",
      "target": "dataset:learning-corpus/lang-core"
    }
  ]
}
```

`title` is taken from `gloss`. The numeric `tier` becomes `order_tier`. `language` is `mul`, and `languages` lists the 17 tags of this atom: the deck's 16 and Chinese. `forms` is a list because a BCP 47 tag can hold characters the key rule forbids. The deck's licence text names Wiktionary under CC-BY-SA 3.0, so `share_alike` is true and the licence follows every record derived from this one. Open gap: Wiktionary is no record today, so the atom has no `derived-from` target and the minimum rule has nothing to read. The atom migration adds a `dataset:wiktionary-kaikki` source record first.

### Explore Rows

No row has both a null year and an `et al.` author, so two rows show the two cases. The URLs follow the rule in `src/lib/explore/sources.ts`.

A null year:

```json
{
  "schema": "bucket.data/1",
  "id": "work:o/W1534043326",
  "kind": "work",
  "title": "The classical groups their invariants and representations",
  "aliases": [
    "openalex:W1534043326",
    "legacy:explore-sources/o/W1534043326"
  ],
  "creators": [
    {
      "type": "person",
      "name": "Hermann Weyl",
      "role": "author"
    }
  ],
  "creators_original": "Hermann Weyl",
  "snippet": "In this renowned volume, Hermann Weyl discusses the symmetric, full linear, orthogonal, and symplectic groups and determines their different invarian…",
  "source": {
    "url": "https://openalex.org/W1534043326",
    "file": "src/data/explore-sources.json",
    "license": "OpenAlex metadata, CC0"
  },
  "tier": "draft",
  "rights": {
    "licence": "CC0-1.0",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "src/data/explore-sources.json licenses.o: OpenAlex metadata, CC0"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

An `et al.` author string:

```json
{
  "schema": "bucket.data/1",
  "id": "work:p/10002769",
  "kind": "work",
  "title": "Paired Hall states in double-layer electron systems.",
  "aliases": [
    "pmid:10002769",
    "legacy:explore-sources/p/10002769"
  ],
  "creators": [
    {
      "type": "person",
      "name": "M Greiter",
      "role": "author"
    }
  ],
  "creators_original": "M Greiter et al.",
  "creators_truncated": true,
  "dates": [
    {
      "role": "published",
      "year_min": 1992,
      "year_max": 1992,
      "granularity": "year",
      "original": "1992",
      "edtf": "1992"
    }
  ],
  "snippet": "Physical review. B, Condensed matter",
  "source": {
    "url": "https://pubmed.ncbi.nlm.nih.gov/10002769/",
    "file": "src/data/explore-sources.json",
    "license": "PubMed metadata, NLM public domain"
  },
  "tier": "draft",
  "rights": {
    "licence": "LicenseRef-PD-US",
    "jurisdiction": "US",
    "status": "asserted",
    "share_alike": false,
    "facets": {
      "metadata": "allow"
    },
    "basis": "src/data/explore-sources.json licenses.p: PubMed metadata, NLM public domain. The LicenseRef identifier is a proposed default"
  },
  "verification": {
    "status": "unverified"
  },
  "relations": []
}
```

The first record has no `dates`, and the validator accepts that, since `dates` is optional. The second keeps the row's author string in `creators_original` and sets `creators_truncated`, because the row names one of several authors. The row's fifth field holds a journal name on this record and a summary on the first; both stay in `snippet` until the works migration splits them. `LicenseRef-PD-US` is a proposed default.
