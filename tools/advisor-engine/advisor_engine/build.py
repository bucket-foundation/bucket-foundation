from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import shutil
import sqlite3
import time
from collections import Counter, defaultdict
from pathlib import Path

from . import __version__
from .paths import EngineError, chunks, engine_key, inside, keyed, keyset, marks, norm_openalex, norm_orcid, write_private

RECENCY_YEAR = 2018
KEEP_BUILDS = 2
POOL_TIERS = ("own", "high")
BARRED_SOURCE = "csrankings"
RETIRED_WORDS = ("emerit", "retired")
SENIORITY = ((1990, "1990 or earlier"), (2000, "1991 to 2000"), (2010, "2001 to 2010"), (9999, "2011 or later"))

SCHEMA = """
create table advisor (
  rid integer primary key, tier text not null, cluster integer not null, country text, field text, topics text,
  inst text, students integer not null, sources text not null, grant_count integer,
  first_year integer, last_year integer, emeritus integer not null, gated integer not null
);
create table aid (aid integer primary key, rid integer not null, tier text not null);
create table identity_edge (a integer not null, b integer not null, kind text not null);
create table member (person_id integer primary key, cluster integer not null);
create table alias (key text not null, cluster integer not null);
create table topic (id text primary key, name text, field text);
create table meta (k text primary key, v text);
"""

class Find:
    def __init__(self):
        self.parent: dict[int, int] = {}

    def root(self, x: int) -> int:
        p = self.parent.setdefault(x, x)
        while p != self.parent[p]:
            self.parent[p] = self.parent[self.parent[p]]
            p = self.parent[p]
        self.parent[x] = p
        return p

    def join(self, a: int, b: int) -> None:
        ra, rb = self.root(a), self.root(b)
        if ra != rb:
            self.parent[max(ra, rb)] = min(ra, rb)


def read_advisors(store: sqlite3.Connection):
    tiers: Counter = Counter()
    by_source: dict[str, Counter] = defaultdict(Counter)
    aids: dict[int, tuple[int, str]] = {}
    students: Counter = Counter()
    sources: dict[int, set] = defaultdict(set)
    medium: set[int] = set()
    sql = "select advisor_id from advisor_link where advisor_id > ? group by advisor_id order by advisor_id limit ?"
    for batch in keyset(store, sql):
        for part in chunks([r[0] for r in batch]):
            people = store.execute(
                f"select p.id, p.openalex_id is not null, m.confidence, m.match_id from person p "
                f"left join person_match m on m.person_id = p.id where p.id in ({marks(len(part))})",
                part,
            ).fetchall()
            match_ids = [r[3] for r in people if not r[1] and r[3] is not None]
            matched = set()
            for sub in chunks(match_ids):
                matched.update(r[0] for r in store.execute(f"select id from person where openalex_id is not null and id in ({marks(len(sub))})", sub))
            resolved: dict[int, tuple[str, int | None]] = {}
            for pid, own, conf, match_id in people:
                tier = "own" if own else (conf or "none")
                rid = pid if own else (match_id if match_id in matched else None)
                resolved[pid] = (tier, rid)
                tiers[tier] += 1
                if rid is not None and tier in POOL_TIERS:
                    aids[pid] = (rid, tier)
                elif rid is not None and tier == "medium":
                    medium.add(rid)
            links = store.execute(
                f"select advisor_id, source, count(*) from advisor_link where advisor_id in ({marks(len(part))}) group by 1, 2", part
            ).fetchall()
            for aid, source, n in links:
                tier, rid = resolved.get(aid, ("none", None))
                by_source[source]["advisors"] += 1
                if aid in aids:
                    by_source[source]["pool"] += 1
                    students[rid] += n
                    sources[rid].add(source)
                elif tier == "medium" and rid is not None:
                    by_source[source]["medium"] += 1
    return tiers, by_source, aids, students, sources, medium


def read_people(store: sqlite3.Connection, ids, columns: str):
    for part in chunks(sorted(ids)):
        yield from store.execute(f"select {columns} from person where id in ({marks(len(part))})", part)


def copy_edges(store: sqlite3.Connection, eng: sqlite3.Connection) -> int:
    n = 0
    sql = "select person_id, match_id from person_match where person_id > ? order by person_id limit ?"
    for batch in keyset(store, sql):
        eng.executemany("insert into identity_edge values (?, ?, 'match')", batch)
        n += len(batch)
    eng.commit()
    return n


def close_clusters(store: sqlite3.Connection, eng: sqlite3.Connection, seeds: set[int], find: Find, rounds: int = 12) -> set[int]:
    seen = set(seeds)
    frontier = set(seeds)
    for _ in range(rounds):
        if not frontier:
            break
        found: set[int] = set()
        for part in chunks(sorted(frontier)):
            q = marks(len(part))
            for a, b in eng.execute(f"select a, b from identity_edge where a in ({q}) union all select a, b from identity_edge where b in ({q})", part + part):
                find.join(a, b)
                found.update((a, b))
            ids = store.execute(f"select id, orcid, openalex_id from person where id in ({q})", part).fetchall()
            for column, values in (("orcid", {r[1]: r[0] for r in ids if r[1]}), ("openalex_id", {r[2]: r[0] for r in ids if r[2]})):
                for sub in chunks(sorted(values)):
                    for pid, value in store.execute(f"select id, {column} from person where {column} in ({marks(len(sub))})", sub):
                        find.join(pid, values[value])
                        found.add(pid)
        frontier = found - seen
        seen |= frontier
    if frontier:
        raise EngineError("identity clusters did not close, so the build stops")
    return seen


def write_aliases(store: sqlite3.Connection, eng: sqlite3.Connection, members: set[int], find: Find, key: bytes) -> int:
    n = 0

    def put(rows):
        nonlocal n
        rows = [(keyed(key, s, v), find.root(pid)) for s, v, pid in rows if v]
        eng.executemany("insert into alias values (?, ?)", rows)
        n += len(rows)

    for part in chunks(sorted(members)):
        q = marks(len(part))
        out = []
        for pid, orcid, oa, name_norm in store.execute(f"select id, orcid, openalex_id, name_norm from person where id in ({q})", part):
            out += [("orcid", norm_orcid(orcid), pid), ("openalex", norm_openalex(oa), pid), ("name", name_norm, pid)]
        for scheme, value, pid in store.execute(f"select scheme, value, person_id from person_xid where person_id in ({q})", part):
            if scheme == "email":
                out.append(("email", (value or "").lower(), pid))
            elif scheme.startswith("openalex"):
                out.append(("openalex", norm_openalex(value), pid))
            elif scheme == "orcid":
                out.append(("orcid", norm_orcid(value), pid))
        for value, pid in store.execute(f"select value_norm, person_id from contact where kind = 'email' and person_id in ({q})", part):
            out.append(("email", value, pid))
        put(out)
    last = ("", "")
    while True:
        batch = store.execute(
            "select old_key, reason, person_id from person_merge where (old_key, reason) > (?, ?) order by old_key, reason limit 5000", last
        ).fetchall()
        if not batch:
            break
        put(merge_alias(batch, members))
        last = batch[-1][:2]
    eng.commit()
    return n


def close_clusters(store: sqlite3.Connection, eng: sqlite3.Connection, seeds: set[int], find: Find, rounds: int = 12) -> set[int]:
    seen = set(seeds)
    frontier = set(seeds)
    for _ in range(rounds):
        if not frontier:
            break
        found: set[int] = set()
        for part in chunks(sorted(frontier)):
            q = marks(len(part))
            for a, b in eng.execute(f"select a, b from identity_edge where a in ({q}) union all select a, b from identity_edge where b in ({q})", part + part):
                find.join(a, b)
                found.update((a, b))
            ids = store.execute(f"select id, orcid, openalex_id from person where id in ({q})", part).fetchall()
            for column, values in (("orcid", {r[1]: r[0] for r in ids if r[1]}), ("openalex_id", {r[2]: r[0] for r in ids if r[2]})):
                for sub in chunks(sorted(values)):
                    for pid, value in store.execute(f"select id, {column} from person where {column} in ({marks(len(sub))})", sub):
                        find.join(pid, values[value])
                        found.add(pid)
        frontier = found - seen
        seen |= frontier
    if frontier:
        raise EngineError("identity clusters did not close, so the build stops")
    return seen


def write_aliases(store: sqlite3.Connection, eng: sqlite3.Connection, members: set[int], find: Find, key: bytes) -> int:
    n = 0

    def put(rows):
        nonlocal n
        rows = [(keyed(key, s, v), find.root(pid)) for s, v, pid in rows if v]
        eng.executemany("insert into alias values (?, ?)", rows)
        n += len(rows)

    for part in chunks(sorted(members)):
        q = marks(len(part))
        out = []
        for pid, orcid, oa, name_norm in store.execute(f"select id, orcid, openalex_id, name_norm from person where id in ({q})", part):
            out += [("orcid", norm_orcid(orcid), pid), ("openalex", norm_openalex(oa), pid), ("name", name_norm, pid)]
        for scheme, value, pid in store.execute(f"select scheme, value, person_id from person_xid where person_id in ({q})", part):
            if scheme == "email":
                out.append(("email", (value or "").lower(), pid))
            elif scheme.startswith("openalex"):
                out.append(("openalex", norm_openalex(value), pid))
            elif scheme == "orcid":
                out.append(("orcid", norm_orcid(value), pid))
        for value, pid in store.execute(f"select value_norm, person_id from contact where kind = 'email' and person_id in ({q})", part):
            out.append(("email", value, pid))
        put(out)
    sql = "select rowid, old_key, person_id from person_merge where rowid > ? order by rowid limit ?"
    try:
        store.execute("select rowid from person_merge limit 1").fetchall()
    except sqlite3.OperationalError:
        sql = None
    if sql:
        for batch in keyset(store, sql):
            put(merge_alias(batch, members))
    else:
        last = ""
        while True:
            batch = store.execute("select old_key, old_key, person_id from person_merge where old_key > ? order by old_key limit 5000", (last,)).fetchall()
            if not batch:
                break
            put(merge_alias(batch, members))
            last = batch[-1][0]
    eng.commit()
    return n


def merge_alias(batch, members):
    out = []
    for old_key, _, pid in batch:
        if pid not in members:
            continue
        scheme, _, value = old_key.partition(":")
        if scheme == "openalex":
            out.append(("openalex", norm_openalex(value), pid))
        elif scheme == "orcid":
            out.append(("orcid", norm_orcid(value), pid))
    return out


def read_years(wide: Path, wanted: set[str], log=print) -> dict[str, tuple[int, int]]:
    import pyarrow as pa
    import pyarrow.compute as pc
    import pyarrow.parquet as pq

    values = pa.array(sorted(wanted), type=pa.string())
    years: dict[str, tuple[int, int]] = {}
    files = sorted(wide.rglob("*.parquet"))
    if not files:
        raise EngineError("no parquet file under BKT_AUTHORS_WIDE")
    for i, f in enumerate(files):
        pf = pq.ParquetFile(f)
        for batch in pf.iter_batches(batch_size=20000, columns=["id", "affiliations"]):
            hit = batch.filter(pc.is_in(batch.column(0), value_set=values))
            if hit.num_rows == 0:
                continue
            for oid, affs in zip(hit.column(0).to_pylist(), hit.column(1).to_pylist()):
                ys = [y for a in affs or [] for y in a.get("years") or [] if y]
                if not ys:
                    continue
                lo, hi = min(ys), max(ys)
                if oid in years:
                    lo, hi = min(lo, years[oid][0]), max(hi, years[oid][1])
                years[oid] = (lo, hi)
        if i and i % 10000 == 0:
            log(f"activity years: {i} of {len(files)} files read")
    return years


def band(first_year: int | None) -> str:
    if first_year is None:
        return "no year"
    return next(label for top, label in SENIORITY if first_year <= top)


def coverage_tables(pool_rows, medium_rows):
    def tally(rows):
        c: Counter = Counter()
        for country, field in rows:
            c[("country", country or "")] += 1
            c[("field", field or "")] += 1
            c[("pair", f"{country or ''}|{field or ''}")] += 1
        return c

    pool, medium = tally(pool_rows), tally(medium_rows)
    out: dict[str, dict] = {"country": {}, "field": {}, "pair": {}}
    for kind, name in set(pool) | set(medium):
        out[kind][name] = {"pool": pool[(kind, name)], "medium": medium[(kind, name)]}
    return out


def build(store: sqlite3.Connection, home: Path, wide: Path | None, log=print) -> dict:
    if wide is None or not wide.is_dir():
        raise EngineError("set BKT_AUTHORS_WIDE to the authors parquet directory, the recency gate needs activity years")
    build_id = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    bdir = inside(home, home / "builds" / build_id)
    try:
        return run_build(store, home, wide, build_id, bdir, log)
    except BaseException:
        shutil.rmtree(bdir, ignore_errors=True)
        raise


def run_build(store: sqlite3.Connection, home: Path, wide: Path, build_id: str, bdir: Path, log) -> dict:
    started = time.time()
    key = engine_key(home)
    bdir.mkdir(parents=True)
    os.chmod(home / "builds", 0o700)
    os.chmod(bdir, 0o700)
    path = bdir / "engine.sqlite"
    eng = sqlite3.connect(path)
    os.chmod(path, 0o600)
    eng.executescript(SCHEMA)

    tiers, by_source, aids, students, sources, medium = read_advisors(store)
    pool_rids = {rid for rid, _ in aids.values()}
    medium -= pool_rids
    log(f"advisors read: {sum(tiers.values())} records, {len(aids)} in the pool, {len(pool_rids)} distinct people")

    people: dict[int, dict] = {}
    barred = 0
    for pid, oa, country, field, topics, ror, inst, grants, position, first_source in read_people(
        store, pool_rids, "id, openalex_id, country, field, topics, institution_ror, institution, grant_count, position, first_source"
    ):
        if (first_source or "").lower().startswith(BARRED_SOURCE):
            barred += 1
            continue
        pos = (position or "").lower()
        people[pid] = {
            "openalex": norm_openalex(oa), "country": country, "field": field, "topics": topics, "inst": ror or inst,
            "grants": grants, "emeritus": int(any(w in pos for w in RETIRED_WORDS)),
        }
    aids = {a: v for a, v in aids.items() if v[0] in people}
    medium_people = {pid: (norm_openalex(oa), country, field) for pid, oa, country, field in read_people(store, medium, "id, openalex_id, country, field")}

    edges = copy_edges(store, eng)
    eng.executescript("create index edge_a on identity_edge (a); create index edge_b on identity_edge (b);")
    find = Find()
    for aid, (rid, _) in aids.items():
        find.join(aid, rid)
    members = close_clusters(store, eng, set(aids) | set(people), find)
    eng.executemany("insert into member values (?, ?)", [(m, find.root(m)) for m in sorted(members)])
    eng.executemany("insert into aid values (?, ?, ?)", [(a, rid, tier) for a, (rid, tier) in sorted(aids.items())])
    aliases = write_aliases(store, eng, members, find, key)
    log(f"identity: {edges} match edges, {len(members)} cluster rows, {aliases} aliases")

    wanted = {p["openalex"] for p in people.values() if p["openalex"]} | {m[0] for m in medium_people.values() if m[0]}
    years = read_years(wide, wanted, log)

    tier_of: dict[int, str] = {}
    for aid, (rid, tier) in aids.items():
        if tier == "own" or rid not in tier_of:
            tier_of[rid] = tier
    rows = []
    gate: Counter = Counter()
    seniority: Counter = Counter()
    for rid, p in people.items():
        first, last = years.get(p["openalex"], (None, None))
        gated = int(last is not None and last >= RECENCY_YEAR)
        gate["gated" if gated else ("no_year" if last is None else "failed_recency")] += 1
        if gated:
            seniority[band(first)] += 1
        rows.append((rid, tier_of[rid], find.root(rid), p["country"], p["field"], p["topics"], p["inst"], students[rid],
                     ";".join(sorted(sources[rid])), p["grants"], first, last, p["emeritus"], gated))
    eng.executemany("insert into advisor values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", rows)
    eng.executemany("insert into topic values (?, ?, ?)", store.execute("select id, name, field from topic").fetchall())
    eng.executescript("create index alias_key on alias (key); create index member_cluster on member (cluster); create index advisor_cluster on advisor (cluster);")

    pool_gated = [(r[3], r[4]) for r in rows if r[13]]
    medium_gated = [(c, f) for oa, c, f in medium_people.values() if oa in years and years[oa][1] >= RECENCY_YEAR]
    coverage = {
        "build_id": build_id,
        "recency_year": RECENCY_YEAR,
        "totals": {
            "advisors": sum(tiers.values()), "name_only": tiers["none"], "tiers": dict(tiers), "pool_records": len(aids),
            "pool_people": len(people), "pool": gate["gated"], "failed_recency": gate["failed_recency"], "no_year": gate["no_year"],
            "medium_people": len(medium_people), "medium": len(medium_gated), "barred_source": barred,
        },
        "by_source": {s: dict(c) for s, c in sorted(by_source.items())},
        "seniority": dict(seniority),
        **coverage_tables(pool_gated, medium_gated),
        "tests": {},
    }
    blob = json.dumps(coverage, sort_keys=True, indent=1).encode()
    write_private(home, bdir / "coverage.json", blob)
    meta = {
        "build_id": build_id, "built_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "code_version": __version__,
        "coverage_sha256": hashlib.sha256(blob).hexdigest(), "seconds": f"{time.time() - started:.0f}",
    }
    eng.executemany("insert into meta values (?, ?)", meta.items())
    eng.commit()
    eng.close()
    write_private(home, home / "current", build_id.encode())
    for old in sorted(p for p in (home / "builds").iterdir() if p.is_dir())[:-KEEP_BUILDS]:
        shutil.rmtree(old)
    return coverage


def print_tables(cov: dict, log=print) -> None:
    t = cov["totals"]
    log(f"recorded advisors {t['advisors']}, known by name alone {t['name_only']}")
    log(f"pool records {t['pool_records']}, distinct people {t['pool_people']}, after the recency gate {t['pool']}")
    log(f"failed recency {t['failed_recency']}, no year {t['no_year']}, medium left out {t['medium']} after the gate")
    log("by link source: advisors, in pool, medium left out")
    for s, c in cov["by_source"].items():
        log(f"  {s}: {c.get('advisors', 0)}, {c.get('pool', 0)}, {c.get('medium', 0)}")
    for kind, top in (("country", 20), ("field", 26)):
        log(f"by {kind}: in pool, medium left out")
        for name, c in sorted(cov[kind].items(), key=lambda kv: -kv[1]["pool"])[:top]:
            log(f"  {name or 'unknown'}: {c['pool']}, {c['medium']}")
    log("by first affiliation year")
    for _, label in SENIORITY:
        log(f"  {label}: {cov['seniority'].get(label, 0)}")
