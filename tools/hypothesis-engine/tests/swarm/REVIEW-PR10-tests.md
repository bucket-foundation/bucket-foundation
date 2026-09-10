# Test coverage review, PR #10 (feat/hte-k12-research-os)

Scope: `git diff origin/main..HEAD -- tools/hypothesis-engine`, 32 files, ~5,390
insertions. Reviewed against a checkout of this branch at
`/home/gian/agfarms/.wt-hte`, no source edits made.

## Summary

`hte/corpus/literature.py` ships broken: none of its own 6 shipped fixtures
parse, and 28 of 38 tests in `tests/test_corpus_literature.py` error at fixture
setup as a result. `make test` (the fast-profile every-commit gate) stops on
the first of these with `-x`. This is the single most important finding in
this review; every other item below is a completeness gap in tests that do
run.

Branch coverage at the full hypothesis profile, measured directly (`make
test-cov`, reverted after reading): **89.4%** (5,467 statements, 464 missed;
1,434 branches, 174 partial). The checked-in `tests/COVERAGE.md` reports
95.4% and lists neither `hte/api.py`, `hte/serve.py`, `hte/mcp_tool.py`, nor
the literature-adapter module among its 15 worst files: it predates this PR
and was never regenerated against it, so it should not be read as this PR's
own coverage. Per-file, from this run: `hte/corpus/literature.py` 34%
(185/317 statements missed, almost entirely the fixture-parse failure above),
`hte/serve.py` 68% (32/102 missed), `hte/corpus/production.py` 72%,
`hte/api.py` 82% (39 missed).

This review counts 16 named scenarios below as missing or weak test
coverage: 4 rated 7-10 (critical), 5 rated 5-6 (important), 7 rated 3-4
(minor completeness).

A note on the working tree: while this review was in progress, an
**uncommitted** fix for the literature-adapter bug (matching
`FINDING-2026-09-10-301` in `tests/swarm/FINDINGS-2026-09-10.md`) appeared in
several files in this worktree. That fix is not part of PR #10 as committed
at HEAD. This review describes the PR as committed, which is what is open on
GitHub; the in-progress working-tree fix is out of scope but corroborates the
finding.

## Critical gaps (8-10)

### 1. [10] Literature adapter cannot parse any of its own 6 shipped fixtures

`hte/corpus/literature.py::_parse_frontmatter` requires
`raw.startswith("---\n")`. Every fixture under `hte/data/literature-fixtures/`
carries the org voice-lint escape hatch on its own first line,
`<!-- voice-ignore-file: ... -->`, ahead of the frontmatter delimiter (this
repo's own `CLAUDE.md` requires that marker on verbatim-copied prose, and
`_parse_card_file` reads the file with no preprocessing before handing it to
`_parse_frontmatter`). The result, reproduced twice in this review with a
clean checkout at HEAD:

```
ValueError: literature adapter: ai-and-researchers/si-yang-hashimoto-2024-llm-novel-research-ideas.md has no frontmatter opening `---`
```

`tests/test_corpus_literature.py`'s `cards`/`corpus` fixtures are
module-scoped and call `literature.load_raw(FIXTURES_DIR)`; every test that
depends on either fixture fails at setup. Running the file alone: **1
failed, 9 passed, 28 errors of 38 tests** (76% of the file). Running the
fast-profile gate (`make test`, which uses `-x`) stops on the first of these
and never reaches the other 821 tests in the suite that do pass.

The "voice-ignore-line" handling the module's own comments describe (around
`_QUOTED_SCALAR_RE`/`_BARE_SCALAR_RE`) is a different mechanism: it tolerates
a trailing `# ...` comment on one scalar *line inside* the frontmatter block,
not a leading HTML comment *before* the frontmatter opens. Nothing in
`_parse_frontmatter` or `_parse_card_file` strips or skips a leading comment
line, so the feature the task description calls "the voice-ignore-line
parsing fix" does not cover the shape every real fixture in this PR uses.

Concretely, this means the following behaviors, all of which the PR's own
`tests/test_corpus_literature.py` intends to cover, have never executed
under `make test`: span char-offset/line-range locators
(`test_span_char_offsets_locate_the_exact_quote_in_the_real_file`,
`test_span_locator_carries_file_and_line_range`), evidence-tier
classification by venue/DOI, method/kind classification, ground-truth /
stemma-parent detection, vocabulary slot resolution, actor detection, and
corpus JSON round-tripping. The literature-adapter feature this PR adds is,
by its own test suite's own admission, unverified.

**Rating: 10.** This is not a missing edge case; it is the happy path for
every fixture the adapter ships with, and it fails the every-commit gate.

### 2. [7] `hypothesize()`'s temp-dir cleanup on a campaign failure is untested

`hte/api.py::hypothesize` creates `temp_root = Path(tempfile.mkdtemp(prefix="hte-hypothesize-"))`
and wraps the campaign run in `try/finally: shutil.rmtree(temp_root, ignore_errors=True)`.
No test in `tests/test_api.py` or `tests/test_api_research_os.py` ever
forces `runner.run_campaign` to raise inside that block and then checks the
directory is gone. The only related assertion,
`test_response_carries_no_absolute_path_or_env_style_value`, checks a
**successful** response's JSON body, not the filesystem after a failure.

Add: monkeypatch `runner.run_campaign` (or feed a corpus that always fails
extraction/tournament) to raise, catch the resulting `CampaignError`, and
assert the captured temp directory no longer exists. `hte-serve` is meant to
run as a long-lived process; an unverified cleanup path here is a directory
leak on every failed campaign, not a one-off.

### 3. [7] Six of `hypothesize()`'s documented request-validation errors have no test

`hte/api.py::hypothesize` validates and reports errors for `llm_mode`,
`seeds`, `max_hypotheses`, `replay_only`, and the shape of
`request['productions']` before ever building a corpus. None of the
following four validation messages is reached by any test:

- `llm_mode must be one of {'claude', 'fake'}, got ...`
- `seeds must be a positive integer, got ...` (including the explicit
  `isinstance(seeds, bool)` exclusion, so `seeds=True` should also fail and
  does not have a test)
- `max_hypotheses must be a positive integer, got ...`
- `replay_only must be a boolean, got ...`

Two more validation-adjacent paths are also untested:

- `request['productions'] must be an object or a list, got ...`: every
  existing test that hits `_normalize_productions_field` passes a dict, a
  list, or omits the key. Nothing passes a string or an int.
- `CampaignError` itself, and the `_sanitize()` helper that redacts the temp
  run directory and any `/home|/tmp|/Users|/var` path out of a campaign
  failure's message before it's re-raised. `_sanitize()` carries an explicit
  "never an absolute path in the response" contract in its own docstring
  and is never exercised by any test (see gap 2, same missing trigger:
  a forced `run_campaign` failure).

`status_min`, `prior_profile`, missing/malformed production records
(missing required field, bad `review.status`, unknown slot id, bad
`stance`, bad evidence `kind`), and the "multiple problems reported
together" contract are all well covered in `tests/test_api.py`.

### 4. [7] `hte-serve`'s generic-exception 500 path and malformed-Content-Length 400 are both untested

`hte/serve.py::_Handler.do_POST` has three distinct error responses;
`tests/test_serve.py` covers two of three 400s and misses the 500 entirely:

- Bad JSON body -> 400: tested (`test_post_hypothesize_with_bad_json_returns_400`).
- `RequestValidationError` -> 400: tested (`test_post_hypothesize_with_invalid_request_returns_400`).
- **Missing or non-integer `Content-Length` header -> 400**: not tested.
  This is a distinct branch (`content_length < 0`) from the two above, with
  its own message ("Content-Length header is required and must be a
  non-negative integer"), and no test ever omits the header or sends a
  non-numeric one.
- **Any non-`HypothesizeError` exception -> 500**: not tested at all. The
  handler is marked `# pragma: no cover - defensive` in source, but that
  only excuses it from the coverage percentage; nothing confirms an
  ordinary bug (an `AttributeError`, a `TypeError` somewhere downstream)
  surfaces as `{"ok": false, "error": "internal error: <Type>"}`
  with status 500 rather than crashing the handler thread or leaking
  `str(exc)` into the response. A monkeypatch of `hte.serve.hypothesize` to
  raise a bare `RuntimeError` and asserting on the response shape would
  close this cheaply.
- `CampaignError`/`HypothesizeError` -> 502 is also untested, though not
  named explicitly in the review brief.

413 (oversized body) and 404 (unknown route, both GET and POST) are tested.

## Important gaps (5-6)

### 5. [6] `load_supabase` against a non-200 response is untested

`hte/corpus/production.py::load_supabase` wraps its `urlopen` call in
`except urllib.error.URLError` (which does catch `HTTPError`, a `URLError`
subclass, so a 401/403/500 from Supabase should already be caught and
re-raised as `RuntimeError(f"Supabase request to table {table!r} failed: {exc}")`).
No test ever makes the monkeypatched `urlopen` raise `HTTPError` to confirm
this: `tests/test_corpus_production.py` tests only missing-env-vars
(`test_load_supabase_raises_without_env`) and two successful fetches. The
non-200 path is exactly the scenario named in the task brief and remains
unverified, including whether the wrapped message leaks the Supabase URL or
service key (`resolved_key` is never printed by source, but nothing tests
that `HTTPError`'s own string form doesn't reintroduce it).

### 6. [5] `batch_critique`'s truncation fallback has no test

`tests/test_batching.py` adds `test_batch_judge_truncated_falls_back_to_single_calls`
for the judge path but no equivalent `batch_critique` test. Both batched
functions share the same `_run_batch` fallback machinery
(`ModelRefusal`/`ModelTruncation` both fall back to single calls, both
subsequently absorbed by the per-role default if the single call also
fails), and the refusal variant is tested for both roles, but the
truncation variant is proven for judge only. Cheap to close: mirror
`test_batch_judge_truncated_falls_back_to_single_calls` for
`batch_critique` with `stop_reason="max_tokens"`.

### 7. [4] Per-role truncation defaults beyond critic and judge are untested individually

`test_roles.py` tests a refusal default for every role that has one
(generator, critic, unknown_unknown, preservation_critique, judge,
meta_review, self_report, extract, escalation), but only critic and judge
also get a dedicated truncation test
(`test_critique_truncation_also_defaults_to_reject`,
`test_judge_truncation_defaults_to_coin_flip`). Since every role routes
through the same `_with_refusal_default`, which catches
`(ModelRefusal, ModelTruncation)` identically, and truncation is proven at
that shared layer twice plus once more in `test_llm.py`
(`test_max_tokens_stop_reason_raises_model_truncation`), this is a
completeness gap rather than an unverified code path. Worth closing for
generator and preservation_critique first, since those two carry the most
consequential defaults (an empty hypothesis population, and a permissive
detectability read).

### 8. [4] Vocab-growth items' exclusion from the time-binning span union is asserted only in a comment

`hte/runner.py::_resolve_time_binning`'s own docstring states: "Vocab-growth
proposals (`_grow_vocab`) carry no interval of their own (`hte.concepts.
Concept` has no date field) and so add nothing further to union over." No
test exercises a campaign that both grows vocabulary and computes a span, to
confirm a vocab-growth proposal never perturbs `span_start`. This holds by
construction today (`Concept` has no field to carry a date), so it is not
exploitable now, but nothing would catch a future regression if a date or
interval field were ever added to `Concept`. The property test
`test_resolve_time_binning_span_covers_every_known_year` (ground truth
years, evidence-interval years) is otherwise excellent and does cover both
halves of the union the task asked about.

### 9. [4] `normalize_research_os_record`'s optional-field fallbacks are untested

`hte/corpus/production.py::_research_os_evidence` and
`normalize_research_os_record` have three documented fallback defaults with
no test exercising the fallback branch:

- An evidence entry with neither `source_id` nor `node_id` present falls
  back to a synthesized `research-os-quote-{i}` source id; every existing
  test's fixture evidence carries `node_id`.
- An evidence entry with no `quote` falls back to `"(no quote recorded)"`;
  every existing test's fixture evidence carries a quote.
- A row with both `created_at` and `updated_at` absent falls back to the
  `"1970-01-01T00:00:00Z"` sentinel; every existing test's fixture row
  carries both.

## Minor completeness (3-4)

### 10. [3] `_validate_production_record`'s more granular per-field errors are untested

Tested: missing required top-level field, bad `review.status`, unknown slot
concept id, bad claim `stance`, bad evidence `kind`. Untested, same
function: `claims` present but not a list, a claim entry not a dict,
`evidence` present but not a list, an evidence entry not a dict, a
malformed `interval` (present but missing `start`/`end`), a malformed
`citations` entry (missing `type`/`value`), `review` missing or not a dict,
and a `review.history` entry missing `status`/`date`. None of these is
likely to fire from a well-behaved caller, but they are the difference
between "the validator caught it" and "a `KeyError` three functions later
did," which is the whole point of validating up front.

## Test quality: implementation coupling worth naming

- `tests/test_runner.py`'s two refusal-end-to-end tests
  (`test_production_campaign_survives_one_refused_critic_call`,
  `..._one_truncated_judge_call`) monkeypatch `llm._invoke_cli`, a private,
  underscored function, rather than a public seam. The docstring explains
  the choice (proving the layer above `test_llm.py`'s own
  `_invoke_cli`-level proof), and the alternative (patching
  `subprocess.run` directly, as `test_llm.py`/`test_batching.py` do) is not
  a clear improvement. Worth knowing this test breaks on an `_invoke_cli`
  signature change even when `run_campaign`'s own observable contract is
  unchanged; not worth rewriting given the tradeoff is explained inline.
- `test_extract_refusal_pass_defaults_to_empty_items_and_logs` and
  `test_extract_escalation_refusal_defaults_to_empty_extraction` select
  which of three ensemble passes refuses by matching a substring of the
  rendered prompt text (`"pass 2" in prompt`). If `_extract_prompt`'s own
  wording of pass numbering ever changes, this stops matching silently: no
  call ever refuses, the test still exercises `extract()`, and its
  assertions about `agreement`/`items` would likely still pass on the
  now-untested-again happy path rather than failing loudly. A pass index
  or call-count based selector would be more resilient to a prompt-copy
  edit un-related to this feature.
- Everything else reviewed asserts on public, documented contracts:
  exported constants (`roles.GENERATE_DEFAULT` et al.), `refusal_log()`'s
  own `__all__`-exported shape, `MANIFEST.json`/`self-report.json`/`run.log`
  content that other tooling reads, and HTTP status codes/response bodies.
  None of that reads as brittle.

## Positive observations

- The refusal/truncation default machinery (`hte/roles.py`,
  `hte/batching.py`) is the best-tested feature in this PR: every role's
  refusal default, the batched judge/critique fallback-to-single-call and
  fallback-to-default chains, session-id/uuid non-leakage across every
  artifact a run writes, and a full production-campaign end-to-end
  reproduction of the motivating incident are all covered, several with
  the exact production log line ("`claude -p exited 1: {"...",`
  `"stop_reason":"refusal",...}`") as a design comment.
- The time-binning clamp (`bkt-hte-binning-clamp`) is tested at three
  layers: the unit boundary at `time_bin_index` (`test_time_bin_index_
  clamps_year_before_span`, plus the adjacent
  `test_time_bin_index_does_not_clamp_a_year_at_or_after_span_start`
  checking the exact non-clamping boundary), the evidence-cluster
  placement layer (`test_evidence_cluster_clamps_an_interval_before_the_
  run_span`, updated from its own prior "drop the item" behavior), and an
  end-to-end campaign reproduction plus a Hypothesis property test proving
  the ground-truth/evidence-interval span union for arbitrary years. This
  is the strongest single piece of test design in the PR.
- The production-schema normalizer's happy-path and status/tier/citation
  coverage is thorough and well parametrized (all 4 Research OS statuses,
  8 tier-to-grade-band boundaries, doi-vs-url citation tiering,
  citation-only-source synthesis, PII scrubbing of `learner_id`).
- `hte-serve`'s 400/413/404 paths, and the output-schema-conformance check
  run against every `hypothesize()` response in both `test_api.py` and
  `test_serve.py`, give real confidence the HTTP surface matches its own
  documented contract for the paths that are covered.
