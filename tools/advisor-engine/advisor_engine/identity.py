from __future__ import annotations

import sqlite3
from pathlib import Path

from .paths import EngineError, chunks, keyed, marks, norm_email, norm_name, norm_openalex, norm_orcid

REMOVAL_LIST = "removal-list.txt"
SCHEMES = {"person", "orcid", "openalex", "email", "name"}


class SuppressionUnreadable(EngineError):
    pass


def normal(scheme: str, value: str) -> str | None:
    if scheme == "orcid":
        return norm_orcid(value)
    if scheme == "openalex":
        return norm_openalex(value)
    if scheme == "email":
        return norm_email(value)
    if scheme == "name":
        return norm_name(value) or None
    return None


def removal_list(home: Path) -> list[tuple[str, str]]:
    p = home / REMOVAL_LIST
    if not p.exists():
        return []
    out = []
    for n, line in enumerate(p.read_text().splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        scheme, sep, value = line.partition(":")
        if not sep or scheme not in SCHEMES or not value.strip():
            raise SuppressionUnreadable(f"line {n} of the removal list is unreadable")
        out.append((scheme, value.strip()))
    return out


def suppressed_clusters(store: sqlite3.Connection, eng: sqlite3.Connection, home: Path, key: bytes) -> set[int]:
    persons: set[int] = set()
    keys: set[str] = set()

    def take(scheme: str, value) -> None:
        if value is None or value == "":
            return
        if scheme == "person":
            persons.add(int(value))
            return
        v = normal(scheme, str(value))
        if v:
            keys.add(keyed(key, scheme, v))

    try:
        cur = store.execute("select person_id, email_norm, orcid, openalex_id, name from do_not_contact")
        while True:
            rows = cur.fetchmany(2000)
            if not rows:
                break
            for pid, email, orcid, oa, name in rows:
                take("person", pid)
                take("email", email)
                take("orcid", orcid)
                take("openalex", oa)
                if not (pid or email or orcid or oa):
                    take("name", name)
        for scheme, value in removal_list(home):
            take(scheme, value)
        clusters: set[int] = set()
        for part in chunks(sorted(persons)):
            clusters.update(r[0] for r in eng.execute(f"select cluster from member where person_id in ({marks(len(part))})", part))
        for part in chunks(sorted(keys)):
            clusters.update(r[0] for r in eng.execute(f"select cluster from alias where key in ({marks(len(part))})", part))
        return clusters
    except (sqlite3.Error, OSError, ValueError) as e:
        raise SuppressionUnreadable(f"the do-not-list check could not be read, so no list is shown: {type(e).__name__}") from e
