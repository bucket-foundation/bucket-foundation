# Learning Corpus

One index of the research Bucket holds on learning: the works cited, the internal claims that cite them, the methods, the definitions and the mechanisms in the app.

## Files

| File | Records | Holds |
|---|---|---|
| `works.jsonl` | 667 | One record per cited work |
| `claims.jsonl` | 306 | Internal claims with status and supporting works |
| `methods.jsonl` | 32 | Methods joined to works, claims and mechanisms |
| `definitions.jsonl` | 44 | Five terms, internal beside literature |
| `mechanisms.jsonl` | 39 | Bucket mechanisms joined to methods, parameters and measures |
| `gaps.md` | | Thin topics, unbacked claims, conflicts and unconfirmed works |
| `sources/` | | The inventories the build reads |

## Counts

- Claims by status: backed 71, backed-weak 86, unbacked 112, contradicted-internally 16, contradicted-by-evidence 11, proved 10.
- Works by verification: doi-confirmed 519, url-confirmed 18, record-has-doi 39, unconfirmed 91.
- Confirmed works by founder topic: methods 310, definitions of education 31, workplace learning 100, career learning 59, theory of knowledge 102, impact 76.
- Works by topic tag: apprenticeship 51, assessment 112, career 87, curriculum 70, definition-of-education 44, epistemics 141, feedback 64, human-ai 159, impact 95, inquiry 75, knowledge-structure 85, language 46, mastery 51, memory 74, metacognition 65, motivation 67, other 17, practice 99, transfer 52, workplace 72.

A founder topic groups the tags `links.json` lists. The methods topic adds every work the methods table cites.

## Build

`tools/learning-corpus/build.py` reads `sources/` and writes every file here. Works merge on normalised DOI, then on normalised title with first author and year; a short title contained in a longer one counts as the same title. A claim's `supports` come from its `cited_works` alone. `links.json` beside the script holds the hand-made joins: weak ideas with their claims, definition terms with traditions, method aliases, topic groups.

```
python3 tools/learning-corpus/build.py
python3 -m unittest tools/learning-corpus/test_build.py
```

`--import <folder>` refreshes `sources/` first. Open questions and dataset rows get no claim record.

## Verification States

- `doi-confirmed`: the DOI resolved at Crossref or OpenAlex and the title matched.
- `url-confirmed`: a catalogue, publisher or OpenAlex page matched the record.
- `record-has-doi`: a DOI is on file, unchecked.
- `unconfirmed`: no checked identifier.

The first two states count as confirmed unless the work is withdrawn.

## Claim Statuses

- `backed`: one or more confirmed, uncontested works.
- `backed-weak`: every work is contested or unconfirmed.
- `unbacked`: no work.
- `contradicted-internally`: two Bucket files disagree.
- `contradicted-by-evidence`: a gap-fill work marks the idea as weakly supported; `contradicted_by` links it.
- `proved`: a Lean theorem, named in `formal`.

## Licence

Records and summaries are Bucket's own, under the repository licence. Abstracts come from OpenAlex and stay under their publishers' terms, so the build keeps them in `abstracts.local.jsonl`, which git ignores; `works.jsonl` marks each work that has one. `corpus.sqlite` is ignored too. The import leaves out 2 career-work dataset rows that describe private profiles and named people.
