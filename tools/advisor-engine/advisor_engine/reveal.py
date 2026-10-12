from __future__ import annotations

import datetime as dt
import json
import re
import sqlite3
from pathlib import Path

from .identity import suppressed_clusters
from .paths import EngineError, engine_key, keyed, marks, write_private

DAILY_CAP = 20
LOG = "reveal.log"
UNSOURCED = ("no_public_source", "pattern_guess")
BY_NAME = ("name_institution",)


class Refused(EngineError):
    pass


def contact_confidence(how: str, source_url: str | None) -> str:
    h = (how or "").lower()
    if not (source_url or "").strip() or any(w in h for w in UNSOURCED):
        return "unsourced"
    if any(w in h for w in BY_NAME):
        return "medium"
    return "high"


def log(home: Path, who: str, outcome: str, now: dt.datetime) -> None:
    line = json.dumps({"at": now.isoformat(timespec="seconds"), "who": who, "outcome": outcome}) + "\n"
    write_private(home, home / LOG, line.encode(), append=True)


def revealed_today(home: Path, now: dt.datetime) -> int:
    p = home / LOG
    if not p.exists():
        return 0
    day = now.date().isoformat()
    n = 0
    with p.open() as f:
        for line in f:
            e = json.loads(line)
            n += e["outcome"] == "revealed" and e["at"].startswith(day)
    return n


def reveal(handle: str, store: sqlite3.Connection, eng: sqlite3.Connection, home: Path, show: bool, now: dt.datetime | None = None) -> str:
    now = now or dt.datetime.now(dt.timezone.utc)
    key = engine_key(home)
    m = re.fullmatch(r"a(\d+)", handle.strip())
    if not m:
        raise Refused("give one advisor handle from a query result, such as a123")
    rid = int(m.group(1))
    who = keyed(key, "reveal", str(rid))

    def refuse(outcome: str, message: str):
        log(home, who, outcome, now)
        raise Refused(message)

    if not show:
        refuse("refused_no_flag", "addresses stay hidden, pass --show-address to print one for this advisor")
    if revealed_today(home, now) >= DAILY_CAP:
        refuse("refused_cap", f"the cap of {DAILY_CAP} reveals a day is reached")
    row = eng.execute("select tier, cluster from advisor where rid = ? and tier in ('own', 'high')", (rid,)).fetchone()
    if not row:
        refuse("refused_identity", "no advisor with a direct or high identity match has this handle")
    tier, cluster = row
    if cluster in suppressed_clusters(store, eng, home, key):
        refuse("refused_suppressed", "this person asked to be left out")
    ids = [rid] + [r[0] for r in eng.execute("select aid from aid where rid = ? and aid != ?", (rid, rid))]
    found = store.execute(
        f"select value, source, source_url, date_seen, how_obtained from contact where kind = 'email' and person_id in ({marks(len(ids))}) "
        "order by date_seen desc, id desc limit 50",
        ids,
    ).fetchall()
    high = [c for c in found if contact_confidence(c[4], c[2]) == "high"]
    if not high:
        refuse("refused_no_high_contact", "no high-confidence address with a public source is on file for this advisor")
    value, source, source_url, date_seen, how = high[0]
    log(home, who, "revealed", now)
    return "\n".join([
        f"Address: {value}",
        f"Source: {source}, {source_url}",
        f"Seen: {date_seen}. Obtained: {how}.",
        f"Identity match: {tier}. Contact confidence: high.",
        "For one message from one applicant. This reveal is logged.",
    ])
