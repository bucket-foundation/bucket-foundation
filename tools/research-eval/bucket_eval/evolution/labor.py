from __future__ import annotations

import hashlib
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Callable

import pyarrow as pa
import pyarrow.csv as pacsv
import pyarrow.parquet as pq

from ..datasets.common import GB, digest
from .store import EVOLUTION_DATA, MANIFESTS, Manifest, Opener, Source, Table, fetch, load_manifest, open_url, relative, save_manifest, source_dir, today

ONET = Source(
    name="onet",
    revision="28.2",
    url="https://www.onetcenter.org/dl_files/database/db_28_2_text.zip",
    license_rule="onet-cc-by",
    file="db_28_2_text.zip",
    transient=1 * GB,
    sha256="ed047de0f019ee378e08ccebb156d873918b5c72ba984fb1050d05caa889392b",
    size=13_215_772,
)

ONET_TABLES = {
    "occupations": "db_28_2_text/Occupation Data.txt",
    "tasks": "db_28_2_text/Task Statements.txt",
    "technology_skills": "db_28_2_text/Technology Skills.txt",
    "tasks_to_dwas": "db_28_2_text/Tasks to DWAs.txt",
    "dwa_reference": "db_28_2_text/DWA Reference.txt",
    "iwa_reference": "db_28_2_text/IWA Reference.txt",
}

ONET_ROWS = {
    "occupations": 1_016,
    "tasks": 19_281,
    "technology_skills": 32_435,
    "tasks_to_dwas": 23_703,
    "dwa_reference": 2_087,
    "iwa_reference": 332,
}

ELOUNDOU_COMMIT = "0471612fef3cc22b74fb884d27bff9dbd3770582"
ELOUNDOU_BASE = f"https://raw.githubusercontent.com/openai/GPTs-are-GPTs/{ELOUNDOU_COMMIT}/data"

ELOUNDOU = {
    "task_labels": Source(
        name="eloundou",
        revision=ELOUNDOU_COMMIT[:12],
        url=f"{ELOUNDOU_BASE}/full_labelset.tsv",
        license_rule="eloundou-mit",
        file="full_labelset.tsv",
        transient=1 * GB,
        sha256="094378905e1f3349e50a9a83dc69643a2ef227954d611c8316a46da08cb3d8de",
        size=3_893_248,
    ),
    "occupation_scores": Source(
        name="eloundou",
        revision=ELOUNDOU_COMMIT[:12],
        url=f"{ELOUNDOU_BASE}/occ_level.csv",
        license_rule="eloundou-mit",
        file="occ_level.csv",
        transient=1 * GB,
        sha256="40c74f53de40aec91c0017d80690cbba915f83a8bb414bcf2f884692f1749acb",
        size=126_022,
    ),
}

ELOUNDOU_ROWS = {"task_labels": 19_265, "occupation_scores": 923}
ELOUNDOU_DELIMITER = {"task_labels": "\t", "occupation_scores": ","}

GATED = {
    "isco08": "ILO ISCO-08 reuse terms are unconfirmed",
    "hisco": "HISCO reuse terms are unconfirmed",
}

class GatedSourceError(RuntimeError):
    pass

class CountError(RuntimeError):
    pass

@dataclass(frozen=True)
class Result:
    manifest: Manifest
    written: dict[str, bool]

def _table(path: Path, rows: int, data: Path) -> Table:
    return Table(rows=rows, path=relative(path, data), sha256=digest(path, "sha256"))

def _check(name: str, got: dict[str, int], want: dict[str, int]) -> None:
    wrong = {k: (got.get(k), v) for k, v in want.items() if got.get(k) != v}
    if wrong:
        raise CountError(f"{name}: " + ", ".join(f"{k} has {g} rows, expected {w}" for k, (g, w) in wrong.items()))

def _parquet_rows(path: Path) -> int:
    return pq.ParquetFile(path).metadata.num_rows

def header_names(line: bytes, delimiter: str) -> list[str]:
    raw = [n.strip().strip('"') for n in line.decode("utf-8-sig").rstrip("\r\n").split(delimiter)]
    return [n or f"column_{i}" for i, n in enumerate(raw)]

def convert_member(body: BinaryIO, out: Path, delimiter: str, quoted: bool) -> int:
    names = header_names(body.readline(), delimiter)
    reader = pacsv.open_csv(
        body,
        read_options=pacsv.ReadOptions(column_names=names, block_size=1 << 22),
        parse_options=pacsv.ParseOptions(delimiter=delimiter, quote_char='"' if quoted else False, newlines_in_values=quoted),
        convert_options=pacsv.ConvertOptions(column_types={n: pa.string() for n in names}, strings_can_be_null=False),
    )
    schema = pa.schema([pa.field(n, pa.string()) for n in names])
    out.parent.mkdir(parents=True, exist_ok=True)
    partial = out.with_name(out.name + ".part")
    rows = 0
    with pq.ParquetWriter(partial, schema, compression="zstd") as writer:
        for batch in reader:
            writer.write_batch(batch)
            rows += batch.num_rows
    partial.rename(out)
    return rows

def pull_onet(data: Path = EVOLUTION_DATA, manifests: Path = MANIFESTS, opener: Opener = open_url, *, source: Source = ONET, tables: dict[str, str] = ONET_TABLES, rows: dict[str, int] = ONET_ROWS, need: int | None = None) -> Result:
    bronze, sha, size = fetch(source, data, opener, need=need)
    out_dir = source_dir(source, data) / "parquet"
    counts: dict[str, int] = {}
    written: dict[str, bool] = {}
    with zipfile.ZipFile(bronze) as z:
        for name, member in tables.items():
            out = out_dir / f"{name}.parquet"
            if out.exists():
                counts[name] = _parquet_rows(out)
                written[name] = False
                continue
            with z.open(member) as body:
                counts[name] = convert_member(body, out, "\t", quoted=False)
            written[name] = True
    _check(source.name, counts, rows)
    return _finish(source, sha, size, {n: out_dir / f"{n}.parquet" for n in tables}, counts, written, data, manifests)

def pull_eloundou(data: Path = EVOLUTION_DATA, manifests: Path = MANIFESTS, opener: Opener = open_url, *, sources: dict[str, Source] = ELOUNDOU, rows: dict[str, int] = ELOUNDOU_ROWS, need: int | None = None) -> Result:
    counts: dict[str, int] = {}
    written: dict[str, bool] = {}
    paths: dict[str, Path] = {}
    checks: list[tuple[str, str, int]] = []
    first = next(iter(sources.values()))
    for name, src in sources.items():
        bronze, sha, size = fetch(src, data, opener, need=need)
        checks.append((src.url, sha, size))
        out = source_dir(src, data) / "parquet" / f"{name}.parquet"
        paths[name] = out
        if out.exists():
            counts[name] = _parquet_rows(out)
            written[name] = False
            continue
        with bronze.open("rb") as body:
            counts[name] = convert_member(body, out, ELOUNDOU_DELIMITER[name], quoted=True)
        written[name] = True
    _check(first.name, counts, rows)
    combined = digest_lines(checks)
    url = f"{ELOUNDOU_BASE}/{{{','.join(s.file for s in sources.values())}}}"
    return _finish(first, combined, sum(c[2] for c in checks), paths, counts, written, data, manifests, url=url)

def digest_lines(checks: list[tuple[str, str, int]]) -> str:
    h = hashlib.sha256()
    for url, sha, size in sorted(checks):
        h.update(f"{url}\t{sha}\t{size}\n".encode())
    return h.hexdigest()

def _finish(source: Source, sha: str, size: int, paths: dict[str, Path], counts: dict[str, int], written: dict[str, bool], data: Path, manifests: Path, url: str | None = None) -> Result:
    held = load_manifest(source.name, manifests)
    fetched = held.fetched if held and held.revision == source.revision and held.sha256 == sha else today()
    m = Manifest(
        source=source.name,
        revision=source.revision,
        license_rule=source.license_rule,
        url=url or source.url,
        sha256=sha,
        bytes=size,
        fetched=fetched,
        tables={n: _table(p, counts[n], data) for n, p in paths.items()},
    )
    save_manifest(m, manifests)
    return Result(manifest=m, written=written)

def pull_gated(name: str) -> None:
    reason = GATED.get(name)
    if reason is None:
        raise KeyError(name)
    raise GatedSourceError(f"{name} loads nothing: {reason}; a founder-confirmed rights rule opens it")

PULLS: dict[str, Callable[..., Result]] = {"onet": pull_onet, "eloundou": pull_eloundou}
