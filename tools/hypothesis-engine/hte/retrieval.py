from __future__ import annotations

import fnmatch
import hashlib
import json
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

FIXTURES_DIR = Path(__file__).parent / "data" / "retrieval-fixtures"

DEFAULT_GATEWAY_URL = "https://x402-research-gateway.agfarms.dev"
FEED402_SPEC_VERSION = "feed402/0.3"

class RetrievalError(RuntimeError):
    pass

class ForbiddenURLError(RetrievalError):
    pass

class FixtureNotFoundError(RetrievalError):
    pass

def _config_paths() -> list[Path]:
    home = Path.home()
    return [
        home / "agfarms" / ".nucleus" / "config.json",
        Path.cwd() / ".nucleus" / "config.json",
    ]

def load_forbidden_patterns(extra_paths: list[Path] | None = None) -> list[str]:
    patterns: list[str] = []
    for path in list(extra_paths or []) + _config_paths():
        try:
            data = json.loads(Path(path).read_text())
        except (OSError, json.JSONDecodeError):
            continue
        patterns.extend(data.get("forbidden_urls", []) or [])
    return patterns

def is_forbidden(url: str, patterns: list[str] | None = None) -> bool:
    resolved = patterns if patterns is not None else load_forbidden_patterns()
    host = urlparse(url).netloc or url
    return any(fnmatch.fnmatch(host, pattern) for pattern in resolved)

@dataclass
class RetrievalRun:
    run_id: str
    campaign: str
    mode: str
    query: str
    tier: str
    gateway_url: str | None
    fixture_name: str | None
    requested_at: str
    envelope_shas: list[str] = field(default_factory=list)
    payment_required: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id, "campaign": self.campaign, "mode": self.mode,
            "query": self.query, "tier": self.tier, "gateway_url": self.gateway_url,
            "fixture_name": self.fixture_name, "requested_at": self.requested_at,
            "envelope_shas": list(self.envelope_shas), "payment_required": self.payment_required,
        }

def list_fixtures() -> list[str]:
    return sorted(p.stem for p in FIXTURES_DIR.glob("*.json"))

def _load_fixture(name: str) -> dict[str, Any]:
    path = FIXTURES_DIR / f"{name}.json"
    if not path.is_file():
        raise FixtureNotFoundError(
            f"no fixture named {name!r} under {FIXTURES_DIR}; have {list_fixtures()}"
        )
    return json.loads(path.read_text())

def _live_request(gateway_url: str, tier: str, query: str, timeout: float = 15.0) -> dict[str, Any]:
    url = gateway_url.rstrip("/") + f"/{tier}"
    body = json.dumps({"query": query}).encode("utf-8")
    request = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
            payload.setdefault("citation", [])
            return payload
    except urllib.error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="replace")
        try:
            challenge = json.loads(raw_body) if raw_body else {}
        except json.JSONDecodeError:
            challenge = {"raw": raw_body}
        return {
            "data": None,
            "citation": [],
            "payment_required": {
                "status": exc.code,
                "headers": dict(exc.headers.items()) if exc.headers else {},
                "challenge": challenge,
            },
        }
    except urllib.error.URLError as exc:
        raise RetrievalError(f"live retrieval to {url!r} failed: {exc}") from exc

def _write_envelope(envelopes_dir: Path, envelope: dict[str, Any]) -> str:
    payload = json.dumps(envelope, indent=2, sort_keys=True)
    sha = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    envelopes_dir.mkdir(parents=True, exist_ok=True)
    path = envelopes_dir / f"{sha}.json"
    if not path.exists():
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(payload)
        tmp.replace(path)
    return sha

def retrieve(
    *,
    mode: str,
    campaign: str,
    out_dir: str | Path,
    query: str = "",
    tier: str = "query",
    gateway_url: str | None = None,
    fixture_name: str | None = None,
    forbidden_patterns: list[str] | None = None,
) -> tuple[dict[str, Any], RetrievalRun]:
    if mode not in ("fixture", "live"):
        raise ValueError(f"mode must be 'fixture' or 'live', got {mode!r}")

    run_dir = Path(out_dir)
    requested_at = datetime.now(timezone.utc).isoformat()
    run_id = hashlib.sha256(f"{campaign}:{requested_at}:{mode}:{query}".encode()).hexdigest()[:16]

    if mode == "fixture":
        resolved_fixture = fixture_name or query
        envelope = _load_fixture(resolved_fixture)
        payment_required = False
        used_gateway = None
    else:
        resolved_gateway = gateway_url or DEFAULT_GATEWAY_URL
        if is_forbidden(resolved_gateway, forbidden_patterns):
            raise ForbiddenURLError(
                f"{resolved_gateway!r} matches a forbidden_urls pattern; no request sent"
            )
        envelope = _live_request(resolved_gateway, tier, query)
        payment_required = envelope.get("payment_required") is not None
        used_gateway = resolved_gateway
        resolved_fixture = None

    sha = _write_envelope(run_dir / "envelopes", envelope)

    run = RetrievalRun(
        run_id=run_id, campaign=campaign, mode=mode, query=query, tier=tier,
        gateway_url=used_gateway, fixture_name=resolved_fixture if mode == "fixture" else None,
        requested_at=requested_at, envelope_shas=[sha], payment_required=payment_required,
    )
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / f"retrieval-{run_id}.json").write_text(json.dumps(run.to_dict(), indent=2))
    return envelope, run

__all__ = [
    "retrieve", "RetrievalRun", "RetrievalError", "ForbiddenURLError", "FixtureNotFoundError",
    "is_forbidden", "load_forbidden_patterns", "list_fixtures",
    "DEFAULT_GATEWAY_URL", "FEED402_SPEC_VERSION",
]
