Silent-Failure Review, PR #10 (`feat/hte-k12-research-os`)
============================================================

Scope: `git diff origin/main..HEAD -- tools/hypothesis-engine`, reviewed against
the error-handling rules in this repo's own conventions (every error logged
with context, every fallback explicit and justified, no catch block broader
than the exception it names). `hte/parallel.py` and `hte/batching.py` carry
**no changes** in this diff (`git diff --stat` shows zero lines for either);
`parallel.py`'s pre-existing `on_error="default"` machinery is flagged below
only because this PR wires a genuinely new caller into it for the first time
(finding 1).

Counts: 2 CRITICAL, 3 HIGH, 3 MEDIUM, 2 LOW.

---

## 1. CRITICAL — default substitution mislabels every exhausted-retry failure as a model refusal

**Files:** `hte/roles.py:454-460`, `hte/llm.py:643-653` (docstring's own claim), mechanism in `hte/parallel.py:187` (pre-existing, unchanged, newly exercised by this PR)

`preservation_critique_many` (new this PR) wires `hte.llm.complete_many(..., default=PRESERVATION_CRITIQUE_DEFAULT)`, which in turn sets `pmap(..., on_error="default", default=default)`. `pmap`'s own `_run_one` (`hte/parallel.py:187`, pre-existing) catches a bare `except Exception:` around `fn(item)` — not `except (ModelRefusal, ModelTruncation)`. After `retries` are exhausted, `on_error="default"` substitutes the default for **any** exception: `ModelRefusal`, `ModelTruncation`, but equally `LLMInvalidResponseError` (malformed JSON on both attempts), `LLMInvocationError` (the `claude` CLI missing from `PATH`, a timeout, a non-refusal nonzero exit), `LLMCacheMissError`, or a plain bug.

`hte/roles.py:454-460` then does:

```python
for h, response in zip(hypotheses, responses):
    if response is PRESERVATION_CRITIQUE_DEFAULT:
        logger.warning(
            "hte.roles: role='preservation_critic' id=%r defaulted after a model refusal or truncation",
            h.short_id,
        )
        _REFUSAL_LOG.record("preservation_critic", h.short_id)
```

This identity check cannot distinguish *why* the default was substituted, so every one of the exception types above gets logged as "a model refusal or truncation" and folded into `_REFUSAL_LOG` → `MANIFEST.json["refusals"]`. `hte/llm.py`'s own docstring (`complete_many`, ~line 650) asserts "`hte.llm.stats()` still records the refusal/truncation itself... unaffected by how the caller absorbs it" — true only when the exception actually was `ModelRefusal`/`ModelTruncation` (those are the only two exception types `complete()` increments `record_refusal`/`record_truncation` for). For any other cause, `llm.stats()["preservation_critic"]["refusals"/"truncations"]` stays at zero while `MANIFEST.json["refusals"]["preservation_critic"]` lists the affected hypothesis ids — a self-contradicting manifest.

**User-visible consequence:** if the `claude` CLI goes missing from `PATH`, or every `preservation_critic` prompt starts producing malformed JSON (a schema drift bug), the entire preservation-critique stage silently degrades to the neutral default (`could_have_survived=True`, `detectability_adjustment=0.5`) for every hypothesis, every one of them logged and reported as an ordinary "model refused" event — indistinguishable from the benign case this PR was built to handle, and burying a real infrastructure outage under expected noise.

**Fix:** have `_run_one`/`pmap` preserve the triggering exception (or at least its type name) alongside the default substitution, and have `preservation_critique_many` branch on it: only `ModelRefusal`/`ModelTruncation` get the current treatment; anything else logs at `ERROR` with the real exception type and is tracked as a distinct "infra failure" tally, never folded into `refusal_log()` under a false label.

---

## 2. CRITICAL — `time_bin_index`'s clamp-and-warn is invisible in every real run, and downstream code still assumes the old raise

**Files:** `hte/timeline.py:391-397`, `hte/generate.py:368` and `:306,318` (unchanged, now stale), `hte/runner.py` (no persisted counter added)

This PR replaces `time_bin_index`'s `raise ValueError(...)` for a too-early year with a silent clamp to bin 0 plus `logging.getLogger("hte.timeline").warning(...)`:

```python
if year < span_start:
    logger.warning(
        "hte.timeline.time_bin_index: year %d sits %d year(s) before span_start %d; "
        "clamped to bin 0 rather than raising", year, span_start - year, span_start,
    )
    return 0
```

No file in this package's CLI surface (`hte/cli.py`, `hte/cli_pipeline.py`, `hte/serve.py`) ever calls `logging.basicConfig` or attaches a handler — confirmed by grep across `hte/` and `tests/`. In a real `hte campaign run` or `hte-serve` process this warning reaches only Python's bare "handler of last resort" on stderr (unformatted, no timestamp beyond the message itself); it never reaches `run.log` or `MANIFEST.json`. Compare to this same PR's own refusal-tracking work three files over: every `ModelRefusal`/`ModelTruncation` gets a `run.log` line, a `MANIFEST.json["refusals"]` entry, and a `self_report["assumptions"]` note (`hte/runner.py:510-522`). The clamp gets none of that — it is the one new "this happened, and it might mean the data is wrong" event in this PR with zero persisted trace.

Worse: `hte/generate.py:368` (unchanged by this PR) still documents and depends on the *old* contract — its own docstring says an out-of-span evidence item hits "`hte.timeline.time_bin_index`'s own `ValueError`" and gets dropped, caught by the `except (ValueError, KeyError, IndexError)` at `generate.py:306` and `:318`. That branch can no longer fire for this cause: `time_bin_index` never raises `ValueError` for a too-early year anymore, so an item that used to be **dropped** is now silently **force-placed into bin 0** instead, with no record anywhere of how often that happens.

**User-visible consequence:** a generator-role hallucinated year (the exact case `hte/runner.py`'s own docstring names as this clamp's target) gets permanently misfiled into the earliest time bin of a run's timeline output, with no way for a reader of `run.log`, `self-report.json`, or `MANIFEST.json` to know it happened, distinguish it from a legitimately early-dated hypothesis, or count how often it occurs.

**Fix:** route this warning through `hte.runner.Logger`/`run.log` (the project already avoids stdlib `logging` for exactly this reason — see `runner.py`'s own `Logger` docstring), and add a `clamped_years` tally to `MANIFEST.json`, the same treatment refusals got in this same PR. Update `generate.py`'s stale docstring and reconsider whether an out-of-span item should still be dropped rather than silently rebinned.

---

## 3. HIGH — a bug in HTTP response assembly bypasses `hypothesize()`'s documented error contract and reaches the operator as a bare class name

**Files:** `hte/api.py:541-549`, `hte/serve.py:136-139`

`hte/api.py`'s own module docstring states `hypothesize()` "raises... `RequestValidationError`... and `CampaignError`... Both subclass `HypothesizeError`." The implementation only wraps the `run_campaign` call:

```python
try:
    with _temporary_corpus_loader(corpus) as loader_key, _llm_mode_override(llm_mode):
        ...
        try:
            artifacts = runner.run_campaign(run_cfg)
        except Exception as exc:
            raise CampaignError(_sanitize(f"{type(exc).__name__}: {exc}", temp_root)) from exc
    elapsed = time.monotonic() - started
    return _build_response(               # <- outside the inner try/except
        artifacts, corpus=corpus, prior_profile=prior_profile, status_min=status_min,
        n_productions=len(productions), elapsed_s=elapsed,
    )
finally:
    shutil.rmtree(temp_root, ignore_errors=True)
```

`_build_response` (and everything it calls: `_rank_gap_nodes`, `_enrich_entry`, `_slot_labels`, `_surprise_entry`, `_calibration_summary`) runs **outside** the try/except that reclassifies exceptions, so a bug there — a manifest shape edge case, a `None` where a dict was expected — raises a raw `KeyError`/`TypeError`/`AttributeError`, not `CampaignError`, straight out of `hypothesize()`.

`hte/serve.py:136-139` catches this with a bare fallback, explicitly marked "defensive" on the assumption it should not fire:

```python
except Exception as exc:  # pragma: no cover - defensive; hypothesize() documents its own error contract
    self._write_json(500, {"ok": False, "error": f"internal error: {type(exc).__name__}", "request_id": request_id})
    _log(request_id, f"POST /hypothesize 500 ({type(exc).__name__}) {time.monotonic() - started:.3f}s")
    return
```

Both the HTTP response *and* the server's own structured stderr log (`_log`) carry only `type(exc).__name__` — no message, no traceback, no field of `exc` at all. Since `serve.py` never imports `traceback` or `logging`, there is no other place a full trace could land.

**User-visible consequence:** a bug anywhere in response assembly is reachable from a live `bucket-mcp` call, and the operator debugging repeated 500s has, server-side, nothing but a bare exception class name (e.g. "internal error: KeyError") to go on — no message, no stack, no line number, no run id linking back to which temp run produced it before it was deleted (`finally: shutil.rmtree(..., ignore_errors=True)`, also see finding 5).

**Fix:** widen `hypothesize()`'s own try/except to cover `_build_response` too (reclassifying failures there as `CampaignError` or a new, distinctly-named error), and have `serve.py`'s 500 branch log `str(exc)` plus `traceback.format_exc()` server-side even while keeping the client-facing message generic.

---

## 4. HIGH — literature card cache has no write-completion check; a partial fetch is served as valid forever

**Files:** `hte/corpus/literature.py:783-798` (`_ensure_cards_cached`), `:776-780` (`_fetch_card_text`)

```python
def _fetch_card_text(path: str, ref: str) -> str:
    url = f"{GITHUB_RAW_BASE}/{GITHUB_REPO}/{ref}/{path}"
    request = urllib.request.Request(url, headers=_github_headers())
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")
```

has no `try/except` at all, unlike its sibling three lines up (`_fetch_card_paths`, `hte/corpus/literature.py:752-765`), which wraps the identical `urlopen` call in `try/except urllib.error.URLError as exc: raise RuntimeError(f"...could not list {GITHUB_INTAKE_PATH!r} at ref {ref!r}: {exc}")`. A network blip fetching card 30 of 45 in `_ensure_cards_cached`'s loop crashes with a bare, low-level `urllib` exception naming neither the path nor the ref.

More seriously, the cache-hit check is existence-only:

```python
for path in _fetch_card_paths(ref):
    relative = path[len(GITHUB_INTAKE_PATH) + 1:]
    dest = cache_dir / relative
    if dest.is_file():
        continue
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(_fetch_card_text(path, ref))
```

`write_text` is not atomic (no temp-file-plus-rename, unlike `hte/llm.py`'s own `_write_cache`, which this same PR touches and which does exactly that: `tmp = path.with_suffix(".json.tmp"); tmp.write_text(...); tmp.replace(path)`). A process killed mid-write (disk full, SIGKILL, Ctrl-C) leaves a truncated `.md` file on disk. Every subsequent `load()` against the same cache directory sees `dest.is_file() == True` and never re-fetches it — the corruption is permanent and silent until `_parse_frontmatter` (or something downstream of it) trips over the truncated content, at which point nothing in the error message points back to "this file's cache entry never finished writing."

**Fix:** wrap `_fetch_card_text` the same way `_fetch_card_paths` is wrapped, and write through a temp path plus atomic `rename`/`replace` before a cache entry is considered complete.

---

## 5. MEDIUM — an unrecognized Research OS status silently drops the production from the corpus

**File:** `hte/corpus/production.py:294-295`

```python
raw_status = raw.get("status") or "draft"
mapped_status = RESEARCH_OS_STATUS_MAP.get(raw_status, "draft")
```

`RESEARCH_OS_STATUS_MAP` only knows `draft`/`submitted`/`accepted`/`returned`. Any other value — a typo, a status the `graph.productions.status` enum grows later (this exact drift is the subject of the new `docs/PRODUCTION-SCHEMA-ALIGNMENT.md` this PR ships), or a stray `null` that survived `raw.get("status") or "draft"` — silently maps to `"draft"`. Nothing is appended to the `errors` list `hypothesize()`'s own validation pass otherwise collects, no warning is logged. Since the default `status_min="peer-reviewed"` excludes drafts, a production whose status has drifted from the four known values disappears from the corpus's evidence and ground truth with no trace anywhere that it happened or why.

**Fix:** raise `ValueError` for an unrecognized `status` (matching `normalize_research_os_record`'s existing contract for missing `id`/`target_node_id` two lines above), or at minimum log a warning and surface it through `hypothesize()`'s validation-errors path.

---

## 6. MEDIUM — missing timestamps silently become the Unix epoch, corrupting discovery-date holdout

**File:** `hte/corpus/production.py:296`

```python
moved_at = raw.get("updated_at") or raw.get("created_at") or "1970-01-01T00:00:00Z"
```

used both as the record's `created_at` fallback (line 300) and as the single `review.history` entry's date (line 306). When a row carries neither timestamp, `_build_corpus`'s `discovery_year=_year_of(accepted_date)` silently becomes 1970 for that record, with no signal that the date was synthesized. `hte.calibrate.holdout_by_discovery_date` (the mechanism this synthetic date feeds) would treat such a record as maximally old, always in the "training" partition of any discovery-date holdout, silently skewing calibration for a malformed row instead of failing loudly or excluding it.

**Fix:** raise or log when both timestamps are absent, rather than treating "no date" as "date = 1970."

---

## 7. MEDIUM — inconsistent error context: bare `KeyError`/`ValueError` with no file name, and an unused logger in `hte/llm.py`

**Files:** `hte/corpus/literature.py:406-415`, `hte/llm.py` (`logger` declared, never called)

(a) `_parse_frontmatter` names `relative_path` in every one of its own explicit validation errors — "no frontmatter opening `---`" (line 391), "no frontmatter closing `---`" (394), "carries no doi" (418), "carries no key_claims" (420) — but the required-field reads two lines above those checks are bare dict subscripts with no such context:

```python
title = _parse_scalar(fields["title"]) or ""
authors = tuple(_parse_list(fields["authors"]))
year_str = _parse_scalar(fields["year"]) or "0"
year = int(year_str)
venue = _parse_scalar(fields["venue"]) or ""
...
```

A card missing `authors:` (or any of `title`/`venue`/`why_it_matters`/`key_claims`/`how_it_bears_on_research_os`) raises a bare `KeyError: 'authors'`; a card with a non-numeric `year:` raises a bare `ValueError: invalid literal for int() with base 10: '...'`. Neither names the file. `load_raw`'s list comprehension (`hte/corpus/literature.py:816`) has no per-file try/except either, so with a corpus already at 45 cards and growing (per this module's own docstring), one malformed card crashes the whole load with no indication of which file to fix.

(b) `hte/llm.py` adds `import logging` and `logger = logging.getLogger("hte.llm")` in this PR, but the module never calls `logger.*` anywhere. The corrective-retry path on `LLMInvalidResponseError` (`complete()`, the `except LLMInvalidResponseError as exc: last_error = str(exc); continue` branch) and every `LLMInvocationError`/`LLMCacheMissError` raise site emit no log line from inside `hte.llm` itself. `hte.roles`'s `_with_refusal_default` explicitly passes every exception other than `ModelRefusal`/`ModelTruncation` through "unchanged" (its own docstring), so a run that dies on malformed JSON or a missing CLI has no log line inside the one module that actually saw the raw failure — only whatever the eventual uncaught traceback happens to print.

**Fix:** wrap `_parse_frontmatter`'s required-field reads with the same file-context convention the rest of the function already uses; either use `logger` in `hte/llm.py` for the paths it currently leaves silent, or remove the unused declaration.

---

## 8. LOW — path-sanitization regex is an incomplete allowlist presented as a blanket guarantee

**File:** `hte/api.py:292-298`

```python
def _sanitize(text: str, run_dir: Path) -> str:
    sanitized = text.replace(str(run_dir), "<run_dir>")
    return re.sub(r"/(?:home|tmp|Users|var)/\S*", "<path>", sanitized)
```

covers only four path roots. An exception message containing `/opt/...`, `/mnt/...`, `/data/...`, `/etc/...`, or a relative-but-still-sensitive path passes through unredacted into `CampaignError`'s message, which does reach the HTTP client — undercutting the module's own stated "never an absolute path in the response" contract for any deployment whose filesystem layout doesn't match the four assumed roots.

---

## 9. LOW — `grade_band` silently becomes `"unknown"` on a non-numeric tier

**File:** `hte/corpus/production.py:302`

```python
"grade_band": _tier_to_grade_band(tier) if isinstance(tier, (int, float)) else "unknown",
```

Silent, but low practical impact: `grade_band` is carried through `Production` as descriptive metadata and is not read anywhere in `_build_corpus`'s belief-fusion mapping. Noted for completeness; no fix urged.
