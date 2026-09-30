from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from . import reference
from .advisors import opaque_id
from .clean import scrub, strip_boilerplate
from .corpora import CorpusSpec, Doc, load as load_corpus

SCHEMA = "bucket.explore-space/1"
ERA_BOUND = 1_000_000
ERAS = [
    ("before 1900", -ERA_BOUND, 1899),
    ("1900 to 1949", 1900, 1949),
    ("1950 to 1979", 1950, 1979),
    ("1980 to 1999", 1980, 1999),
    ("2000 to 2019", 2000, 2019),
    ("2020 on", 2020, ERA_BOUND),
]
ADVISORS_LICENSE = "OpenAlex metadata (CC0) and public institution pages"
CANON_LICENSE = "Bucket Foundation canon index"
ADVISOR_FIELDS = ("name", "institution", "field", "country", "topics", "links")
PUBLIC_LINK_KEYS = ("openalex", "institution", "profile_url")


def space_components(basis_file: dict) -> list[dict]:
    return [
        {k: c[k] for k in ("index", "angle_deg", "variance_ratio", "label", "top_terms", "bottom_terms")}
        for c in basis_file["components"]
    ]


def space_dict(space_id: str, label: str, basis_file: dict, obs: list[dict], sweep: bool = True, fields: list[dict] | None = None, license: str = "") -> dict:
    k = len(basis_file["components"])
    mean = np.mean([o["scores"] for o in obs], axis=0).tolist() if obs else [0.0] * k
    out = {
        "schema": SCHEMA,
        "id": space_id,
        "label": label,
        "basis": "reference",
        "scale": "standardized",
        "fields": fields or [{"key": "text", "kind": "tokens"}],
        "components": space_components(basis_file),
        "mean": [round(float(v), 4) for v in mean],
        "obs": obs,
    }
    if license:
        out["license"] = license
    if sweep:
        out["sweep"] = {"field": "year", "bins": [{"label": a, "from": b, "to": c} for a, b, c in ERAS]}
    return out


def project_obs(basis_file: dict, rows: list[dict]) -> list[dict]:
    if not rows:
        return []
    scores = reference.project_texts(basis_file, [r["text"] for r in rows])
    out = []
    for r, s in zip(rows, scores):
        out.append({
            "id": r["id"],
            "title": r["title"],
            "scores": [round(float(v), 3) for v in s],
            "t": r.get("t"),
            "meta": r.get("meta", {}),
            "links": r.get("links", []),
            "coverage": round(reference.coverage_of(basis_file, r["text"]), 3),
        })
    return out


def canon_space(basis_file: dict, items: list[dict]) -> dict:
    rows = [{"id": i["id"], "title": i["title"], "text": i["text"], "t": i.get("year"), "meta": {"kind": i["kind"], "branch": i.get("branch") or ""}} for i in items]
    return space_dict("canon", "canon", basis_file, project_obs(basis_file, rows), license=CANON_LICENSE)


def public_links(links: dict) -> list[str]:
    out = []
    for key in PUBLIC_LINK_KEYS:
        v = (links or {}).get(key)
        if isinstance(v, str) and v.startswith("http") and "@" not in v:
            out.append(v)
    return out


def advisor_rows(profiles: list[dict]) -> list[dict]:
    rows = []
    for p in profiles:
        name = scrub(str(p.get("name") or "")).strip()
        if not name:
            continue
        topics = [scrub(str(t)) for t in (p.get("topics") or []) if isinstance(t, str)]
        field = scrub(str(p.get("field") or ""))
        text = ". ".join(x for x in [field, " ".join(topics)] if x)
        rows.append({
            "id": opaque_id(p.get("openalex_id") or p.get("orcid") or name),
            "title": name,
            "text": text,
            "t": None,
            "meta": {"institution": scrub(str(p.get("institution") or "")), "field": field, "country": str(p.get("country") or "")},
            "links": public_links(p.get("links") or {}),
        })
    return rows


def advisors_space(basis_file: dict, bundle: dict) -> dict:
    rows = advisor_rows(bundle["profiles"])
    return space_dict("advisors", "advisors", basis_file, project_obs(basis_file, rows), sweep=False, fields=[{"key": "topics", "kind": "tokens"}, {"key": "field", "kind": "category"}], license=ADVISORS_LICENSE)


def write_space(data: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return path


MAX_CORPUS_DOCS = 3000
SPACE_DIR_PARTS = (".data", "explore")


def corpus_rows(docs: list[Doc], cap: int = MAX_CORPUS_DOCS) -> list[dict]:
    ordered = sorted(docs, key=lambda d: d.id)
    stride = max(1, -(-len(ordered) // cap))
    rows = []
    for d in ordered[::stride][:cap]:
        rows.append({
            "id": opaque_id(d.id),
            "title": (scrub(d.title or "").strip() or "untitled")[:120],
            "text": scrub(d.text),
            "t": None,
            "meta": {},
            "links": [],
        })
    return rows


def corpus_space(spec: CorpusSpec, basis_file: dict, docs: list[Doc], cap: int = MAX_CORPUS_DOCS) -> dict:
    data = space_dict(spec.name, spec.name, basis_file, project_obs(basis_file, corpus_rows(docs, cap)), sweep=False, license=spec.license)
    return data


def export_corpora(specs: list[CorpusSpec], basis_file: dict, out_dir: Path, cap: int = MAX_CORPUS_DOCS) -> dict[str, str]:
    results: dict[str, str] = {}
    for spec in specs:
        if spec.private:
            results[spec.name] = "skipped: private"
            continue
        if not spec.publish:
            results[spec.name] = "skipped: not marked publish"
            continue
        docs = load_corpus(spec)
        kept, _ = strip_boilerplate(docs, **spec.clean)
        data = corpus_space(spec, basis_file, kept, cap)
        write_space(data, out_dir / f"{spec.name}.space.json")
        results[spec.name] = f"{len(data['obs'])} documents"
    return results
