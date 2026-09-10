"""feed402 retrieval client for the x402-research-gateway.

Two modes, selected by `mode`:

- `"fixture"`: reads a committed envelope from `hte/data/retrieval-
  fixtures/*.json`, no network call, for tests and for a campaign that
  wants a deterministic seed corpus.
- `"live"`: one HTTP call to a feed402 gateway (`DEFAULT_GATEWAY_URL`,
  override with `gateway_url`). This module never signs an x402 payment:
  a live call's own `402 Payment Required` challenge is recorded
  verbatim in the returned envelope's `payment_required` field and the
  call stops there. Paying needs the founder's own wallet key (`~/
  agfarms/CLAUDE.md`'s Viatika/x402 integration architecture; see also
  `hte.publish.mint_hook`, which stops at the identical point for the
  same reason).

Every call, in either mode, is persisted once, immutably, as
`<out_dir>/envelopes/<sha256(envelope_json)>.json` (`out_dir` is a run
directory, `runs/<campaign>/<timestamp>/`), plus one `RetrievalRun`
record describing the call that produced it (`main.tex` §8's retrieval-
provenance paragraph; `hte.corpus.RetrievalEnvelope` is this package's
fixture-only precursor of the same idea and is left as-is, out of this
module's own scope). The envelope shape itself, `{"data", "citation",
"receipt"}` on a paid response or `{"data": null, "citation": [],
"payment_required": {...}}` on an unpaid 402, follows `~/agfarms/
feed402/SPEC.md` §3 exactly.

`forbidden_urls` from `~/agfarms/.nucleus/config.json` and this
repository's own `.nucleus/config.json` (merged, either file optional,
per the root `CLAUDE.md`'s Environment Safety contract) is checked
before any live network call; a match raises `ForbiddenURLError` with no
request sent.
"""
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

# No production feed402 gateway is deployed for this package's own use yet
# (`~/agfarms/CLAUDE.md`'s feed402 status line: "real x402 payment
# verification, real dataset, and remote push deferred"). This default
# points at the same Base-Sepolia reference merchant `~/agfarms/
# x402-research-gateway/` already runs; a caller with a different
# provider passes `gateway_url` explicitly.
DEFAULT_GATEWAY_URL = "https://x402-research-gateway.agfarms.dev"
FEED402_SPEC_VERSION = "feed402/0.3"


class RetrievalError(RuntimeError):
    """Base class for every error this module raises."""


class ForbiddenURLError(RetrievalError):
    """A live-mode gateway URL matched a `forbidden_urls` pattern; no
    request was sent."""


class FixtureNotFoundError(RetrievalError):
    """Fixture mode named a fixture `hte/data/retrieval-fixtures/` does
    not carry."""


def _config_paths() -> list[Path]:
    home = Path.home()
    return [
        home / "agfarms" / ".nucleus" / "config.json",
        Path.cwd() / ".nucleus" / "config.json",
    ]


def load_forbidden_patterns(extra_paths: list[Path] | None = None) -> list[str]:
    """Every `forbidden_urls` pattern named by any config file in
    `extra_paths` (checked first, so a caller can point at a specific
    project's own `.nucleus/config.json`) followed by `~/agfarms/.nucleus/
    config.json` and `./.nucleus/config.json`. A missing file, or a file
    with no `forbidden_urls` key, contributes no patterns rather than
    raising: the root `CLAUDE.md` treats a missing config as "no patterns
    on file," not as an error."""
    patterns: list[str] = []
    for path in list(extra_paths or []) + _config_paths():
        try:
            data = json.loads(Path(path).read_text())
        except (OSError, json.JSONDecodeError):
            continue
        patterns.extend(data.get("forbidden_urls", []) or [])
    return patterns


def is_forbidden(url: str, patterns: list[str] | None = None) -> bool:
    """`True` when `url`'s host matches any `forbidden_urls` pattern.
    Patterns are `fnmatch`-style wildcards (`*.prod.example.com` matches
    `api.prod.example.com`, the root `CLAUDE.md`'s own worked example).
    `patterns=None` loads the merged config patterns via
    `load_forbidden_patterns`; pass an explicit list (including `[]`) to
    check against a fixed set instead."""
    resolved = patterns if patterns is not None else load_forbidden_patterns()
    host = urlparse(url).netloc or url
    return any(fnmatch.fnmatch(host, pattern) for pattern in resolved)


@dataclass
class RetrievalRun:
    """One `retrieve()` call's own record: which mode, which gateway or
    fixture, and which envelope sha256(es) it wrote. A future ingestion
    step reads this to know which envelope files back a given campaign's
    corpus."""
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
    """Every fixture name available under `hte/data/retrieval-fixtures/`
    (the file's own stem, with no `.json` suffix), sorted."""
    return sorted(p.stem for p in FIXTURES_DIR.glob("*.json"))


def _load_fixture(name: str) -> dict[str, Any]:
    path = FIXTURES_DIR / f"{name}.json"
    if not path.is_file():
        raise FixtureNotFoundError(
            f"no fixture named {name!r} under {FIXTURES_DIR}; have {list_fixtures()}"
        )
    return json.loads(path.read_text())


def _live_request(gateway_url: str, tier: str, query: str, timeout: float = 15.0) -> dict[str, Any]:
    """One POST to `<gateway_url>/<tier>` (`~/agfarms/feed402/SPEC.md`
    §1's own tier-path convention, `/raw`, `/query`, `/insight`). This
    package never carries a wallet signer, so every live call is
    expected to come back `402 Payment Required`; that challenge, status
    code, headers, and body, is captured verbatim into the returned
    envelope's `payment_required` field rather than retried or paid. A
    `200 OK` (a gateway that, unexpectedly, needed no payment for this
    call) is passed through as a normal envelope instead."""
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
    """Writes `envelope` under `envelopes_dir/<sha256>.json`, creating the
    directory if needed, and returns the sha256 hex digest. An envelope
    already on disk at that hash is left untouched: the same call
    replayed twice (a re-run over the same fixture, or a live 402 whose
    challenge text repeats byte for byte) writes the identical file
    rather than a second copy, which is what "immutable" buys here, one
    file per distinct envelope regardless of how many `retrieve()` calls
    produced it."""
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
    """Run one retrieval call and persist its envelope under
    `<out_dir>/envelopes/`. `out_dir` is a run directory (`runs/
    <campaign>/<timestamp>/`); this function creates `envelopes/` under
    it as needed.

    `mode="fixture"` reads `fixture_name` (defaulting to `query` when
    `fixture_name` is not given) from `hte/data/retrieval-fixtures/` with
    no network call. `mode="live"` sends one request to `gateway_url`
    (default `DEFAULT_GATEWAY_URL`) for `tier`, after checking it against
    `forbidden_patterns` (default: the merged `forbidden_urls` config,
    see `load_forbidden_patterns`); a live call never signs a payment, so
    its own `402` challenge is what gets persisted (see `_live_request`).

    Returns `(envelope, RetrievalRun)`.
    """
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

    # The envelope is persisted exactly as the fixture file or the live
    # gateway produced it, no extra wrapping fields: two calls that
    # produce byte-identical envelopes (the same fixture fetched twice,
    # or two live 402 challenges with identical bodies) hash to the same
    # file rather than writing a duplicate, and `RetrievalRun` (below,
    # `requested_at`) is where this specific call's own timestamp lives.
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
