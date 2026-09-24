import hashlib
import json
import sys
from pathlib import Path

import pyarrow.parquet as pq

TABLES = {
    "occupations": ("onet", "occupations", {"O*NET-SOC Code": ("onetsoc_code", str), "Title": ("title", str)}),
    "tasks": ("onet", "tasks", {"Task ID": ("task_id", int), "O*NET-SOC Code": ("onetsoc_code", str), "Task": ("task", str)}),
    "tech_skills": ("onet", "technology_skills", {"O*NET-SOC Code": ("onetsoc_code", str), "Example": ("example", str), "Commodity Code": ("commodity_code", int)}),
    "eloundou": ("eloundou", "task_labels", {"Task ID": ("task_id", int), "O*NET-SOC Code": ("onetsoc_code", str), "gpt4_exposure": ("gpt4_exposure", str)}),
}

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()

def cast(value: str, kind: type):
    return int(float(value)) if kind is int else value

def main(data_dir: str, manifest_dir: str, repo_root: str, eloundou_year: int) -> None:
    data = Path(data_dir)
    root = Path(repo_root)
    manifests = {name: json.loads((Path(manifest_dir) / f"{name}.json").read_text()) for name in ("onet", "eloundou")}
    files = {}
    for table, (source, upstream_table, columns) in TABLES.items():
        m = manifests[source]
        entry = m["tables"][upstream_table]
        parquet = data / entry["path"]
        got = sha256(parquet)
        if got != entry["sha256"]:
            sys.exit(f"{source}.{upstream_table}: sha256 {got}, the manifest pins {entry['sha256']}")
        rows = pq.read_table(parquet, columns=list(columns)).to_pylist()
        if len(rows) != entry["rows"]:
            sys.exit(f"{source}.{upstream_table}: {len(rows)} rows, the manifest pins {entry['rows']}")
        body = "".join(json.dumps({name: cast(r[col], kind) for col, (name, kind) in columns.items()}, ensure_ascii=False, separators=(",", ":")) + "\n" for r in rows)
        rel = f"_intake/evolution/{source}/{m['revision']}/jsonl/{table}.jsonl"
        out = root / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(body, encoding="utf-8")
        files[table] = {
            "path": rel,
            "rows": len(rows),
            "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
            "upstream": {
                "source": source,
                "revision": m["revision"],
                "license_rule": m["license_rule"],
                "url": m["url"],
                "manifest_sha256": m["sha256"],
                "table": upstream_table,
                "table_sha256": entry["sha256"],
                "rows": entry["rows"],
            },
        }
    release = manifests["onet"]["revision"]
    manifest = {"contract": "evolution-labor/1", "onet_release": release, "eloundou_year": eloundou_year, "files": files}
    target = root / f"_intake/evolution/onet/{release}/labor-manifest.json"
    target.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    print(json.dumps({t: f["rows"] for t, f in files.items()}))

if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit("usage: labor-parquet-to-jsonl.py <evolution-data-dir> <manifests-dir> <repo-root> <eloundou-year>")
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]))
