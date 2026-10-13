from __future__ import annotations

import shutil
import sqlite3
import sys
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from advisor_engine import build as build_mod  # noqa: E402
from advisor_engine.paths import ACK_FILE, ACK_LINES, norm_name  # noqa: E402

GIVEN = ["Avel", "Brisa", "Corin", "Dessa", "Eldan", "Fira", "Galen", "Hesta", "Ivor", "Junia", "Kell", "Lorna", "Mavis", "Nolan", "Orla", "Pryce"]
FAMILY = ["Quillfeather", "Rookwood", "Stonebarrow", "Thistledown", "Umberfield", "Vandermoor", "Wexcombe", "Yarrowby", "Zephyrine", "Ashgrove",
          "Briarwick", "Coldharbour", "Dunmarrow", "Elmhollow", "Fenwhistle", "Gorsebank", "Hollowmere", "Inkwater", "Jesterfield", "Kestrelby"]
TOPICS = {
    "T1": ("Tidal Lattice Dynamics", "Field One"), "T2": ("Granular Flow Acoustics", "Field One"),
    "T3": ("Cavity Resonance Imaging", "Field One"), "T4": ("Membrane Folding Kinetics", "Field One"),
    "T5": ("Harbour Trade Ledgers", "Field Two"), "T6": ("Dialect Contact Zones", "Field Two"),
    "T7": ("Parish Record Linkage", "Field Two"), "T8": ("Monastic Supply Networks", "Field Two"),
}


class World:
    def __init__(self, root: Path):
        self.root = root
        self.store_path = root / "store" / "contacts.sqlite"
        self.wide = root / "wide"
        self.home = root / "engine"
        self.ids: dict[str, int] = {}
        self.names: dict[int, str] = {}

    def store(self) -> sqlite3.Connection:
        return sqlite3.connect(self.store_path)

    def ro(self) -> sqlite3.Connection:
        return sqlite3.connect(f"file:{self.store_path}?mode=ro", uri=True, isolation_level=None)


class Maker:
    def __init__(self, con: sqlite3.Connection, world: World):
        self.con = con
        self.world = world
        self.n = 0
        self.years: dict[str, list[int]] = {}

    def person(self, tag: str | None = None, openalex: bool = True, country="XA", field="Field One", topics="T1;T2", last=2022, first=2001,
               position=None, orcid=None, first_source="openalex", name=None, inst=None) -> int:
        self.n += 1
        i = self.n
        name = name or f"{GIVEN[i % len(GIVEN)]} {FAMILY[(i // len(GIVEN)) % len(FAMILY)]} {i}"
        oa = f"A{999900000000 + i}" if openalex else None
        self.con.execute(
            "insert into person (id, name, name_norm, openalex_id, orcid, institution, institution_ror, country, position, field, topics, grant_count, first_source) "
            "values (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (i, name, norm_name(name), oa, orcid, inst or f"Example Institute {i % 40}", None, country, position, field if openalex else None,
             topics if openalex else None, i % 3, first_source),
        )
        if oa and last is not None:
            self.years[oa] = [first, last]
        if tag:
            self.world.ids[tag] = i
        self.world.names[i] = name
        return i

    def advisor(self, **kw) -> int:
        pid = self.person(**kw)
        self.link(pid)
        return pid

    def link(self, advisor_id: int, source="academic_family_tree") -> None:
        student = self.person(openalex=False, name=f"Student Of {advisor_id} {self.n}")
        self.con.execute("insert into advisor_link (advisor_id, student_id, year, source) values (?,?,?,?)", (advisor_id, student, 2015, source))

    def matched(self, confidence: str, tag: str | None = None, **kw) -> tuple[int, int]:
        target = self.person(tag=f"{tag}_target" if tag else None, **kw)
        aid = self.person(tag=tag, openalex=False, country=kw.get("country", "XA"))
        self.link(aid, source="theses_fr")
        method = "name_institution_unique" if confidence == "high" else "name_country_unique"
        self.con.execute("insert into person_match values (?,?,?,?,?,?,?)", (aid, target, method, "2026-01-01", confidence, 1, 1))
        return aid, target

    def contact(self, pid: int, value: str, how: str, url="https://directory.example.org/people", date="2026-05-01") -> None:
        self.con.execute(
            "insert into contact (person_id, kind, value, value_norm, source, source_url, date_seen, how_obtained) values (?, 'email', ?, ?, ?, ?, ?, ?)",
            (pid, value, value.lower(), "synthetic", url, date, how),
        )


def acknowledge(home: Path) -> None:
    (home / ACK_FILE).write_text("\n".join(ACK_LINES) + "\n")


def make_world(root: Path) -> World:
    w = World(root)
    w.store_path.parent.mkdir(parents=True)
    con = sqlite3.connect(w.store_path)
    con.executescript((Path(__file__).parent / "store_schema.sql").read_text())
    con.executemany("insert into topic values (?,?,?)", [(t, n, f) for t, (n, f) in TOPICS.items()])
    m = Maker(con, w)
    for i in range(120):
        one = i < 60
        m.advisor(country="XA", field="Field One" if one else "Field Two", topics=("T1;T2;T3", "T2;T4", "T3")[i % 3] if one else ("T5;T6", "T7;T8")[i % 2])
    for i in range(60):
        m.advisor(country="XB", topics=("T1;T4", "T2;T3")[i % 2])
    for i in range(90):
        m.matched("medium", country="XB", topics="T1;T2")
    for i in range(12):
        m.advisor(country="XC", topics="T1;T3")
    m.matched("high", tag="high", topics="T1;T2;T3", inst="Lighthouse College")
    m.matched("medium", tag="medium", topics="T1;T2;T3", inst="Lighthouse College")
    m.matched("low", tag="low", topics="T1;T2;T3", inst="Lighthouse College")
    aid = m.person(tag="nameonly", openalex=False)
    m.link(aid)
    m.advisor(tag="old", last=2010, first=1980, topics="T1;T2;T3")
    m.advisor(tag="noyear", last=None, topics="T1;T2;T3")
    m.advisor(tag="emeritus", position="Professor Emeritus", topics="T1;T2;T3")
    m.advisor(tag="barred", first_source="csrankings", topics="T1;T2;T3")
    m.advisor(tag="twin", orcid="0000-0000-0000-0011", topics="T1;T2;T3")
    m.person(tag="twin_other", orcid="0000-0000-0000-0011", topics="T5")
    merged = m.advisor(tag="merged", topics="T1;T2;T3")
    con.execute("insert into person_merge values ('openalex:A999999999999', ?, 'same_orcid')", (merged,))
    mailed = m.advisor(tag="mailed", topics="T1;T2;T3")
    m.contact(mailed, "mailed.person@example.org", "official_directory_page")
    xid = m.advisor(tag="xid", topics="T1;T2;T3")
    con.execute("insert into person_xid values ('email', 'xid.person@example.org', ?)", (xid,))
    m.advisor(tag="named", name="Wilhelmina Oddfellow-Kite", topics="T1;T2;T3")
    r1 = m.advisor(tag="reveal_high", topics="T1;T2;T3")
    m.contact(r1, "older.address@example.org", "orcid_public_record", date="2025-01-01")
    m.contact(r1, "newer.address@example.org", "official_directory_page", date="2026-06-01")
    m.contact(r1, "guess.address@example.org", "pubmed_affiliation_name_institution", date="2026-09-01")
    r2 = m.advisor(tag="reveal_medium", topics="T1;T2;T3")
    m.contact(r2, "medium.only@example.org", "europepmc_name_institution")
    r3 = m.advisor(tag="reveal_unsourced", topics="T1;T2;T3")
    m.contact(r3, "tracker.only@example.org", "founder_tracker_no_public_source", url="")
    m.contact(w.ids["high"], "high.aid@example.org", "official_directory_page")
    m.contact(w.ids["medium_target"], "medium.target@example.org", "orcid_public_record")
    con.commit()
    con.close()
    w.wide.mkdir()
    (w.wide / "country=XA").mkdir()
    ids = sorted(m.years)
    table = pa.table({
        "id": pa.array(ids, pa.string()),
        "affiliations": pa.array([[{"ror": "https://ror.example/0", "years": m.years[i]}] for i in ids],
                                 pa.list_(pa.struct([("ror", pa.string()), ("years", pa.list_(pa.int32()))]))),
    })
    pq.write_table(table, w.wide / "country=XA" / "part-0.parquet")
    w.home.mkdir(mode=0o700)
    acknowledge(w.home)
    ro = w.ro()
    build_mod.build(ro, w.home, w.wide, log=lambda _: None)
    ro.close()
    return w


@pytest.fixture(scope="session")
def template(tmp_path_factory) -> World:
    return make_world(tmp_path_factory.mktemp("template"))


@pytest.fixture
def world(template: World, tmp_path: Path, monkeypatch) -> World:
    root = tmp_path / "world"
    shutil.copytree(template.root, root)
    w = World(root)
    w.ids, w.names = template.ids, template.names
    monkeypatch.setenv("ADVISOR_ENGINE_HOME", str(w.home))
    monkeypatch.setenv("BKT_CONTACT_STORE", str(w.store_path))
    monkeypatch.setenv("BKT_AUTHORS_WIDE", str(w.wide))
    monkeypatch.setenv("ADVISOR_ENGINE_MIN_FREE_GB", "0")
    return w
