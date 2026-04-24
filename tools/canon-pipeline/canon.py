#!/usr/bin/env python3
"""Bucket Canon Pipeline — canonical citation resolver.

Usage:
  canon.py resolve <DOI|arxiv:id|pmid:id|query>
  canon.py bib <input.txt>
  canon.py dossier <folder>
  canon.py fetch <DOI>
"""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Optional

# Support running as a script (python3 canon.py) or as a module.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import resolvers, scoring, bibtex, oa_fetch  # type: ignore
else:
    from . import resolvers, scoring, bibtex, oa_fetch  # type: ignore

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None


def _now() -> str:
    return dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _yaml_dump(obj) -> str:
    if yaml is not None:
        return yaml.safe_dump(obj, sort_keys=False, allow_unicode=True, width=100)
    # stdlib fallback
    return _naive_yaml(obj, 0)


def _naive_yaml(obj, indent: int) -> str:
    pad = "  " * indent
    if isinstance(obj, dict):
        if not obj:
            return "{}\n"
        out = []
        for k, v in obj.items():
            if isinstance(v, (dict, list)) and v:
                out.append(f"{pad}{k}:\n{_naive_yaml(v, indent + 1)}")
            else:
                out.append(f"{pad}{k}: {_scalar(v)}")
        return "\n".join(out) + ("\n" if indent == 0 else "")
    if isinstance(obj, list):
        if not obj:
            return f"{pad}[]\n"
        out = []
        for v in obj:
            if isinstance(v, dict):
                inner = _naive_yaml(v, indent + 1).rstrip()
                first, *rest = inner.splitlines() or [""]
                out.append(f"{pad}- {first.strip()}")
                for r in rest:
                    out.append(r)
            else:
                out.append(f"{pad}- {_scalar(v)}")
        return "\n".join(out)
    return f"{pad}{_scalar(obj)}"


def _scalar(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    s = str(v).replace("\n", " ").strip()
    if re.search(r"[:#\[\]{},&*!|>'\"%@`]", s) or s == "":
        return json.dumps(s, ensure_ascii=False)
    return s


def _stable_id(record: dict) -> str:
    basis = record.get("doi") or record.get("canonical_url") or record.get("title") or ""
    return "bkt-" + hashlib.sha1(basis.encode("utf-8")).hexdigest()[:12]


# ---------- resolve pipeline ----------

def resolve(target: str) -> Optional[dict]:
    kind, val = resolvers.classify_input(target)
    sources: list[str] = []
    doi = None
    openalex = None
    crossref = None
    arxiv_rec = None
    biorxiv_rec = None
    pubmed_rec = None

    if kind == "doi":
        doi = val
    elif kind == "pmid":
        pubmed_rec = resolvers.pubmed_by_pmid(val); sources.append("pubmed")
        doi = resolvers.pubmed_doi_for_pmid(val)
    elif kind == "arxiv":
        arxiv_rec = resolvers.arxiv_by_id(val); sources.append("arxiv")
        if arxiv_rec and arxiv_rec.get("doi"):
            doi = arxiv_rec["doi"]
    elif kind == "query":
        openalex = resolvers.openalex_search(val); sources.append("openalex")
        if openalex and openalex.get("doi"):
            doi = resolvers._normalize_doi(openalex["doi"])
        else:
            cr = resolvers.crossref_search(val); sources.append("crossref")
            if cr and cr.get("DOI"):
                doi = cr["DOI"]
                crossref = cr

    if doi:
        if openalex is None:
            openalex = resolvers.openalex_by_doi(doi); sources.append("openalex")
        if crossref is None:
            crossref = resolvers.crossref_by_doi(doi); sources.append("crossref")
        if biorxiv_rec is None and (crossref and "biorxiv" in (crossref.get("publisher") or "").lower()):
            biorxiv_rec = resolvers.biorxiv_by_doi(doi); sources.append("biorxiv")

    if not any([openalex, crossref, arxiv_rec, pubmed_rec]):
        return None

    return _merge(doi, openalex, crossref, pubmed_rec, arxiv_rec, biorxiv_rec, sources)


def _merge(doi, oa, cr, pm, ax, bx, sources) -> dict:
    title = None
    year = None
    authors: list = []
    venue = {}
    citation_count = 0
    concepts = []
    canonical_url = None
    oa_status = {"is_oa": False}
    is_retracted = False
    cr_type = None

    if oa:
        title = title or oa.get("title")
        year = year or oa.get("publication_year")
        for a in oa.get("authorships") or []:
            au = a.get("author") or {}
            name = au.get("display_name") or ""
            fam, giv = _split_name(name)
            authors.append({"family": fam, "given": giv, "orcid": au.get("orcid")})
        host = oa.get("host_venue") or oa.get("primary_location", {}).get("source") or {}
        venue = {
            "name": host.get("display_name") or host.get("publisher"),
            "issn": (host.get("issn") or [None])[0] if isinstance(host.get("issn"), list) else host.get("issn"),
            "publisher": host.get("publisher"),
        }
        citation_count = oa.get("cited_by_count") or 0
        concepts = [c.get("display_name") for c in (oa.get("concepts") or [])[:8]]
        oa_info = oa.get("open_access") or {}
        oa_status = {
            "is_oa": bool(oa_info.get("is_oa")),
            "oa_url": oa_info.get("oa_url"),
            "license": (oa.get("primary_location") or {}).get("license"),
            "repository": (oa.get("primary_location") or {}).get("source", {}).get("host_organization_name") if oa.get("primary_location") else None,
        }
        is_retracted = bool(oa.get("is_retracted"))
        cr_type = oa.get("type_crossref")  # let Crossref fill type; OpenAlex's "article" is too coarse
        doi = doi or resolvers._normalize_doi(oa.get("doi") or "")

    if cr:
        title = title or (cr.get("title") or [None])[0]
        if cr.get("issued", {}).get("date-parts"):
            year = year or cr["issued"]["date-parts"][0][0]
        if not authors:
            for a in cr.get("author") or []:
                authors.append({"family": a.get("family"), "given": a.get("given"), "orcid": a.get("ORCID")})
        if not venue.get("name"):
            venue = {
                "name": (cr.get("container-title") or [None])[0],
                "issn": (cr.get("ISSN") or [None])[0],
                "publisher": cr.get("publisher"),
            }
        cr_type = cr_type or cr.get("type")
        is_retracted = is_retracted or bool(cr.get("is-referenced-by-count") and cr.get("update-to"))
        for u in cr.get("update-to") or []:
            if (u.get("type") or "").lower() == "retraction":
                is_retracted = True
        doi = doi or resolvers._normalize_doi(cr.get("DOI") or "")

    if pm and not title:
        title = pm.get("title")
        year = year or (pm.get("pubdate") or "")[:4]
        for a in pm.get("authors") or []:
            fam, giv = _split_name(a.get("name") or "")
            authors.append({"family": fam, "given": giv})
        venue = venue or {"name": pm.get("fulljournalname") or pm.get("source")}

    if ax and not title:
        title = ax.get("title")
        year = year or (ax.get("published") or "")[:4]
        for n in ax.get("authors") or []:
            fam, giv = _split_name(n)
            authors.append({"family": fam, "given": giv})
        venue = venue or {"name": "arXiv preprint"}
        canonical_url = ax.get("id")

    if doi and not canonical_url:
        canonical_url = f"https://doi.org/{doi}"

    record = {
        "id": None,
        "title": title,
        "authors": authors,
        "year": year,
        "venue": venue,
        "doi": doi,
        "canonical_url": canonical_url,
        "oa_status": oa_status,
        "citation_count": citation_count,
        "concepts": concepts,
        "sources_consulted": sorted(set(sources)),
        "fetched_at": _now(),
        "is_retracted": is_retracted,
        "_crossref_type": cr_type,
    }
    record["id"] = _stable_id(record)
    s, reasons = scoring.score(record)
    record["canon_score"] = s
    record["canon_score_reasons"] = reasons
    record["canon_branch_hints"] = scoring.branch_hints(record)
    # strip private
    record.pop("_crossref_type", None)
    record.pop("is_retracted", None)
    return record


def _split_name(name: str) -> tuple[str, str]:
    name = (name or "").strip()
    if "," in name:
        fam, giv = name.split(",", 1)
        return fam.strip(), giv.strip()
    parts = name.split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[-1], " ".join(parts[:-1])


# ---------- subcommands ----------

def cmd_resolve(args) -> int:
    rec = resolve(args.target)
    if not rec:
        print(f"ERROR: could not resolve: {args.target}", file=sys.stderr)
        return 2
    print(_yaml_dump(rec))
    return 0


def cmd_bib(args) -> int:
    path = Path(args.input)
    lines = [l.strip() for l in path.read_text().splitlines() if l.strip() and not l.startswith("#")]
    records = []
    for line in lines:
        rec = resolve(line)
        if rec:
            records.append(rec)
        else:
            print(f"# skip: {line}", file=sys.stderr)
    stem = path.stem
    bib_path = path.with_name(f"{stem}.bib")
    yaml_path = path.with_name(f"{stem}.yaml")
    bib_path.write_text(bibtex.to_bibfile(records))
    yaml_path.write_text(_yaml_dump({"records": records}))
    print(f"wrote {bib_path} ({len(records)} records)")
    print(f"wrote {yaml_path}")
    return 0


def cmd_dossier(args) -> int:
    folder = Path(args.folder)
    queries = folder / "queries.txt"
    if not queries.exists():
        print(f"ERROR: {queries} not found", file=sys.stderr)
        return 2
    lines = [l.strip() for l in queries.read_text().splitlines() if l.strip() and not l.startswith("#")]
    records = []
    for line in lines:
        rec = resolve(line)
        if rec:
            records.append(rec)
    (folder / "primary-papers.bib").write_text(bibtex.to_bibfile(records))
    (folder / "primary-papers.yaml").write_text(_yaml_dump({"records": records}))
    idx = folder / "CANON_INDEX.md"
    stamp = f"_last updated: {_now()} by canon-pipeline_"
    if idx.exists():
        txt = idx.read_text()
        if "_last updated:" in txt:
            txt = re.sub(r"_last updated:[^\n]*_", stamp, txt)
        else:
            txt = txt.rstrip() + "\n\n" + stamp + "\n"
        idx.write_text(txt)
    print(f"dossier: {len(records)} records written to {folder}")
    return 0


def cmd_fetch(args) -> int:
    doi = resolvers._normalize_doi(args.doi)
    if not doi:
        print("ERROR: not a DOI", file=sys.stderr)
        return 2
    info = oa_fetch.best_oa_url(doi)
    safe = doi.replace("/", "_")
    out_dir = Path.cwd() / "oa-downloads"
    out_dir.mkdir(exist_ok=True)
    if info and info.get("url"):
        pdf_path = out_dir / f"{safe}.pdf"
        ok = oa_fetch.fetch_pdf(info["url"], pdf_path)
        if ok:
            print(f"OA PDF: {pdf_path} (license={info.get('license')}, repo={info.get('repository')})")
            return 0
    note = {
        "doi": doi,
        "canonical_url": f"https://doi.org/{doi}",
        "oa_status": {"is_oa": bool(info), **(info or {})},
        "note": "pipeline does not redistribute paywalled content; see canonical_url",
        "fetched_at": _now(),
    }
    cite_path = out_dir / f"{safe}.citation.yaml"
    cite_path.write_text(_yaml_dump(note))
    print(f"no OA PDF available; wrote citation note: {cite_path}")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="canon.py", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("resolve"); r.add_argument("target"); r.set_defaults(fn=cmd_resolve)
    b = sub.add_parser("bib"); b.add_argument("input"); b.set_defaults(fn=cmd_bib)
    d = sub.add_parser("dossier"); d.add_argument("folder"); d.set_defaults(fn=cmd_dossier)
    f = sub.add_parser("fetch"); f.add_argument("doi"); f.set_defaults(fn=cmd_fetch)
    args = p.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
