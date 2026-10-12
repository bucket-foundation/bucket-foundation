from __future__ import annotations

import sqlite3
from collections import Counter
from dataclasses import dataclass
from dataclasses import field as listed
from pathlib import Path

from . import coverage
from .identity import suppressed_clusters
from .paths import EngineError, chunks, engine_key, marks, norm_name
from .rank import Advisor, Index, Scored, order
from .scan import assert_clean

MAX_ROWS = 300
MIX_ROWS = 100
HEADINGS = {"withheld": "Order withheld", "untested": "Untested order", "tested": "Tested ranking"}
UNKNOWNS = [
    "Whether this person takes students this year.",
    "Whether they have funding.",
    "Whether student and advisor suit each other in temperament.",
    "Whether a recorded link was a good experience.",
    "Whether the name was matched to the right author.",
]
IDENTITY = {"own": "the record carries its own OpenAlex id", "high": "high-confidence match on name and institution"}
SOURCE_NAMES = {"academic_family_tree": "Academic Family Tree", "theses_fr": "theses.fr", "wikidata": "Wikidata"}
ATTRIBUTION = "Sources: Academic Family Tree, theses.fr, ORCID, OpenAlex."


@dataclass
class Query:
    field: str | None = None
    topics: list[str] = listed(default_factory=list)
    text: str = ""
    include: list[str] = listed(default_factory=list)
    exclude: list[str] = listed(default_factory=list)
    degree: str = ""
    language: str = ""
    funding: str = ""
    limit: int = 25


@dataclass
class Result:
    mode: str
    summary: str
    warnings: list[str]
    lines: list[str]
    rows: list[dict]
    candidates: int
    build_id: str


def load_index(eng: sqlite3.Connection) -> Index:
    topics, subfields, bodies = {}, {}, {}
    for t, name, fld, sub, body in eng.execute("select id, name, field, subfield, body from topic"):
        topics[t] = (name or t, fld or "")
        if sub:
            subfields[t] = sub
        if body:
            bodies[t] = body
    advisors = [
        Advisor(rid, tier, cluster, country, fld, tuple(t for t in (tp or "").split(";") if t), inst, students,
                tuple(s for s in (sources or "").split(";") if s), grants, first, last)
        for rid, tier, cluster, country, fld, tp, inst, students, sources, grants, first, last in eng.execute(
            "select rid, tier, cluster, country, field, topics, inst, students, sources, grant_count, first_year, last_year "
            "from advisor where gated = 1 and emeritus = 0 and tier in ('own', 'high')"
        )
    ]
    return Index(topics, advisors, subfields, bodies)


def display(store: sqlite3.Connection, rids: list[int]) -> dict[int, tuple]:
    out = {}
    for part in chunks(rids):
        for pid, name, inst, country, oa in store.execute(
            f"select id, name, institution, country, openalex_id from person where id in ({marks(len(part))})", part
        ):
            out[pid] = (name, inst, country, oa)
    return out


def reasons(index: Index, s: Scored) -> list[str]:
    out = [f"Shares the topic {index.topics[t][0]}." for t in s.shared_topics]
    out += [f"Works in the subfield {f}." for f in s.shared_subfields]
    out += [f"Works in {f}." for f in s.shared_fields if not s.shared_topics and not s.shared_subfields]
    if not out:
        out.append("Shares no topic with the query and passed the field and country filters.")
    return out


def lineage(a: Advisor) -> list[str]:
    out = []
    if a.students:
        names = ", ".join(SOURCE_NAMES.get(s, "a university thesis repository") for s in a.sources)
        out.append(f"{a.students} recorded students or trainees, from {names}.")
    if a.last_year:
        out.append(f"Last recorded affiliation year {a.last_year}.")
    if a.grant_count:
        out.append(f"{a.grant_count} recorded grants.")
    return out


def run(q: Query, store: sqlite3.Connection, eng: sqlite3.Connection, home: Path, build: Path) -> Result:
    suppressed = suppressed_clusters(store, eng, home, engine_key(home))
    cov = coverage.load(build, home)
    index = load_index(eng)
    if q.field and q.field not in index.fields:
        raise EngineError("unknown field, choose one of: " + "; ".join(index.fields))
    include = [c.upper() for c in q.include]
    exclude = {c.upper() for c in q.exclude}
    cands = [
        a for a in index.advisors
        if a.cluster not in suppressed
        and (not q.field or a.field == q.field)
        and (not include or a.country in include)
        and a.country not in exclude
    ]
    wanted: list[str] = []
    for t in q.topics:
        wanted += index.resolve_topic(t)
    if q.text:
        wanted += index.text_topics(q.text)
    wanted = list(dict.fromkeys(wanted))
    scored = [index.score(wanted, a) for a in cands]
    mode = coverage.mode_for(cov, len(cands), include, q.field)
    limit = max(1, min(q.limit, MAX_ROWS))
    ordered = order(scored, cov["build_id"]) if mode != "withheld" else scored
    shown = ordered[:limit] if mode != "withheld" else ordered
    people = display(store, [s.advisor.rid for s in shown])
    shown = [s for s in shown if s.advisor.rid in people]
    if mode == "withheld":
        shown.sort(key=lambda s: norm_name(people[s.advisor.rid][0]))
    st = coverage.statement(
        cov, len(cands), include, q.field, Counter(a.country for a in cands), Counter(s.advisor.country for s in ordered[:MIX_ROWS])
    )
    lines = []
    if wanted:
        lines.append("Query topics: " + "; ".join(index.topics[t][0] for t in wanted) + ".")
    else:
        lines.append("No topic in the store matched the query, so the rows carry no topical order.")
    unverified = [f"{k} {v}" for k, v in (("degree", q.degree), ("language", q.language), ("funding", q.funding)) if v]
    if unverified:
        lines.append("Constraints the store cannot check: " + "; ".join(unverified) + ".")
    rows = []
    for pos, s in enumerate(shown, 1):
        a = s.advisor
        name, inst, country, oa = people[a.rid]
        tested = mode == "tested"
        rows.append({
            "handle": f"a{a.rid}", "position": pos, "name": name, "institution": inst or "", "country": country or "", "field": a.field or "",
            "order_status": mode, "score": round(s.score, 4) if tested else 0.0,
            "percentile": round(100.0 * (1 - (pos - 1) / len(cands)), 1) if tested else None,
            "identity": IDENTITY[a.tier], "research_areas": [index.topics[t][0] for t in a.topics if t in index.topics],
            "shared_terms": [index.topics[t][0] for t in s.shared_topics], "reasons": reasons(index, s), "lineage": lineage(a),
            "unknowns": UNKNOWNS, "profile_url": f"https://openalex.org/{oa}" if oa else "",
        })
    return Result(mode, st.summary, st.warnings, lines, rows, len(cands), cov["build_id"])


def render(r: Result) -> str:
    out = [HEADINGS[r.mode], "", r.summary, *r.warnings, "", *r.lines, ""]
    for row in r.rows:
        lead = f"{row['position']}." if r.mode == "tested" else "-"
        where = ", ".join(x for x in (row["institution"], row["country"]) if x)
        out.append(f"{lead} {row['name']}, {where} [{row['handle']}]")
        if r.mode == "tested":
            out.append(f"    Percentile {row['percentile']}.")
        if row["field"]:
            out.append(f"    Field: {row['field']}. Topics: {'; '.join(row['research_areas']) or 'none on record'}.")
        for line in row["reasons"] + row["lineage"]:
            out.append(f"    {line}")
        out.append(f"    Identity: {row['identity']}.")
        if row["profile_url"]:
            out.append(f"    {row['profile_url']}")
    out += ["", "Unknown for every row:", *[f"  {u}" for u in UNKNOWNS], "", ATTRIBUTION]
    return assert_clean("\n".join(out))
