import hashlib
import json
import sys
from pathlib import Path

import pyarrow.parquet as pq

CONTRACT = {
    "occupations": ("onet", ["onetsoc_code", "title"]),
    "tasks": ("onet", ["task_id", "onetsoc_code", "task"]),
    "tech_skills": ("onet", ["onetsoc_code", "example", "commodity_code"]),
    "eloundou": ("eloundou", ["task_id", "onetsoc_code", "gpt4_exposure"]),
    "oews": ("bls-oews", ["soc_code", "year", "tot_emp"]),
}


def main(parquet_dir: str, release: str, eloundou_year: int, repo_root: str) -> None:
    root = Path(repo_root)
    files = {}
    for table, (source, columns) in CONTRACT.items():
        src = Path(parquet_dir) / f"{table}.parquet"
        if not src.exists():
            continue
        data = pq.read_table(src, columns=columns).to_pylist()
        rel = f"_intake/evolution/{source}/{release}/{table}.jsonl"
        out = root / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        body = "".join(json.dumps({c: row[c] for c in columns}, ensure_ascii=False, separators=(",", ":")) + "\n" for row in data)
        out.write_text(body, encoding="utf-8")
        files[table] = {"path": rel, "rows": len(data), "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest()}
    manifest = {"contract": "evolution-labor/1", "onet_release": release, "eloundou_year": eloundou_year, "files": files}
    target = root / f"_intake/evolution/onet/{release}/labor-manifest.json"
    target.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    print(json.dumps({t: f["rows"] for t, f in files.items()}))


if __name__ == "__main__":
    if len(sys.argv) != 5:
        sys.exit("usage: labor-parquet-to-jsonl.py <parquet-dir> <onet-release> <eloundou-year> <repo-root>")
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4])
