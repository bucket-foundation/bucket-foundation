from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from .paths import state_dir
from .registry import Tool

DEFAULT_TTL_DAYS = 7
MAX_TTL_DAYS = 30
ROTATE_GRACE_S = 600
SIGNATURE_TTL_S = 60
STAFF_SCOPES = frozenset({"read", "local", "personal"})
FOUNDER_SCOPES = frozenset({"read", "local", "personal", "gdrive", "repo"})
ANON_SCOPES = frozenset({"read"})


class AuthError(PermissionError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class Principal:
    user: str
    role: str
    scopes: frozenset

    @property
    def founder(self) -> bool:
        return self.role == "founder"


def founder_email() -> str:
    return os.environ.get("BUCKET_FOUNDER_EMAIL", "").strip().lower()


def role_for(email: str) -> str:
    f = founder_email()
    return "founder" if f and email.strip().lower() == f else "staff"


def principal(email: str, scopes=None) -> Principal:
    role = role_for(email)
    allowed = FOUNDER_SCOPES if role == "founder" else STAFF_SCOPES
    granted = allowed if scopes is None else allowed & frozenset(scopes)
    return Principal(user=email.strip().lower(), role=role, scopes=frozenset(granted))


def anonymous() -> Principal:
    return Principal(user="local", role="anonymous", scopes=ANON_SCOPES)


def authorize(p: Principal, tool: Tool, args: dict) -> None:
    if tool.scope not in p.scopes:
        raise AuthError("forbidden", f"{p.user} ({p.role}) may not run {tool.scope} tool {tool.id}")
    target = str(args.get("for_user") or p.user).strip().lower()
    if tool.scope == "personal" and target != p.user and not p.founder:
        raise AuthError("forbidden", "personal tools run on your own data only")


def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


class TokenStore:
    def __init__(self, path: Path | None = None, clock=time.time):
        self.path = Path(path) if path else state_dir() / "tokens.json"
        self.clock = clock
        self._lock = threading.Lock()

    def _read(self) -> dict:
        if not self.path.exists():
            return {}
        return json.loads(self.path.read_text())

    def _write(self, rows: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(rows, indent=1, sort_keys=True))
        os.chmod(tmp, 0o600)
        tmp.replace(self.path)

    def issue(self, user: str, scopes, ttl_days: float = DEFAULT_TTL_DAYS) -> tuple[str, str]:
        if not 0 < ttl_days <= MAX_TTL_DAYS:
            raise ValueError(f"ttl must be above 0 and at most {MAX_TTL_DAYS} days")
        bad = set(scopes) - FOUNDER_SCOPES
        if bad:
            raise ValueError(f"unknown scopes {sorted(bad)}")
        tid = secrets.token_hex(6)
        secret = f"bwt_{tid}_{secrets.token_urlsafe(32)}"
        now = self.clock()
        with self._lock:
            rows = self._read()
            rows[tid] = {
                "user": user.strip().lower(),
                "scopes": sorted(set(scopes)),
                "sha256": _hash(secret),
                "created": now,
                "expires": now + ttl_days * 86400,
                "revoked": False,
            }
            self._write(rows)
        return tid, secret

    def list(self) -> list[dict]:
        now = self.clock()
        return [
            {
                "id": k,
                **{x: v[x] for x in ("user", "scopes", "created", "expires", "revoked")},
                "active": not v["revoked"] and v["expires"] > now,
            }
            for k, v in sorted(self._read().items())
        ]

    def revoke(self, tid: str) -> None:
        with self._lock:
            rows = self._read()
            if tid not in rows:
                raise KeyError(tid)
            rows[tid]["revoked"] = True
            self._write(rows)

    def rotate(self, tid: str) -> tuple[str, str]:
        rows = self._read()
        if tid not in rows or rows[tid]["revoked"]:
            raise KeyError(tid)
        old = rows[tid]
        remaining = max(old["expires"] - self.clock(), 86400) / 86400
        new_id, secret = self.issue(old["user"], old["scopes"], min(remaining, MAX_TTL_DAYS))
        with self._lock:
            rows = self._read()
            rows[tid]["expires"] = min(rows[tid]["expires"], self.clock() + ROTATE_GRACE_S)
            rows[tid]["replaced_by"] = new_id
            self._write(rows)
        return new_id, secret

    def verify(self, secret: str | None) -> Principal:
        if not secret:
            raise AuthError("unauthorized", "no token")
        parts = secret.split("_")
        if len(parts) < 3 or parts[0] != "bwt":
            raise AuthError("unauthorized", "malformed token")
        row = self._read().get(parts[1])
        if not row or not hmac.compare_digest(row["sha256"], _hash(secret)):
            raise AuthError("unauthorized", "unknown token")
        if row["revoked"]:
            raise AuthError("unauthorized", "token revoked")
        if row["expires"] <= self.clock():
            raise AuthError("unauthorized", "token expired")
        return principal(row["user"], row["scopes"])


def signing_keys() -> list[bytes]:
    raw = os.environ.get("WORKBENCH_SIGNING_KEYS", "")
    keys = [k.strip().encode() for k in raw.split(",") if k.strip()]
    for k in keys:
        if len(k) < 32:
            raise AuthError("misconfigured", "each signing key needs at least 32 characters")
    return keys


def sign(body: bytes, key: bytes) -> str:
    return hmac.new(key, body, hashlib.sha256).hexdigest()


class SignedRequests:
    def __init__(self, keys: list[bytes], clock=time.time):
        if not keys:
            raise AuthError("misconfigured", "WORKBENCH_SIGNING_KEYS is empty")
        self.keys = keys
        self.clock = clock
        self._seen: dict[str, float] = {}
        self._lock = threading.Lock()

    def verify(self, body: bytes, signature: str | None) -> tuple[Principal, dict]:
        if not signature or not any(hmac.compare_digest(sign(body, k), signature) for k in self.keys):
            raise AuthError("unauthorized", "bad signature")
        msg = json.loads(body)
        now = self.clock()
        exp = float(msg.get("exp", 0))
        if exp <= now or exp > now + SIGNATURE_TTL_S + 5:
            raise AuthError("unauthorized", "signature expired")
        nonce = str(msg.get("nonce", ""))
        if len(nonce) < 16:
            raise AuthError("unauthorized", "nonce missing")
        with self._lock:
            self._seen = {n: e for n, e in self._seen.items() if e > now}
            if nonce in self._seen:
                raise AuthError("unauthorized", "replayed request")
            self._seen[nonce] = exp
        if msg.get("role") not in ("staff", "founder"):
            raise AuthError("unauthorized", "caller is not staff")
        p = principal(str(msg.get("user", "")))
        if msg["role"] == "staff" and p.founder:
            p = Principal(p.user, "staff", STAFF_SCOPES)
        if msg["role"] == "founder" and not p.founder:
            raise AuthError("unauthorized", "founder role does not match BUCKET_FOUNDER_EMAIL")
        return p, msg
