from __future__ import annotations

import json
import os
import resource
import shutil
import time
from dataclasses import dataclass
from pathlib import Path

from .chunking import CHUNK_OVERLAP, CHUNK_TOKENS, chunk_spans
from .normalize import NORMALIZATION, byte_slice, normalize_text, sha256_hex
from .registry import runtime_versions

SCHEMA_VERSION = 1

class ArtifactError(RuntimeError):
    pass

def _read_corpus(corpus_dir: Path) -> tuple[dict, list[dict]]:
    manifest = json.loads((corpus_dir / "manifest.json").read_text(encoding="utf-8"))
    raw = (corpus_dir / "sources.jsonl").read_bytes()
    if sha256_hex(raw) != manifest["files"]["sources.jsonl"]["sha256"]:
        raise ArtifactError("sources.jsonl does not match the corpus manifest")
    records = [json.loads(line) for line in raw.decode("utf-8").splitlines() if line]
    for r in records:
        if normalize_text(r["text"]) != r["text"] or sha256_hex(r["text"]) != r["bodyHash"]:
            raise ArtifactError(f"{r['slug']}: text is not the normalized body its bodyHash names")
    return manifest, records

def peak_rss_mib() -> float:
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0

def build_vectors(corpus_dir: Path, out_root: Path, encoder, batch_size: int = 16) -> Path:
    import numpy as np

    started = time.time()
    corpus_manifest, records = _read_corpus(corpus_dir)
    revision = corpus_manifest["corpusRevision"]
    final = out_root / revision / encoder.model_id
    if (final / "manifest.json").is_file():
        return final

    rows: list[dict] = []
    texts: list[str] = []
    for r in records:
        for c in chunk_spans(r["text"], encoder.tokenizer, CHUNK_TOKENS, CHUNK_OVERLAP):
            texts.append(byte_slice(r["text"], c.start, c.end))
            rows.append({"sourceId": r["sourceId"], "sourceRevision": r["sourceRevision"], "start": c.start, "end": c.end})
    matrix = encoder.encode(texts, batch_size=batch_size) if texts else np.zeros((0, encoder.dimension), dtype="<f4")

    tmp = out_root / revision / f".tmp-{encoder.model_id}-{os.getpid()}"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    matrix_bytes = np.ascontiguousarray(matrix, dtype="<f4").tobytes()
    (tmp / "matrix.f32").write_bytes(matrix_bytes)
    chunks_text = "".join(json.dumps(row, sort_keys=True, separators=(",", ":")) + "\n" for row in rows)
    (tmp / "chunks.jsonl").write_text(chunks_text, encoding="utf-8")
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "corpusRevision": revision,
        "sourcesSha256": corpus_manifest["files"]["sources.jsonl"]["sha256"],
        "normalization": NORMALIZATION,
        "model": {
            "id": encoder.model_id,
            "repo": encoder.entry["repo"],
            "revision": encoder.entry["revision"],
            "dimension": encoder.dimension,
            "metric": encoder.entry["metric"],
            "tokenizerSha256": encoder.entry["files"]["tokenizer.json"],
        },
        "chunking": {"tokens": CHUNK_TOKENS, "overlap": CHUNK_OVERLAP},
        "rows": len(rows),
        "sources": len(records),
        "files": {"matrix.f32": sha256_hex(matrix_bytes), "chunks.jsonl": sha256_hex(chunks_text)},
        "runtime": runtime_versions(["numpy", "sentence-transformers", "tokenizers", "torch", "transformers"]),
        "device": encoder.device,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "seconds": round(time.time() - started, 2),
        "peakRssMiB": round(peak_rss_mib(), 1),
    }
    (tmp / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    VectorIndex.load(tmp)
    os.replace(tmp, final)
    return final

@dataclass
class VectorIndex:
    corpus_revision: str
    model_revision: str
    model_id: str
    dimension: int
    matrix: object
    chunks: list[tuple[str, str]]
    rows_by_source: dict[tuple[str, str], list[int]]

    @staticmethod
    def load(directory: Path) -> "VectorIndex":
        import numpy as np

        manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
        if manifest.get("schemaVersion") != SCHEMA_VERSION:
            raise ArtifactError(f"vector manifest schema {manifest.get('schemaVersion')} is not {SCHEMA_VERSION}")
        raw = (directory / "matrix.f32").read_bytes()
        if sha256_hex(raw) != manifest["files"]["matrix.f32"]:
            raise ArtifactError("matrix.f32 does not match its manifest")
        chunks_text = (directory / "chunks.jsonl").read_text(encoding="utf-8")
        if sha256_hex(chunks_text) != manifest["files"]["chunks.jsonl"]:
            raise ArtifactError("chunks.jsonl does not match its manifest")
        dim = int(manifest["model"]["dimension"])
        rows = int(manifest["rows"])
        matrix = np.frombuffer(raw, dtype="<f4")
        if matrix.size != rows * dim:
            raise ArtifactError(f"matrix.f32 holds {matrix.size} floats, the manifest says {rows} x {dim}")
        matrix = matrix.reshape(rows, dim)
        if rows and not np.isfinite(matrix).all():
            raise ArtifactError("matrix.f32 holds a value that is not finite")
        chunks: list[tuple[str, str]] = []
        by_source: dict[tuple[str, str], list[int]] = {}
        for i, line in enumerate(chunks_text.splitlines()):
            row = json.loads(line)
            key = (row["sourceId"], row["sourceRevision"])
            chunks.append(key)
            by_source.setdefault(key, []).append(i)
        if len(chunks) != rows:
            raise ArtifactError(f"chunks.jsonl has {len(chunks)} lines, the manifest says {rows}")
        return VectorIndex(manifest["corpusRevision"], manifest["model"]["revision"], manifest["model"]["id"], dim, matrix, chunks, by_source)
