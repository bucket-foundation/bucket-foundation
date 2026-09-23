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
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Sequence

from .parallel import RateLimit, pmap

logger = logging.getLogger("hte.llm")

MODEL_POLICY_PATH = Path(__file__).parent / "data" / "model-policy.json"

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
    pass

class LLMCacheMissError(LLMError):
    pass

class LLMInvocationError(LLMError):
    pass

class LLMTimeoutError(LLMInvocationError):
    pass

class LLMInvalidResponseError(LLMError):
    pass

class _RefusalLike(LLMError):

    def __init__(self, *, role: str, prompt_sha256: str, cost_usd: float | None, envelope: dict[str, Any]) -> None:
        self.role = role
        self.prompt_sha256 = prompt_sha256
        self.cost_usd = cost_usd
        self.envelope = envelope
        super().__init__(self._message())

    def _message(self) -> str:
        raise NotImplementedError

class ModelRefusal(_RefusalLike):

    def _message(self) -> str:
        cost = f"${self.cost_usd:.4f}" if self.cost_usd is not None else "unknown"
        return f"role={self.role!r} prompt_sha256={self.prompt_sha256[:12]}: model refused (cost={cost})"

class ModelTruncation(_RefusalLike):

    def __init__(self, *, role: str, prompt_sha256: str, cost_usd: float | None, envelope: dict[str, Any], reason: str) -> None:
        self.reason = reason
        super().__init__(role=role, prompt_sha256=prompt_sha256, cost_usd=cost_usd, envelope=envelope)

    def _message(self) -> str:
        cost = f"${self.cost_usd:.4f}" if self.cost_usd is not None else "unknown"
        return f"role={self.role!r} prompt_sha256={self.prompt_sha256[:12]}: model truncated ({self.reason}, cost={cost})"

_RATE_LIMIT_PATTERNS = [
    re.compile(r"\b429\b"),
    re.compile(r"rate[ _-]?limit", re.IGNORECASE),
    re.compile(r"spend[ _-]?limit", re.IGNORECASE),
    re.compile(r"usage[ _-]?limit", re.IGNORECASE),
]

_RESET_HINT_RE = re.compile(
    r"((?:retry|try again) after [^\n.]+|resets? (?:at|in) [^\n.]+|"
    r"try again (?:at|in) [^\n.]+)",
    re.IGNORECASE,
)

def _check_rate_limit(*texts: str) -> None:
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
    calls: int = 0
    cache_hits: int = 0
    rate_limit_pauses: int = 0
    wall_time_s: float = 0.0
    refusals: int = 0
    truncations: int = 0
    timeouts: int = 0

    def to_dict(self) -> dict[str, float | int]:
        return {
            "calls": self.calls, "cache_hits": self.cache_hits,
            "rate_limit_pauses": self.rate_limit_pauses, "wall_time_s": self.wall_time_s,
            "refusals": self.refusals, "truncations": self.truncations,
            "timeouts": self.timeouts,
        }

class _StatsRegistry:

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

    def record_timeout(self, role: str, *, wall_time_s: float) -> None:
        with self._lock:
            row = self._by_role.setdefault(role, _RoleStats())
            row.timeouts += 1
            row.wall_time_s += wall_time_s

    def snapshot(self) -> dict[str, dict[str, float | int]]:
        with self._lock:
            return {role: row.to_dict() for role, row in self._by_role.items()}

    def reset(self) -> None:
        with self._lock:
            self._by_role.clear()

_STATS = _StatsRegistry()

def stats() -> dict[str, dict[str, float | int]]:
    return _STATS.snapshot()

def reset_stats() -> None:
    _STATS.reset()

@lru_cache(maxsize=1)
def _model_policy() -> dict[str, Any]:
    return json.loads(MODEL_POLICY_PATH.read_text())

def resolve_model(role: str) -> str:
    policy = _model_policy()
    if role == "escalation":
        return policy["escalation"]
    try:
        return policy["roles"][role]
    except KeyError as exc:
        raise KeyError(f"no model-policy entry for role {role!r}") from exc

def escalation_model() -> str:
    return _model_policy()["escalation"]

def resolve_timeout(role: str) -> float:
    return _model_policy().get("timeouts", {}).get(role, DEFAULT_TIMEOUT_S)

def _cache_key(model: str, prompt: str) -> str:
    h = hashlib.sha256()
    h.update(model.encode("utf-8"))
    h.update(b"\x00")
    h.update(prompt.encode("utf-8"))
    return h.hexdigest()

def _cache_path(cache_dir: str | Path, model: str, prompt: str) -> Path:
    return Path(cache_dir) / f"{_cache_key(model, prompt)}.json"

def _prompt_sha256(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()

_SESSION_ID_KEYS = frozenset({"session_id", "uuid"})

def _sanitize_envelope(envelope: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in envelope.items() if k not in _SESSION_ID_KEYS}

_ID_LIKE_RE = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
    r"|\b(?:session[_-]?id|uuid|request[_-]?id|account[_-]?id)\s*[:=]\s*[\"']?[\w-]+[\"']?"
    r"|\b[0-9a-fA-F]{32,}\b",
    re.IGNORECASE,
)

def _strip_id_like_tokens(text: str) -> str:
    return _ID_LIKE_RE.sub("<redacted-id>", text)

_INDEX_LOCK = threading.Lock()

def _provenance_index_path(cache_dir: str | Path) -> Path:
    return Path(cache_dir) / "index.jsonl"

def _append_provenance_index(
    cache_dir: str | Path, *, cache_key: str, role: str, provenance: dict[str, Any], outcome: str | None = None,
) -> None:
    if not provenance:
        return
    line = {
        "cache_key": cache_key,
        "role": role,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "source_ids": sorted(set(provenance.get("source_ids") or [])),
        "production_ids": sorted(set(provenance.get("production_ids") or [])),
        "learner_ids": sorted(set(provenance.get("learner_ids") or [])),
    }
    if outcome is not None:
        line["outcome"] = outcome
    path = _provenance_index_path(cache_dir)
    with _INDEX_LOCK:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(line) + "\n")

def _refusal_outcome(exc: _RefusalLike) -> str:
    return f"truncation:{exc.reason}" if isinstance(exc, ModelTruncation) else "refusal"

def _refusal_payload(exc: _RefusalLike) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "kind": "truncation" if isinstance(exc, ModelTruncation) else "refusal",
        "cost_usd": exc.cost_usd, "envelope": exc.envelope,
    }
    if isinstance(exc, ModelTruncation):
        payload["reason"] = exc.reason
    return payload

def _read_cached_result(path: Path, *, role: str, prompt: str) -> dict[str, Any]:
    payload = json.loads(path.read_text())
    refusal = payload.get("refusal")
    if refusal is None:
        return payload["response"]
    kwargs = dict(
        role=role, prompt_sha256=_prompt_sha256(prompt),
        cost_usd=refusal.get("cost_usd"), envelope=refusal.get("envelope", {}),
    )
    if refusal["kind"] == "truncation":
        raise ModelTruncation(reason=refusal["reason"], **kwargs)
    raise ModelRefusal(**kwargs)

def _write_cache(
    path: Path, *, model: str, role: str, prompt: str,
    response: dict[str, Any] | None = None, refusal: dict[str, Any] | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {"model": model, "role": role, "prompt_sha256": _prompt_sha256(prompt)}
    payload["refusal" if refusal is not None else "response"] = refusal if refusal is not None else response
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
        logger.error("hte.llm: role=%r the `claude` CLI is not on PATH", role)
        raise LLMInvocationError("the `claude` CLI is not on PATH") from exc
    except subprocess.TimeoutExpired as exc:
        logger.error(
            "hte.llm: role=%r claude -p timed out after %ss (prompt length %d chars)",
            role, timeout, len(prompt),
        )
        raise LLMTimeoutError(f"claude -p timed out after {timeout}s") from exc
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
        excerpt = _strip_id_like_tokens((proc.stderr or proc.stdout).strip()[:300])
        logger.error("hte.llm: role=%r claude -p exited %d: %r", role, proc.returncode, excerpt)
        raise LLMInvocationError(f"claude -p exited {proc.returncode} for role={role!r}: {excerpt!r}")
    if envelope is None:
        excerpt = _strip_id_like_tokens(proc.stdout[:500])
        logger.error("hte.llm: role=%r claude -p produced non-JSON stdout: %r", role, excerpt)
        raise LLMInvocationError(f"claude -p produced non-JSON stdout: {excerpt!r}")
    if envelope.get("is_error"):
        _check_rate_limit(str(envelope.get("result", "")))
        logger.error(
            "hte.llm: role=%r claude -p reported is_error, stop_reason=%r",
            role, envelope.get("stop_reason"),
        )
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
    timeout: float | None = None,
    mode: str | None = None,
    provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    start = time.monotonic()
    resolved_mode = mode if mode is not None else os.environ.get("HTE_LLM_MODE")
    if resolved_mode == "fake":
        from . import fakellm
        response = fakellm.complete(prompt, role=role, schema=schema)
        _STATS.record_call(role, cache_hit=False, wall_time_s=time.monotonic() - start)
        return response

    resolved_model = model or resolve_model(role)
    resolved_timeout = timeout if timeout is not None else resolve_timeout(role)
    cache_path = _cache_path(cache_dir, resolved_model, prompt)
    if cache_path.exists():
        try:
            response = _read_cached_result(cache_path, role=role, prompt=prompt)
        except (ModelRefusal, ModelTruncation) as exc:
            if isinstance(exc, ModelTruncation):
                _STATS.record_truncation(role, wall_time_s=time.monotonic() - start)
            else:
                _STATS.record_refusal(role, wall_time_s=time.monotonic() - start)
            if provenance and not replay_only:
                _append_provenance_index(
                    cache_dir, cache_key=cache_path.stem, role=role, provenance=provenance,
                    outcome=_refusal_outcome(exc),
                )
            raise
        _STATS.record_call(role, cache_hit=True, wall_time_s=time.monotonic() - start)
        if provenance and not replay_only:
            _append_provenance_index(cache_dir, cache_key=cache_path.stem, role=role, provenance=provenance)
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
            envelope = _invoke_cli(call_prompt, resolved_model, schema, resolved_timeout, role=role)
        except RateLimit:
            _STATS.record_rate_limit_pause(role)
            raise
        except LLMTimeoutError:
            _STATS.record_timeout(role, wall_time_s=time.monotonic() - start)
            raise
        except (ModelRefusal, ModelTruncation) as exc:
            if isinstance(exc, ModelTruncation):
                _STATS.record_truncation(role, wall_time_s=time.monotonic() - start)
            else:
                _STATS.record_refusal(role, wall_time_s=time.monotonic() - start)
            _write_cache(cache_path, model=resolved_model, role=role, prompt=prompt, refusal=_refusal_payload(exc))
            if provenance:
                _append_provenance_index(
                    cache_dir, cache_key=cache_path.stem, role=role, provenance=provenance,
                    outcome=_refusal_outcome(exc),
                )
            raise
        try:
            response = _parse_response(envelope, required)
        except LLMInvalidResponseError as exc:
            last_error = str(exc)
            logger.warning(
                "hte.llm: role=%r model=%r invalid response on attempt %d, retrying: %s",
                role, resolved_model, attempt + 1, last_error,
            )
            continue
        _write_cache(cache_path, model=resolved_model, role=role, prompt=prompt, response=response)
        _STATS.record_call(role, cache_hit=False, wall_time_s=time.monotonic() - start)
        if provenance:
            _append_provenance_index(cache_dir, cache_key=cache_path.stem, role=role, provenance=provenance)
        return response
    _STATS.record_call(role, cache_hit=False, wall_time_s=time.monotonic() - start)
    logger.error(
        "hte.llm: role=%r model=%r invalid JSON after one retry: %s", role, resolved_model, last_error,
    )
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
    timeout: float | None = None,
    mode: str | None = None,
    workers: int | None = None,
    default: dict[str, Any] | None = None,
    provenance: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any] | None] = [None] * len(prompts)
    resolved_mode = mode if mode is not None else os.environ.get("HTE_LLM_MODE")
    pending: list[int] = []
    for i, prompt in enumerate(prompts):
        if resolved_mode != "fake":
            resolved_model = model or resolve_model(role)
            cache_path = _cache_path(cache_dir, resolved_model, prompt)
            if cache_path.exists():
                try:
                    results[i] = complete(
                        prompt, role=role, schema=schema, model=model, cache_dir=cache_dir,
                        replay_only=replay_only, timeout=timeout, mode=mode, provenance=provenance,
                    )
                except (ModelRefusal, ModelTruncation):
                    if default is None:
                        raise
                    results[i] = default
                continue
        pending.append(i)

    if pending:
        def _call(i: int) -> dict[str, Any]:
            return complete(
                prompts[i], role=role, schema=schema, model=model, cache_dir=cache_dir,
                replay_only=replay_only, timeout=timeout, mode=mode, provenance=provenance,
            )

        pmap_kwargs: dict[str, Any] = {"workers": workers}
        if default is not None:
            pmap_kwargs["on_error"] = "default"
            pmap_kwargs["default"] = default
            pmap_kwargs["default_exceptions"] = (ModelRefusal, ModelTruncation)

        for idx, response in zip(pending, pmap(_call, pending, **pmap_kwargs)):
            results[idx] = response

    return results  # type: ignore[return-value]

@dataclass(frozen=True)
class CacheStats:
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
