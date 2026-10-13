# Advisor Engine

A founder-only command over the private contact store. It takes a field, topics or a short description, plus country constraints, and lists advisors from the rankable pool with reasons. Bead bkt-l28u, slices 0 and 1. Plan: `~/agfarms/.plans/bkt-l28u-advisor-engine.md`. Governance drafts: `docs/advisors/`.

## Privacy Rules

- The store opens read-only. No command here writes to it.
- Derived data lives in `~/.local/share/advisor-engine/` at mode 0700. Every write goes through one guard that refuses a path outside that directory or inside a git working tree.
- The engine database holds ids, topics, counts and keyed hashes. It holds no name and no address. Names are read from the store when a result is shown.
- Tests run on a synthetic store of invented people that `tests/conftest.py` generates.

## Founder Acknowledgement

The governance drafts in `docs/advisors/` are unsigned. Every command refuses to run until the founder has read them and created, by hand, the file `~/.local/share/advisor-engine/founder-acknowledgement.txt` holding these two lines:

```
I have read the slice 0 documents in docs/advisors.
This tool is for my own use on this machine.
```

The tool never writes that file. The refusal names the documents and the file.

## Setup

```bash
export BKT_CONTACT_STORE=~/.local/share/researcher-contacts/contacts.sqlite
export BKT_AUTHORS_WIDE=~/agfarms/.wt-atlas-openalex-wide/data/processed/openalex_authors_wide
export BKT_TOPIC_TAXONOMY=~/agfarms/bucket-foundation/openalex-topics.json
tools/advisor-engine/advisor-engine build
```

The wrapper runs every command under `memrun`. A build reads the store in keyset batches, reads activity years from the authors parquet, and prints the pool tables of the plan. Run one command at a time. Every command refuses to start under 20 GB free.

## Query

```bash
advisor-engine query --field "Neuroscience" --country US --text "sleep and memory consolidation in the hippocampus"
advisor-engine query --topic "Photoreceptor and optogenetics research" --exclude-country FR --limit 40
advisor-engine query --query-file my-query.json --review
```

`--review` saves a `bucket.advisor-review/1` file under `out/` in the engine directory. Open it in the People workspace. Rows of an untested or withheld result carry no rank, score or percentile.

Each result opens with one of three headings.

| Heading | When | What shows |
|---|---|---|
| Order withheld | Under 50 candidates after the filters | The count, the reason, and a filtered directory: the candidates in name order |
| Untested order | 50 or more candidates, and no passed retrieval test for the country and field | Rows sorted by topical overlap, with reasons, and no rank number or percentile |
| Tested ranking | The country and field passed the slice 2 test, recorded in `strata-tests.json` | Rank and percentile |

No stratum has a test today, so every result is one of the first two. `strata-tests.json` has no writer yet. Slice 2 adds the test that fills it.

A withheld result is a directory of people filtered by field and country. It carries no recommendation. It passes the same listing checks as an ordered result, the do-not-list check and both gates among them, and it carries the same coverage statement. It is for the founder alone and needs its own review before any student sees one.

The coverage statement under the heading gives the pool size, the count left out as unreviewed identity matches, and the share left out for the country and for the country and field together. It warns when the share passes 50% and when the pool is under 100.

## Who Is Listed

- An advisor is rankable when the record carries its own OpenAlex id, or a high-confidence match to one. Medium and low matches stay out of the features and out of every result.
- The person has an affiliation year of 2018 or later, and no emeritus or retired title.
- No CSrankings-derived row feeds any feature.
- The do-not-contact table and `removal-list.txt` are read fresh on every query, and widened to the whole identity cluster: matches in both directions, merged ids, shared ORCID or OpenAlex ids, and stored cross-ids. If either cannot be read, the command exits non-zero and prints no list.

`removal-list.txt` sits in the engine directory. One entry per line: `person:<id>`, `orcid:<id>`, `openalex:<id>`, `email:<address>` or `name:<name>`.

## Topic Fit

The score is topical fit alone: an idf-weighted overlap between the query topics and the OpenAlex topics the store holds for each advisor, at topic, subfield and field level, with fixed weights 1.0, 0.5 and 0.25. The store keeps three topics per person, so the profile is coarse.

`BKT_TOPIC_TAXONOMY` names the topic taxonomy file that `prime_directions --basis-openalex` cached. It supplies the subfield of each topic and the words a description is matched against. Without it the build keeps two levels and matches a description against topic names alone.

This slice calls no external API. Admired works need an OpenAlex lookup and are refused.

## Addresses

The tool prints no address under any flag. The query output and the review file pass an address scan, and a hit aborts the command with nothing written. A reveal command belongs to slice 5 of the plan, behind counsel items C5 and F8 in `docs/advisors/COUNSEL-CHECKLIST.md`.

## Tests

```bash
cd tools/advisor-engine && memrun python3 -m pytest tests -q
```

## Rollback

Delete `~/.local/share/advisor-engine/`. The store is unchanged.
