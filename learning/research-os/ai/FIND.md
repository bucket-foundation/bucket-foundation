# Find by meaning

The workspace's public evidence mode, bead `ros-ai-find`, under [IMPLEMENTATION.md](IMPLEMENTATION.md), "Flow" and "UI behavior". A researcher asks in their own words, reads source cards, and opens one. The research target stays where it was: a source becomes evidence when the person quotes it from its own page.

## Who reaches it

`POST` and `GET /api/research-os/evidence-search` run the same gates, in order: the flag `RESEARCH_OS_AI_SEARCH`, a verified session, consent for the workspace tools, a profile that says `18plus`, and a user id on `RESEARCH_OS_AI_SEARCH_PILOT_IDS`. A staff or reviewer role grants nothing. A minor with consent, an account that never answered the age question, and an account off the list each get a refusal that names its reason. Age here is self-reported and is an operational filter for the pilot; a child-facing launch needs its own age assurance.

The workspace calls `GET` once and offers the mode only when it answers `available`. A direct caller meets the same gates, so skipping the page reaches nothing.

## What a search does

1. Reads the admitted index revisions whose node is public and unmerged right now, and keeps the ones whose revision matches the corpus and whose branch matches the request.
2. Ranks with keyword search in this process, and with the encoder worker when one is configured, fusing both. A worker that is absent, late, down or malformed leaves keyword ranking, and the answer says `degraded`.
3. Reads eligibility again and drops any source that left the set while the search ran.
4. Builds cards from the corpus. A card is a `passage` when its quotation is admitted right now, with its locator; otherwise it is a `summary` with no locator and no quote offer.

A failure to read eligibility answers 503, so no search runs over a stale snapshot. The response carries no score, and it is `private, no-store`.

## The request

```json
{ "schemaVersion": 1, "query": "what makes the heavens look azure during daytime", "branch": "02-physics", "targetNodeId": null, "limit": 5 }
```

The query is 1 to 512 characters, the branch is a canon branch, the body is at most 8 KiB, and any other field is refused. The daily workspace tool cap applies.

## Environment

| Variable | Holds |
|---|---|
| `RESEARCH_OS_AI_SEARCH` | `1` turns the route on |
| `RESEARCH_OS_AI_SEARCH_PILOT_IDS` | The user ids allowed in, separated by commas |
| `RESEARCH_OS_EVIDENCE_DIR` | A built corpus directory; the newest under `local/evidence/` is the default |
| `EVIDENCE_WORKER_URL`, `EVIDENCE_WORKER_SECRET` | The loopback worker. Without both, search answers by keyword and says `degraded` |

## Walked here

2026-09-22, on the local stack with the 500-record corpus, its vectors, and the worker on 127.0.0.1:8431. Signed in as a pilot account at `/research-os/workspace?target=why-the-sky-is-blue`, asked "what makes the heavens look azure during daytime", and the mode returned five cards in about 100 ms: `sky-is-blue-not-violet` and `why-the-sky-is-blue` as passages with their Wikipedia locators, beside summaries. Keyword search alone finds neither. Opening a card lands on that node's page with its Quote action. `tests/e2e/evidence-search.spec.ts` walks it and skips where the pilot is not configured.

## What comes next

The curated Quote on a source's page becomes durable with the receipts in #196, and `ros-ai-import-quotes` adds target-bound quotation from imported passages. Until then, a card's quote offer points at the page that already serves it.
