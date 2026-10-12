# Advisor Engine

A founder-only command over the private contact store. It takes a field, topics or a short description, plus country constraints, and lists advisors from the rankable pool with reasons. Bead bkt-l28u, slices 0 and 1. Plan: `~/agfarms/.plans/bkt-l28u-advisor-engine.md`. Governance drafts: `docs/advisors/`.

## Privacy Rules

- The store opens read-only. No command here writes to it.
- Derived data lives in `~/.local/share/advisor-engine/` at mode 0700. Every write goes through one guard that refuses a path outside that directory or inside a git working tree.
- The engine database holds ids, topics, counts and keyed hashes. It holds no name and no address. Names are read from the store when a result is shown.
- Tests run on a synthetic store of invented people that `tests/conftest.py` generates.

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

`--review` saves a `bucket.advisor-review/1` file under `out/` in the engine directory. Open it in the People workspace.

Each result opens with one of three headings.

| Heading | When | What shows |
|---|---|---|
| Order withheld | Under 50 candidates after the filters | The count, the reason, and the candidates in name order with their reasons |
| Untested order | 50 or more candidates, and no passed retrieval test for the country and field | Rows sorted by topical overlap, with reasons, and no rank number or percentile |
| Tested ranking | The country and field passed the slice 2 test, recorded in `strata-tests.json` | Rank and percentile |

No stratum has a test today, so every result is one of the first two.

The coverage statement under the heading gives the pool size, the count left out as unreviewed identity matches, and the share left out for the country and for the country and field together. It warns when the share passes 50% and when the pool is under 100.

## Who Is Listed

- An advisor is rankable when the record carries its own OpenAlex id, or a high-confidence match to one. Medium and low matches stay out of the features and out of every result.
- The person has an affiliation year of 2018 or later, and no emeritus or retired title.
- No CSrankings-derived row feeds any feature.
- The do-not-contact table and `removal-list.txt` are read fresh on every query and every reveal, and widened to the whole identity cluster: matches in both directions, merged ids, shared ORCID or OpenAlex ids, and stored cross-ids. If either cannot be read, the command exits non-zero and prints no list.

`removal-list.txt` sits in the engine directory. One entry per line: `person:<id>`, `orcid:<id>`, `openalex:<id>`, `email:<address>` or `name:<name>`.

## Topic Fit

The score is topical fit alone: an idf-weighted overlap between the query topics and the OpenAlex topics the store holds for each advisor, at topic, subfield and field level, with fixed weights 1.0, 0.5 and 0.25. The store keeps three topics per person, so the profile is coarse.

`BKT_TOPIC_TAXONOMY` names the topic taxonomy file that `prime_directions --basis-openalex` cached. It supplies the subfield of each topic and the words a description is matched against. Without it the build keeps two levels and matches a description against topic names alone.

This slice calls no external API. Admired works need an OpenAlex lookup and are refused.

## Address Reveal

Addresses never print in a query. One address prints with an explicit flag, for one advisor per call:

```bash
advisor-engine reveal a123 --show-address
```

It needs a direct or high identity match and a high-confidence contact with a public source, and it prints the source, the URL and the date seen. Contacts matched by name and institution, and contacts with no public source, are refused. The cap is 20 a day. Each call, granted or refused, appends the time, a keyed hash and the outcome to `reveal.log`. The log holds no address and no name.

`docs/advisors/COUNSEL-CHECKLIST.md` item C5 covers the founder's own use of stored addresses. The plan places this command behind that item.

## Tests

```bash
cd tools/advisor-engine && memrun python3 -m pytest tests -q
```

## Rollback

Delete `~/.local/share/advisor-engine/`. The store is unchanged.
