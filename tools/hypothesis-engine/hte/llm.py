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
"""
from __future__ import annotations

import hashlib
import json
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

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


def _read_cache(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())["response"]


def _write_cache(path: Path, *, model: str, role: str, prompt: str, response: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model": model,
        "role": role,
        "prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
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


def _invoke_cli(prompt: str, model: str, schema: dict[str, Any], timeout: float) -> dict[str, Any]:
    """One `claude -p` call, returning the parsed outer result envelope.
    `--tools ""` disables every tool so the role can only read the prompt
    text handed to it, matching the source material's target-blind rule
    that generation never reaches outside its own evidence
    (`main.tex` §8's target-blind corpus construction). `--setting-sources
    ""` and the fixed `SYSTEM_PROMPT` above skip this repository's own
    CLAUDE.md, skills, and hooks, so a role prompt costs only the tokens it
    contains rather than this project's whole ambient context."""
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
    if proc.returncode != 0:
        raise LLMInvocationError(
            f"claude -p exited {proc.returncode}: {proc.stderr.strip() or proc.stdout.strip()}"
        )
    try:
        envelope = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise LLMInvocationError(f"claude -p produced non-JSON stdout: {proc.stdout[:500]!r}") from exc
    if envelope.get("is_error"):
        raise LLMInvocationError(f"claude -p reported is_error: {envelope.get('result')!r}")
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
    """
    resolved_model = model or resolve_model(role)
    cache_path = _cache_path(cache_dir, resolved_model, prompt)
    if cache_path.exists():
        return _read_cache(cache_path)
    if replay_only:
        raise LLMCacheMissError(
            f"replay_only=True and no cache file for role={role!r} model={resolved_model!r} "
            f"at {cache_path}"
        )

    required = list(schema.get("required", []))
    last_error = "no attempt made"
    for attempt in range(2):
        call_prompt = prompt if attempt == 0 else _retry_prompt(prompt, schema, last_error)
        envelope = _invoke_cli(call_prompt, resolved_model, schema, timeout)
        try:
            response = _parse_response(envelope, required)
        except LLMInvalidResponseError as exc:
            last_error = str(exc)
            continue
        _write_cache(cache_path, model=resolved_model, role=role, prompt=prompt, response=response)
        return response
    raise LLMInvalidResponseError(
        f"role={role!r} model={resolved_model!r}: invalid JSON after one retry: {last_error}"
    )


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
