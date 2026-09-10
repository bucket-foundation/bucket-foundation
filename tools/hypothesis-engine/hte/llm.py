"""Headless Claude wrapper: cached, schema-validated JSON completions.

Every LLM-backed role in `hte.roles` reaches a model through `complete()`
here, which shells out to the `claude` CLI already installed and
authenticated on this machine (`claude -p ... --output-format json`)
rather than importing an SDK or reading an API key. The CLI carries its
own auth (OAuth or keychain, whichever this machine is signed in with);
this module never reads or prints `ANTHROPIC_API_KEY` or any other
credential, and `--bare` is deliberately not used, since bare mode
requires that exact key and would fail auth on a machine signed in the
ordinary way (`claude --bare` returned "Not logged in" against this
session's own OAuth login, confirmed empirically before this module was
written).

`complete()` requests a JSON object matching a caller-supplied schema,
retries once against a corrective follow-up prompt when the first
response fails to parse or is missing a required key, and caches every
call by a sha256 of `(model, prompt)` under `cache_dir`: a rerun against
the same model and prompt is free and returns the exact answer the first
run got, and a `replay_only=True` run (`hte campaign run --replay-only`,
every test in this package) executes from committed cache files with no
subprocess call at all.

This module adds one more mode, orthogonal to the cache:
setting the `HTE_LLM_MODE` environment variable to `"fake"`, or passing
`complete(..., mode="fake")` directly, dispatches every call straight to
`hte.fakellm.complete` instead of `claude -p`, no subprocess, no cache
read or write either way. This is what lets `hte.cli_synth`'s random
campaigns and `tests/campaigns/test_random_campaigns.py` run the whole
engine loop, every role included, in seconds with no network access and
no `claude` CLI on the machine at all.

`complete_many()` maps `complete()` over a list of prompts through
`hte.parallel.pmap`, `hte.parallel.configure`'s own worker count and cap
applied, instead of calling each one strictly in sequence: the pattern
`bkt-hte-throughput` was filed against, `hte.runner.run_campaign`'s
critic, preservation critique, and judge calls each running one
`claude -p` subprocess at a time, 20-40 seconds apiece, for every one of
a few hundred hypotheses. This module also raises `hte.parallel.
RateLimit` (re-exported here as `RateLimit`) when a CLI response's own
stdout or stderr carries a 429, "rate limit", "spend limit", or "usage
limit" marker, so `pmap` can pause every worker instead of treating a
shared account limit as one item's own failure; `stats()` reports, per
role, how many calls this process has made, how many of those were cache
hits, how many hit a rate-limit pause, and their cumulative wall time,
for whoever wires a campaign's own `MANIFEST.json` to carry it.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import subprocess
import threading
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Sequence

from .parallel import RateLimit, pmap

logger = logging.getLogger("hte.llm")

MODEL_POLICY_PATH = Path(__file__).parent / "data" / "model-policy.json"

# Every role prompt in `hte.roles` is plain, dry instruction text; this one
# system prompt, shared across every role and every model, carries the one
# instruction the source material asks every prompt to carry
# (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §7): the model's own trained recall is
# one fallible input among several, tracked as the low-tier `model-prior`
# evidence kind, never read as ground truth on its own. `complete()`'s own
# signature carries no `system_prompt` parameter, so this constant is where
# that instruction lives instead of being repeated, and risking drift, in
# every role's own prompt text.
SYSTEM_PROMPT = (
    "You are a research assistant inside a deterministic hypothesis-engine "
    "pipeline (Bucket Foundation's History Hypothesis Engine). Follow the "
    "user's instructions exactly and respond with a single JSON object "
    "matching the schema given to you, no prose before or after it. Treat "
    "anything you recall from training, rather than from the evidence text "
    "you were given, as a low-tier, unverified source called `model-prior`: "
    "state it plainly when you rely on it, and never present it as "
    "established fact."
)

DEFAULT_TIMEOUT_S = 300


class LLMError(RuntimeError):
    """Base class for every error this module raises."""


class LLMCacheMissError(LLMError):
    """`replay_only=True` and no cache file exists for this (model, prompt)."""


class LLMInvocationError(LLMError):
    """The `claude` CLI exited nonzero or reported `is_error` itself."""


class LLMInvalidResponseError(LLMError):
    """The response was not JSON, or was missing a required schema key,
    on both the first attempt and the one corrective retry."""


class _RefusalLike(LLMError):
    """Shared field contract for `ModelRefusal`/`ModelTruncation`: `role`,
    a sha256 of the prompt text that triggered it (never the prompt
    itself), the CLI's own reported `total_cost_usd` for that one call
    (`None` when the envelope carried none), and `envelope`, a copy of
    the CLI's own JSON result with `_sanitize_envelope`'s session/account
    identifiers already stripped. Every field here is safe to embed in a
    log line, `MANIFEST.json`, or a role's own default response
    (`hte.roles`'s own per-role fallback contract); this class's own
    `__str__` never includes `stderr` or an unsanitized envelope, the
    two places an account field could otherwise leak through
    (2026-09-10's own motivating incident: a `production` campaign's
    critic stage hit this exact `stop_reason`, on `claude -p`'s own
    nonzero exit, and the prior code folded the whole raw envelope,
    `session_id` included, into `LLMInvocationError`'s message, which
    then landed verbatim in the run's own uncaught-traceback log)."""

    def __init__(self, *, role: str, prompt_sha256: str, cost_usd: float | None, envelope: dict[str, Any]) -> None:
        self.role = role
        self.prompt_sha256 = prompt_sha256
        self.cost_usd = cost_usd
        self.envelope = envelope
        super().__init__(self._message())

    def _message(self) -> str:
        raise NotImplementedError


class ModelRefusal(_RefusalLike):
    """`_invoke_cli`'s own envelope carried `stop_reason == "refusal"`:
    the model declined to answer this one prompt. `hte.roles` absorbs
    this into every role's own documented default (a critic's `keep`
    defaults to `False`, a judge's `p_a_wins` to `0.5`, ...) rather than
    letting it reach `hte.runner.run_campaign` uncaught."""

    def _message(self) -> str:
        cost = f"${self.cost_usd:.4f}" if self.cost_usd is not None else "unknown"
        return f"role={self.role!r} prompt_sha256={self.prompt_sha256[:12]}: model refused (cost={cost})"


class ModelTruncation(_RefusalLike):
    """`_invoke_cli`'s own envelope either carried `stop_reason ==
    "max_tokens"`, or an empty completion (no `structured_output`, no
    usable `result` text) with no refusal marker at all: the model ran
    out of budget, or produced nothing, rather than declining outright.
    `reason` names which: `"max_tokens"` or `"empty_result"`. Same
    absorb-into-a-default contract as `ModelRefusal`."""

    def __init__(self, *, role: str, prompt_sha256: str, cost_usd: float | None, envelope: dict[str, Any], reason: str) -> None:
        self.reason = reason
        super().__init__(role=role, prompt_sha256=prompt_sha256, cost_usd=cost_usd, envelope=envelope)

    def _message(self) -> str:
        cost = f"${self.cost_usd:.4f}" if self.cost_usd is not None else "unknown"
        return f"role={self.role!r} prompt_sha256={self.prompt_sha256[:12]}: model truncated ({self.reason}, cost={cost})"


# Every marker `_check_rate_limit` treats as a shared account limit rather
# than an ordinary CLI or model failure. `429` is matched at a word
# boundary (`\b429\b`) so a plain year or count that happens to end in
# those three digits ("1429", "42900") never trips it; the other three are
# matched as a phrase, case-insensitively, with `[ _-]?` between the two
# words so "rate limit", "rate_limit", and "rate-limit" all match the one
# pattern.
_RATE_LIMIT_PATTERNS = [
    re.compile(r"\b429\b"),
    re.compile(r"rate[ _-]?limit", re.IGNORECASE),
    re.compile(r"spend[ _-]?limit", re.IGNORECASE),
    re.compile(r"usage[ _-]?limit", re.IGNORECASE),
]

# A best-effort read of a reset time or window off the same text, for
# `RateLimit.reset_hint`. Absent from a message that names no such
# hint, `RateLimitAborted`'s own text then omits the sentence entirely
# rather than printing "hint: None".
_RESET_HINT_RE = re.compile(
    r"((?:retry|try again) after [^\n.]+|resets? (?:at|in) [^\n.]+|"
    r"try again (?:at|in) [^\n.]+)",
    re.IGNORECASE,
)


def _check_rate_limit(*texts: str) -> None:
    """Raise `RateLimit` if any of `texts` carries a 429, rate-limit,
    spend-limit, or usage-limit marker. Called against a fresh CLI
    response's own stdout/stderr (and, for an `is_error` envelope, its
    `result` text) before this module raises anything else for that
    call, so a rate limit is never mistaken for an ordinary invocation
    or parse failure."""
    combined = "\n".join(t for t in texts if t)
    if not combined:
        return
    if any(p.search(combined) for p in _RATE_LIMIT_PATTERNS):
        hint_match = _RESET_HINT_RE.search(combined)
        hint = hint_match.group(1).strip() if hint_match else None
        raise RateLimit(
            "claude -p reported a rate/spend/usage limit marker in its own "
            f"output: {combined[:300]!r}",
            reset_hint=hint,
        )


@dataclass
class _RoleStats:
    """One role's own tally inside `stats()`'s snapshot. `refusals`/
    `truncations` count every `ModelRefusal`/`ModelTruncation` this
    process has raised for this role (2026-09-10, `bkt-hte-refusal-
    handling`): each one still absorbed into a documented default by
    `hte.roles` rather than aborting the call, but tallied here so
    `hte.runner.run_campaign`'s own `MANIFEST.json` can report how many times
    it happened without re-deriving it from `hte.roles.refusal_log()`
    alone."""
    calls: int = 0
    cache_hits: int = 0
    rate_limit_pauses: int = 0
    wall_time_s: float = 0.0
    refusals: int = 0
    truncations: int = 0

    def to_dict(self) -> dict[str, float | int]:
        return {
            "calls": self.calls, "cache_hits": self.cache_hits,
            "rate_limit_pauses": self.rate_limit_pauses, "wall_time_s": self.wall_time_s,
            "refusals": self.refusals, "truncations": self.truncations,
        }


class _StatsRegistry:
    """Process-wide, thread-safe counters `complete()` updates on every
    call, `complete_many()` included (it calls `complete()` from several
    `hte.parallel.pmap` worker threads at once). A fresh Python process
    starts empty; nothing in this module reads its own counters back, a
    caller wanting one campaign's own numbers rather than a cumulative
    total across every campaign this process has run should call
    `reset_stats()` at the start of a run."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_role: dict[str, _RoleStats] = {}

    def record_call(self, role: str, *, cache_hit: bool, wall_time_s: float) -> None:
        with self._lock:
            row = self._by_role.setdefault(role, _RoleStats())
            row.calls += 1
            if cache_hit:
                row.cache_hits += 1
            row.wall_time_s += wall_time_s

    def record_rate_limit_pause(self, role: str) -> None:
        with self._lock:
            row = self._by_role.setdefault(role, _RoleStats())
            row.rate_limit_pauses += 1

    def record_refusal(self, role: str, *, wall_time_s: float) -> None:
        with self._lock:
            row = self._by_role.setdefault(role, _RoleStats())
            row.refusals += 1
            row.wall_time_s += wall_time_s

    def record_truncation(self, role: str, *, wall_time_s: float) -> None:
        with self._lock:
            row = self._by_role.setdefault(role, _RoleStats())
            row.truncations += 1
            row.wall_time_s += wall_time_s

    def snapshot(self) -> dict[str, dict[str, float | int]]:
        with self._lock:
            return {role: row.to_dict() for role, row in self._by_role.items()}

    def reset(self) -> None:
        with self._lock:
            self._by_role.clear()


_STATS = _StatsRegistry()


def stats() -> dict[str, dict[str, float | int]]:
    """A snapshot of every `complete()` call this process has made so
    far, keyed by `role`: `calls`, `cache_hits`, `rate_limit_pauses`, and
    cumulative `wall_time_s`. Safe to call from any thread at any time;
    the returned dict is a copy, so a caller embedding it into
    `MANIFEST.json` (`hte.runner.run_campaign`, once wired) is free to
    mutate it without touching this module's own state."""
    return _STATS.snapshot()


def reset_stats() -> None:
    """Clear every counter `stats()` reports. A caller starting a fresh
    campaign calls this first if it wants that campaign's own numbers
    rather than a cumulative total across this process's prior calls."""
    _STATS.reset()


@lru_cache(maxsize=1)
def _model_policy() -> dict[str, Any]:
    return json.loads(MODEL_POLICY_PATH.read_text())


def resolve_model(role: str) -> str:
    """The CLI model alias `model-policy.json` assigns to `role`
    (`generator`, `critic`, `unknown_unknown`, `preservation_critic`,
    `judge`, `meta_review`, `self_report`, `extractor`), or the escalation
    model for the pseudo-role `"escalation"` (`hte.roles.extract`'s
    ensemble-disagreement path)."""
    policy = _model_policy()
    if role == "escalation":
        return policy["escalation"]
    try:
        return policy["roles"][role]
    except KeyError as exc:
        raise KeyError(f"no model-policy entry for role {role!r}") from exc


def escalation_model() -> str:
    return _model_policy()["escalation"]


def _cache_key(model: str, prompt: str) -> str:
    """sha256 of `(model, prompt)`, the cache filename stem. Deliberately
    excludes `role` and `schema`: two roles that ever issue the identical
    prompt to the identical model should read the identical cached answer
    rather than paying for it twice, and `schema` is a property of the
    call site rather than of what was asked."""
    h = hashlib.sha256()
    h.update(model.encode("utf-8"))
    h.update(b"\x00")
    h.update(prompt.encode("utf-8"))
    return h.hexdigest()


def _cache_path(cache_dir: str | Path, model: str, prompt: str) -> Path:
    return Path(cache_dir) / f"{_cache_key(model, prompt)}.json"


def _prompt_sha256(prompt: str) -> str:
    """sha256 of `prompt` alone (no `model`, unlike `_cache_key`): the id
    `ModelRefusal`/`ModelTruncation` and `_write_cache`'s own cache
    payload both carry, so a refusal's `prompt_sha256` can be checked
    against a cached response's own `prompt_sha256` field without ever
    handling the prompt text itself."""
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


_SESSION_ID_KEYS = frozenset({"session_id", "uuid"})


def _sanitize_envelope(envelope: dict[str, Any]) -> dict[str, Any]:
    """A shallow copy of `envelope` with every key this module treats as
    a session or account identifier removed: `session_id` (the CLI's
    own resumable-session id) and `uuid` (this one result event's own
    id). `--no-session-persistence` (`_invoke_cli`'s own argv) already
    keeps the CLI from writing a resumable session to disk; this is the
    matching in-process rule for the envelope this module reads back,
    so `ModelRefusal`/`ModelTruncation`, and anything built from them
    (`MANIFEST.json`, `run.log`), never carry one."""
    return {k: v for k, v in envelope.items() if k not in _SESSION_ID_KEYS}


def _read_cache(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())["response"]


def _write_cache(path: Path, *, model: str, role: str, prompt: str, response: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": model,
        "role": role,
        "prompt_sha256": _prompt_sha256(prompt),
        "response": response,
    }
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, indent=2))
    tmp.replace(path)


def _retry_prompt(prompt: str, schema: dict[str, Any], error: str) -> str:
    required = schema.get("required", [])
    return (
        f"{prompt}\n\n"
        "Your previous response did not parse as valid JSON matching the "
        f"required schema (required keys: {required}). Error: {error}. "
        "Respond again with ONLY a single JSON object matching the schema, "
        "no prose before or after it."
    )


_TRUNCATION_STOP_REASONS = frozenset({"max_tokens"})


def _raise_for_stop_reason(envelope: dict[str, Any], *, role: str, prompt: str) -> None:
    """Raise `ModelRefusal`/`ModelTruncation` when `envelope`'s own
    `stop_reason` (or a missing/empty completion with no explicit
    `stop_reason` at all) names one; return with no side effect for an
    ordinary envelope. `_invoke_cli` calls this against every envelope it
    manages to parse, BEFORE its own exit-code/`is_error` checks decide
    whether to raise the generic `LLMInvocationError`: `claude -p` exits
    nonzero for a refusal (2026-09-10's own motivating incident), so a
    refusal classified only after an exit-code check would never be
    reached. Every field on the exception raised here comes from
    `_sanitize_envelope`'s own copy plus a sha256 of `prompt`, never the
    prompt text or the envelope's raw `session_id`/`uuid`."""
    stop_reason = envelope.get("stop_reason")
    kwargs = dict(
        role=role, prompt_sha256=_prompt_sha256(prompt),
        cost_usd=envelope.get("total_cost_usd"), envelope=_sanitize_envelope(envelope),
    )
    if stop_reason == "refusal":
        raise ModelRefusal(**kwargs)
    if stop_reason in _TRUNCATION_STOP_REASONS:
        raise ModelTruncation(reason="max_tokens", **kwargs)
    if envelope.get("structured_output") is None:
        result = envelope.get("result")
        if result is None or (isinstance(result, str) and not result.strip()):
            raise ModelTruncation(reason="empty_result", **kwargs)


def _invoke_cli(prompt: str, model: str, schema: dict[str, Any], timeout: float, *, role: str) -> dict[str, Any]:
    """One `claude -p` call, returning the parsed outer result envelope.
    `--tools ""` disables every tool so the role can only read the prompt
    text handed to it, matching the source material's target-blind rule
    that generation never reaches outside its own evidence
    (`main.tex` §8's target-blind corpus construction). `--setting-sources
    ""` and the fixed `SYSTEM_PROMPT` above skip this repository's own
    CLAUDE.md, skills, and hooks, so a role prompt costs only the tokens it
    contains rather than this project's whole ambient context.

    The envelope is parsed from `proc.stdout` even when `proc.returncode
    != 0` (`bkt-hte-refusal-handling`, 2026-09-10): `claude -p` exits 1
    for a refusal, `stop_reason` and all, on stdout as ordinary JSON, so
    parsing was gated on a zero exit code before this fix, and the
    refusal fell through to the generic `LLMInvocationError` below,
    which folded the *entire* raw envelope (`session_id`, cost, and
    usage fields included) into its own message via
    `proc.stdout.strip()`, the exact incident that motivated this
    rewrite. Neither `LLMInvocationError` branch below ever includes an
    unsanitized envelope or `proc.stderr` in its own message for that
    reason; a plain invocation failure (a non-JSON stdout, the CLI
    missing from `PATH`, ...) still names a bounded snippet of whatever
    plain-text error the CLI itself printed, since that text carries no
    structured session/account fields to begin with.
    """
    argv = [
        "claude", "-p", prompt,
        "--model", model,
        "--system-prompt", SYSTEM_PROMPT,
        "--setting-sources", "",
        "--output-format", "json",
        "--json-schema", json.dumps(schema),
        "--tools", "",
        "--no-session-persistence",
        "--strict-mcp-config",
    ]
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError as exc:
        raise LLMInvocationError("the `claude` CLI is not on PATH") from exc
    except subprocess.TimeoutExpired as exc:
        raise LLMInvocationError(f"claude -p timed out after {timeout}s") from exc
    _check_rate_limit(proc.stdout, proc.stderr)

    envelope: dict[str, Any] | None = None
    if proc.stdout:
        try:
            envelope = json.loads(proc.stdout)
        except json.JSONDecodeError:
            envelope = None

    if envelope is not None:
        _raise_for_stop_reason(envelope, role=role, prompt=prompt)

    if proc.returncode != 0:
        if envelope is not None:
            raise LLMInvocationError(
                f"claude -p exited {proc.returncode} for role={role!r}: stop_reason="
                f"{envelope.get('stop_reason')!r} is_error={envelope.get('is_error')!r} "
                "(no refusal/truncation match; the envelope's own session/account fields are omitted)"
            )
        raise LLMInvocationError(
            f"claude -p exited {proc.returncode} for role={role!r}: "
            f"{(proc.stderr or proc.stdout).strip()[:300]!r}"
        )
    if envelope is None:
        raise LLMInvocationError(f"claude -p produced non-JSON stdout: {proc.stdout[:500]!r}")
    if envelope.get("is_error"):
        _check_rate_limit(str(envelope.get("result", "")))
        raise LLMInvocationError(
            f"claude -p reported is_error for role={role!r}: stop_reason={envelope.get('stop_reason')!r} "
            "(no refusal/truncation match; the envelope's own session/account fields are omitted)"
        )
    return envelope


def _parse_response(envelope: dict[str, Any], required: list[str]) -> dict[str, Any]:
    data = envelope.get("structured_output")
    if data is None:
        raw = envelope.get("result", "")
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise LLMInvalidResponseError(f"response was not JSON: {raw[:300]!r}") from exc
    if not isinstance(data, dict):
        raise LLMInvalidResponseError(f"response JSON was not an object: {data!r}")
    missing = [k for k in required if k not in data]
    if missing:
        raise LLMInvalidResponseError(f"response missing required keys {missing}: {data!r}")
    return data


def complete(
    prompt: str,
    *,
    role: str,
    schema: dict[str, Any],
    model: str | None = None,
    cache_dir: str | Path,
    replay_only: bool = False,
    timeout: float = DEFAULT_TIMEOUT_S,
    mode: str | None = None,
) -> dict[str, Any]:
    """A JSON completion matching `schema`, cached by sha256 of `(model,
    prompt)` under `cache_dir`.

    `role` picks the default model from `hte/data/model-policy.json` when
    `model` is `None`; passing `model` explicitly (as `hte.roles.extract`
    does for its opus escalation) overrides that lookup.

    A cache hit returns instantly, no subprocess call. A cache miss with
    `replay_only=True` raises `LLMCacheMissError` rather than shelling out,
    for tests and CI, which run only against cache files this package
    commits at `tests/fixtures/llm-cache/`. A cache miss with
    `replay_only=False` calls `claude -p`; a response that fails to parse
    as JSON or is missing a key `schema["required"]` names gets one
    corrective retry before this function raises
    `LLMInvalidResponseError`.

    `mode="fake"` (or the `HTE_LLM_MODE=fake` environment variable, read
    when `mode` is left `None`) short-circuits every rule above: no cache
    lookup, no `claude -p`, no `cache_dir` access at all, and the call
    dispatches straight to `hte.fakellm.complete` instead. `cache_dir`/
    `replay_only`/`timeout`/`model` are accepted but unused in this mode,
    so every existing `hte.roles` call site works unchanged in either
    mode.

    A `stop_reason` of `"refusal"` or `"max_tokens"`, or an empty
    completion, raises `ModelRefusal`/`ModelTruncation` instead of
    either of the two outcomes above, with no corrective retry (retrying
    with the same content only refuses again): this function itself
    never absorbs either into a default value, `hte.roles`'s own
    per-role fallback does that at the caller, so every existing direct
    `complete()` call site that has not opted into a default still sees
    the raise.
    """
    start = time.monotonic()
    resolved_mode = mode if mode is not None else os.environ.get("HTE_LLM_MODE")
    if resolved_mode == "fake":
        from . import fakellm
        response = fakellm.complete(prompt, role=role, schema=schema)
        _STATS.record_call(role, cache_hit=False, wall_time_s=time.monotonic() - start)
        return response

    resolved_model = model or resolve_model(role)
    cache_path = _cache_path(cache_dir, resolved_model, prompt)
    if cache_path.exists():
        response = _read_cache(cache_path)
        _STATS.record_call(role, cache_hit=True, wall_time_s=time.monotonic() - start)
        return response
    if replay_only:
        raise LLMCacheMissError(
            f"replay_only=True and no cache file for role={role!r} model={resolved_model!r} "
            f"at {cache_path}"
        )

    required = list(schema.get("required", []))
    last_error = "no attempt made"
    for attempt in range(2):
        call_prompt = prompt if attempt == 0 else _retry_prompt(prompt, schema, last_error)
        try:
            envelope = _invoke_cli(call_prompt, resolved_model, schema, timeout, role=role)
        except RateLimit:
            _STATS.record_rate_limit_pause(role)
            raise
        except ModelRefusal:
            # No corrective retry: the retry prompt below is for invalid
            # JSON shape while the answer itself was given, and re-asking with the
            # same content would only refuse again. `hte.roles`'s own
            # per-role default absorbs this at the caller.
            _STATS.record_refusal(role, wall_time_s=time.monotonic() - start)
            raise
        except ModelTruncation:
            _STATS.record_truncation(role, wall_time_s=time.monotonic() - start)
            raise
        try:
            response = _parse_response(envelope, required)
        except LLMInvalidResponseError as exc:
            last_error = str(exc)
            continue
        _write_cache(cache_path, model=resolved_model, role=role, prompt=prompt, response=response)
        _STATS.record_call(role, cache_hit=False, wall_time_s=time.monotonic() - start)
        return response
    _STATS.record_call(role, cache_hit=False, wall_time_s=time.monotonic() - start)
    raise LLMInvalidResponseError(
        f"role={role!r} model={resolved_model!r}: invalid JSON after one retry: {last_error}"
    )


def complete_many(
    prompts: Sequence[str],
    *,
    role: str,
    schema: dict[str, Any],
    model: str | None = None,
    cache_dir: str | Path,
    replay_only: bool = False,
    timeout: float = DEFAULT_TIMEOUT_S,
    mode: str | None = None,
    workers: int | None = None,
    default: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """`complete()` mapped over `prompts`, in the same order, through
    `hte.parallel.pmap` (`workers` at a time, `hte.parallel.configure`'s
    own default and cap applied when `workers` is left `None`).

    Every prompt already sitting in `cache_dir`'s cache is read inline,
    before `pmap` is ever called, so a `complete_many` run over a mostly-
    cached prompt list never occupies a worker thread for a prompt that
    was going to return instantly anyway; only the prompts that reach
    `claude -p` (or `hte.fakellm` in fake mode, which keeps no
    cache of its own and so is never treated as a cache hit here) compete
    for the `workers` slots. `hte.parallel.RateLimit` raised by any one
    prompt propagates out of `pmap` (and so out of this function) the
    same way it would out of a single `complete()` call; it is not
    caught here.

    `default`, when given, is wired through as `hte.parallel.pmap`'s own
    `on_error="default"`/`default=` pair (`bkt-hte-refusal-handling`):
    a prompt whose `complete()` call keeps failing (`ModelRefusal`/
    `ModelTruncation` chief among them, since `pmap`'s own retries give
    a fresh `claude -p` call, and so a fresh chance to answer, before
    giving up) resolves to `default` in its place in the returned list
    rather than aborting every other prompt in `prompts` alongside it.
    `hte.llm.stats()` still records the refusal/truncation itself
    (`complete()`'s own bookkeeping, unaffected by how the caller
    absorbs it); `default=None` (the default) preserves this function's
    prior behavior, one failing prompt raises out of the whole call.
    """
    results: list[dict[str, Any] | None] = [None] * len(prompts)
    resolved_mode = mode if mode is not None else os.environ.get("HTE_LLM_MODE")
    pending: list[int] = []
    for i, prompt in enumerate(prompts):
        if resolved_mode != "fake":
            resolved_model = model or resolve_model(role)
            cache_path = _cache_path(cache_dir, resolved_model, prompt)
            if cache_path.exists():
                start = time.monotonic()
                results[i] = _read_cache(cache_path)
                _STATS.record_call(role, cache_hit=True, wall_time_s=time.monotonic() - start)
                continue
        pending.append(i)

    if pending:
        def _call(i: int) -> dict[str, Any]:
            return complete(
                prompts[i], role=role, schema=schema, model=model, cache_dir=cache_dir,
                replay_only=replay_only, timeout=timeout, mode=mode,
            )

        pmap_kwargs: dict[str, Any] = {"workers": workers}
        if default is not None:
            pmap_kwargs["on_error"] = "default"
            pmap_kwargs["default"] = default

        for idx, response in zip(pending, pmap(_call, pending, **pmap_kwargs)):
            results[idx] = response

    return results  # type: ignore[return-value]


@dataclass(frozen=True)
class CacheStats:
    """A snapshot of one `cache_dir`'s size, for `MANIFEST.json` and the
    self-report (`hte.runner.run_campaign`)."""
    files: int
    total_bytes: int

    def to_dict(self) -> dict[str, int]:
        return {"files": self.files, "total_bytes": self.total_bytes}


def cache_stats(cache_dir: str | Path) -> CacheStats:
    p = Path(cache_dir)
    if not p.exists():
        return CacheStats(files=0, total_bytes=0)
    files = [f for f in p.glob("*.json") if f.is_file()]
    return CacheStats(files=len(files), total_bytes=sum(f.stat().st_size for f in files))
