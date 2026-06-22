#!/usr/bin/env python3
"""
research-tools — FAIRCheck (REAL rubric, CPU, no GPU, no network)
=================================================================

The first of the two ALL-FIELD horizontal research tools. Where every other
tool in the suite serves a discipline (biophysics, neuro, RNA, chem…),
FAIRCheck + RepliCheck serve EVERY discipline — the ~1.17M researchers in the
research-atlas corpus, regardless of field — because FAIR data management and
statistics reproducibility are funder-mandated across NIH, NSF, Horizon Europe,
Wellcome, and the Gates Foundation (all now require a Data Management & Sharing
Plan, DMSP/DMP, and most require FAIR-aligned deposition).

FAIRCheck assesses a dataset / metadata record for FAIR compliance:
    F — Findable     (persistent identifier, rich metadata, indexed/searchable)
    A — Accessible   (open access protocol, standard protocol, metadata persists)
    I — Interoperable(machine-readable format, standard vocabularies/ontologies,
                      qualified references to other (meta)data)
    R — Reusable     (clear open license, provenance, domain-relevant standards,
                      rich attributes)

This is grounded in the real FAIR principles — Wilkinson et al. 2016,
"The FAIR Guiding Principles for scientific data management and stewardship",
Sci. Data 3:160018 — which decompose into 15 sub-principles (F1–F4, A1/A1.1/
A1.2/A2, I1–I3, R1/R1.1/R1.2/R1.3). FAIRCheck scores each of those 15 against
concrete, deterministic checks over the supplied record, rolls them into four
per-principle subscores + an overall 0–100 FAIR score, and returns a PRIORITIZED
list of concrete gaps/fixes (highest weight × largest deficit first), so a
researcher (or a DMSP reviewer) gets an actionable punch-list, not a vibe.

Deterministic, validated, never crashes on malformed input (returns a structured
{"error": ...} the gateway turns into a clean 400). No network, no GPU.

Input shape (`record`): a dict of metadata fields, OR a JSON string of the same.
Recognized fields (all optional — missing = a gap, not a crash):
    identifier / doi / accession   — a persistent identifier string
    repository                     — repository / archive name or URL
    license                        — license name/URL/SPDX id
    formats / file_formats         — list[str] or comma string of formats/exts
    metadata_fields                — list[str] of metadata keys present
    access_protocol                — "https"/"ftp"/"s3"/… or a sentence
    access_open                    — bool / "open"/"restricted" (default inferred)
    vocabularies / ontologies      — list[str] of standards referenced
    provenance                     — provenance / lineage text or fields
    references / related           — qualified references to other data
    indexed_in / searchable        — where it is indexed (search engine etc.)
    metadata_persists              — bool: metadata outlives the data
    standards                      — domain/community standards followed

The gateway imports FAIR_RUNNERS from here.
"""
from __future__ import annotations

import json
import re
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Reference knowledge: the things the rubric checks AGAINST. All real.
# ---------------------------------------------------------------------------

# Persistent-identifier schemes the community treats as durable (FAIR F1, A2).
# Patterns are deliberately permissive but anchored to the scheme prefix.
_PID_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("DOI", re.compile(r"\b10\.\d{4,9}/\S+", re.I)),
    ("DOI-url", re.compile(r"https?://(?:dx\.)?doi\.org/10\.\d{4,9}/\S+", re.I)),
    ("Handle", re.compile(r"\bhdl[:/]+\d", re.I)),
    ("ARK", re.compile(r"\bark:/?\d", re.I)),
    ("Accession", re.compile(r"\b(?:GSE|GSM|SRR|SRX|PRJNA|PRJEB|SAMN|E-MTAB|PXD|EMPIAR|PDB|ENA|GCF_|GCA_)\w*\d", re.I)),
    ("URN", re.compile(r"\burn:[a-z0-9][a-z0-9-]{0,31}:", re.I)),
    ("IGSN", re.compile(r"\bIGSN[:/ ]", re.I)),
    ("ORCID", re.compile(r"\b0000-\d{4}-\d{4}-\d{3}[\dxX]\b")),
]
# A bare http(s) URL is a *resolvable locator* but NOT a guaranteed-persistent
# identifier — it scores partial F1 credit, never full.
_URL = re.compile(r"https?://\S+", re.I)

# Open / FAIR-friendly license signals (SPDX ids + common names + URL stems).
_OPEN_LICENSES = {
    "cc0", "cc-0", "cc by", "cc-by", "ccby", "cc by-sa", "cc-by-sa", "cc by-nc",
    "cc-by-nc", "ccbync", "mit", "apache-2.0", "apache 2.0", "bsd", "bsd-3-clause",
    "bsd-2-clause", "gpl", "gpl-3.0", "lgpl", "mpl-2.0", "odbl", "odc-by",
    "pddl", "public domain", "publicdomain", "odc-pddl", "etalab",
}
_OPEN_LICENSE_URL = re.compile(
    r"creativecommons\.org|opensource\.org/licenses|spdx\.org/licenses|"
    r"opendatacommons\.org|unlicense\.org",
    re.I,
)
# A "no license" or all-rights-reserved signal is an explicit Reusable failure.
_CLOSED_LICENSE = re.compile(
    r"all rights reserved|proprietary|no license|copyright \d{4}\b(?!.*cc)", re.I
)

# Open / standard / machine-readable file formats (FAIR I1). Map ext/name →
# whether it is structured+machine-readable (the I1 ask) and open (the R ask).
# value = (machine_readable, open_nonproprietary)
_FORMATS: dict[str, tuple[bool, bool]] = {
    # tabular / structured text
    "csv": (True, True), "tsv": (True, True), "json": (True, True),
    "jsonld": (True, True), "json-ld": (True, True), "xml": (True, True),
    "rdf": (True, True), "ttl": (True, True), "turtle": (True, True),
    "owl": (True, True), "yaml": (True, True), "yml": (True, True),
    "parquet": (True, True), "arrow": (True, True), "avro": (True, True),
    "hdf5": (True, True), "h5": (True, True), "nc": (True, True),
    "netcdf": (True, True), "fits": (True, True), "zarr": (True, True),
    # domain standards (open, machine-readable)
    "nwb": (True, True), "bids": (True, True), "mzml": (True, True),
    "imzml": (True, True), "mzxml": (True, True), "nifti": (True, True),
    "nii": (True, True), "dicom": (True, True), "dcm": (True, True),
    "fasta": (True, True), "fastq": (True, True), "vcf": (True, True),
    "bam": (True, True), "sam": (True, True), "bed": (True, True),
    "gff": (True, True), "gff3": (True, True), "obo": (True, True),
    "mrc": (True, True), "abf": (True, True), "edf": (True, True),
    "geojson": (True, True), "wkt": (True, True), "shp": (True, False),
    # images / generic (open but not inherently structured-machine-readable data)
    "tif": (False, True), "tiff": (False, True), "png": (False, True),
    "txt": (False, True), "md": (False, True), "ome-tiff": (True, True),
    # proprietary / closed (machine_readable but NOT open)
    "xls": (True, False), "xlsx": (True, False), "mat": (True, False),
    "sav": (True, False), "dta": (True, False), "sas7bdat": (True, False),
    "rdata": (True, False), "rda": (True, False), "spss": (True, False),
    "pdf": (False, False), "doc": (False, False), "docx": (False, False),
    "czi": (False, False), "lif": (False, False), "nd2": (False, False),
    "raw": (False, False), "fig": (False, False), "ppt": (False, False),
}

# Recognized community vocabularies / ontologies / metadata standards (FAIR I2,
# R1.3). Presence of any of these as a referenced standard scores interoperable
# + reusable credit. Real, widely-used identifiers.
_KNOWN_VOCABS = {
    "schema.org", "dublin core", "dcterms", "datacite", "dcat", "prov-o", "prov",
    "skos", "foaf", "owl", "rdfs", "obo", "go", "gene ontology", "chebi", "envo",
    "efo", "mesh", "uberon", "ncit", "snomed", "loinc", "edam", "bao", "cl",
    "pato", "so", "sio", "qudt", "uo", "wikidata", "agrovoc", "geonames",
    "iso 19115", "iso19115", "inspire", "darwin core", "dwc", "mage-tab",
    "miame", "miname", "mibbi", "minseqe", "isa-tab", "isa", "cdisc", "om",
    "fairsharing", "bioschemas", "croissant", "ro-crate", "frictionless",
}

# Rich-metadata fields that, when present, indicate a well-described record
# (FAIR F2, R1, R1.2). Each present field nudges the metadata-richness signal.
_RICH_FIELDS = {
    "title", "description", "abstract", "creator", "creators", "author",
    "authors", "contributor", "publisher", "publication_year", "date",
    "created", "modified", "version", "subject", "subjects", "keywords",
    "rights", "license", "language", "geolocation", "spatial", "temporal",
    "methods", "instrument", "variable", "variables", "unit", "units",
    "size", "format", "related_identifier", "funding", "grant", "provenance",
    "checksum", "doi", "identifier", "abstract", "coverage",
}

# Access-protocol signals (FAIR A1, A1.1). Open + standardized protocols.
_STD_PROTOCOLS = re.compile(
    r"\b(https?|ftp|sftp|ftps|s3|oai-pmh|oai|sword|rest|graphql|webdav|"
    r"thredds|opendap|wfs|wcs|wms|sparql|globus)\b",
    re.I,
)
_AUTH_PROTOCOL = re.compile(r"\b(oauth|saml|shibboleth|api[\s_-]?key|token|login|credential)\b", re.I)


# ---------------------------------------------------------------------------
# Field normalization (tolerant — never raises)
# ---------------------------------------------------------------------------
def _as_list(v: Any) -> list[str]:
    """Coerce a value to a list of lowercased non-empty strings."""
    if v is None:
        return []
    if isinstance(v, (list, tuple, set)):
        items = list(v)
    elif isinstance(v, dict):
        items = list(v.keys())
    else:
        items = re.split(r"[,\n;|]", str(v))
    return [str(x).strip().lower() for x in items if str(x).strip()]


def _as_text(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (list, tuple, set)):
        return " ".join(str(x) for x in v)
    if isinstance(v, dict):
        return " ".join(f"{k} {x}" for k, x in v.items())
    return str(v)


def _truthy(v: Any) -> Optional[bool]:
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in ("1", "true", "yes", "y", "open", "public"):
        return True
    if s in ("0", "false", "no", "n", "restricted", "closed", "embargo", "private"):
        return False
    return None


def _format_exts(record: dict) -> list[str]:
    raw = record.get("formats") or record.get("file_formats") or record.get("format")
    out: list[str] = []
    for f in _as_list(raw):
        f = f.lstrip(".")
        # "text/csv" -> "csv", "application/x-hdf5" -> "hdf5"
        if "/" in f:
            f = f.rsplit("/", 1)[-1].replace("x-", "")
        out.append(f)
    return out


# ---------------------------------------------------------------------------
# The 15 FAIR sub-principle checks (each returns 0.0–1.0). All deterministic.
# ---------------------------------------------------------------------------
def _detect_pid(record: dict) -> tuple[float, Optional[str], bool]:
    """F1 / A2: persistent identifier. Returns (score, scheme, is_url_only)."""
    blob = " ".join(
        _as_text(record.get(k))
        for k in ("identifier", "doi", "accession", "pid", "id", "url", "landing_page")
    )
    for scheme, pat in _PID_PATTERNS:
        if pat.search(blob):
            return 1.0, scheme, False
    if _URL.search(blob):
        return 0.4, "URL (resolvable, persistence not guaranteed)", True
    if blob.strip():
        return 0.2, "non-standard identifier string", False
    return 0.0, None, False


def _metadata_richness(record: dict) -> tuple[float, list[str], list[str]]:
    """F2 / R1: how richly described. Returns (score, present, missing-core)."""
    present_keys = {str(k).strip().lower() for k in record.keys()}
    declared = set(_as_list(record.get("metadata_fields")))
    present = sorted((present_keys | declared) & _RICH_FIELDS)
    # core descriptive fields every record should carry
    core = {"title", "description", "creator", "license", "date", "subject"}
    core_present = {
        c for c in core
        if c in present
        or (c == "creator" and ({"creators", "author", "authors"} & set(present)))
        or (c == "subject" and ({"subjects", "keywords"} & set(present)))
        or (c == "date" and ({"created", "publication_year", "modified"} & set(present)))
    }
    missing_core = sorted(core - core_present)
    # score: half from core coverage, half from breadth (capped at 8 rich fields)
    core_score = len(core_present) / len(core)
    breadth = min(len(present), 8) / 8.0
    return round(0.6 * core_score + 0.4 * breadth, 4), present, missing_core


def _findable_indexed(record: dict) -> float:
    """F4: registered/indexed in a searchable resource."""
    txt = _as_text(record.get("indexed_in")) + " " + _as_text(record.get("repository"))
    if _truthy(record.get("searchable")) or txt.strip():
        return 1.0 if (record.get("repository") or record.get("indexed_in")) else 0.5
    return 0.0


def _accessible(record: dict) -> tuple[float, float, float, list[str]]:
    """A1, A1.1/A1.2, A2. Returns (a1, a1_1_openfree, a2_persist, notes)."""
    notes: list[str] = []
    proto_txt = _as_text(record.get("access_protocol")) + " " + _as_text(record.get("repository"))
    has_std = bool(_STD_PROTOCOLS.search(proto_txt))
    a1 = 1.0 if has_std else (0.3 if proto_txt.strip() else 0.0)
    # A1.1: protocol is open + free? open access flag, or std protocol w/o auth wall
    open_flag = _truthy(record.get("access_open"))
    has_auth = bool(_AUTH_PROTOCOL.search(proto_txt))
    if open_flag is True:
        a1_1 = 1.0
    elif open_flag is False:
        a1_1 = 0.2
        notes.append("access marked restricted — document the authN/authZ procedure (A1.2)")
    else:
        a1_1 = 0.8 if (has_std and not has_auth) else (0.4 if has_std else 0.0)
    # A2: metadata persists even when data is gone
    mp = _truthy(record.get("metadata_persists"))
    a2 = 1.0 if mp is True else (0.5 if record.get("repository") else 0.0)
    return round(a1, 4), round(a1_1, 4), round(a2, 4), notes


def _interoperable(record: dict) -> tuple[float, float, float, dict]:
    """I1 (format), I2 (vocab), I3 (qualified refs). Returns scores + detail."""
    exts = _format_exts(record)
    known = [(e, _FORMATS[e]) for e in exts if e in _FORMATS]
    if known:
        mr = sum(1 for _, (m, _o) in known if m) / len(known)
        i1 = round(mr, 4)
    elif exts:
        i1 = 0.3  # has formats, none recognized as structured
    else:
        i1 = 0.0
    vocabs_decl = set(_as_list(record.get("vocabularies")) + _as_list(record.get("ontologies")))
    vocab_txt = _as_text(record.get("vocabularies")) + " " + _as_text(record.get("ontologies")) \
        + " " + _as_text(record.get("standards"))
    matched = sorted({v for v in _KNOWN_VOCABS if v in vocab_txt.lower()} | (vocabs_decl & _KNOWN_VOCABS))
    if matched:
        i2 = 1.0
    elif vocabs_decl or vocab_txt.strip():
        i2 = 0.4  # uses *a* vocab but not a recognized community standard
    else:
        i2 = 0.0
    refs = _as_list(record.get("references")) + _as_list(record.get("related")) \
        + _as_list(record.get("related_identifier"))
    i3 = 1.0 if refs else 0.0
    detail = {
        "recognized_formats": [e for e, _ in known],
        "machine_readable_fraction": round(
            sum(1 for _, (m, _o) in known if m) / len(known), 3
        ) if known else 0.0,
        "matched_vocabularies": matched,
        "n_qualified_references": len(refs),
    }
    return round(i1, 4), round(i2, 4), round(i3, 4), detail


def _reusable(record: dict) -> tuple[float, float, float, float, dict]:
    """R1 (attributes), R1.1 (license), R1.2 (provenance), R1.3 (standards)."""
    # R1.1: clear, accessible, OPEN license
    lic_txt = _as_text(record.get("license")).strip()
    lic_l = lic_txt.lower()
    if _CLOSED_LICENSE.search(lic_l):
        r1_1, lic_kind = 0.1, "closed / all-rights-reserved"
    elif any(tok in lic_l for tok in _OPEN_LICENSES) or _OPEN_LICENSE_URL.search(lic_txt):
        r1_1, lic_kind = 1.0, "open"
    elif lic_txt:
        r1_1, lic_kind = 0.5, "license present but not recognized as open"
    else:
        r1_1, lic_kind = 0.0, "no license"
    # R1.2: provenance
    prov = _as_text(record.get("provenance")).strip() or _as_text(record.get("lineage")).strip()
    r1_2 = 1.0 if prov else (0.4 if record.get("creator") or record.get("creators") else 0.0)
    # R1.3: domain-relevant community standards
    std_txt = _as_text(record.get("standards")) + " " + _as_text(record.get("vocabularies"))
    has_std = any(v in std_txt.lower() for v in _KNOWN_VOCABS) or bool(_as_list(record.get("standards")))
    r1_3 = 1.0 if has_std else 0.0
    # R1: plurality of accurate, relevant attributes (reuse the richness signal)
    rich, _present, _missing = _metadata_richness(record)
    r1 = rich
    detail = {"license_kind": lic_kind, "license": lic_txt[:120], "has_provenance": bool(prov)}
    return round(r1, 4), round(r1_1, 4), round(r1_2, 4), round(r1_3, 4), detail


# ---------------------------------------------------------------------------
# Rubric weights (per sub-principle, within its letter). Sum within letter = 1.
# ---------------------------------------------------------------------------
_WEIGHTS = {
    # Findable
    "F1": 0.40, "F2": 0.30, "F3": 0.10, "F4": 0.20,
    # Accessible
    "A1": 0.40, "A1.1": 0.30, "A2": 0.30,
    # Interoperable
    "I1": 0.45, "I2": 0.40, "I3": 0.15,
    # Reusable
    "R1": 0.25, "R1.1": 0.40, "R1.2": 0.20, "R1.3": 0.15,
}
# Per-letter weight into the overall FAIR score.
_LETTER_WEIGHT = {"F": 0.25, "A": 0.25, "I": 0.25, "R": 0.25}

# Human-readable fix advice per sub-principle (used to build the punch-list).
_FIX = {
    "F1": "Mint a globally-unique persistent identifier (a DOI via Zenodo/Dryad/Figshare or a domain accession). A bare URL is not enough.",
    "F2": "Add rich descriptive metadata: title, description, creators, subject/keywords, dates, version.",
    "F3": "Ensure the metadata explicitly contains the data's persistent identifier (the PID must appear in the record).",
    "F4": "Deposit in a searchable repository so the (meta)data is indexed and discoverable (e.g. a domain repo or a generalist one like Zenodo).",
    "A1": "Document a standardized, open access protocol (HTTPS, OAI-PMH, S3, REST…) for retrieving the data by its identifier.",
    "A1.1": "Make the access protocol open, free, and universally implementable; if access is gated, document the authN/authZ procedure (A1.2).",
    "A2": "Guarantee metadata persists even if the data is removed (most repositories give the metadata a tombstone — state this).",
    "I1": "Store data in an open, machine-readable, formal format (CSV/JSON/Parquet/HDF5/NetCDF or a domain standard like NWB/mzML/VCF), not a proprietary one (xlsx/mat/czi).",
    "I2": "Annotate (meta)data with FAIR-compliant community vocabularies/ontologies (schema.org, DataCite, Dublin Core, GO, ChEBI, EFO, Darwin Core…).",
    "I3": "Add qualified references to related (meta)data (cite the protocol, the parent dataset, related records by their identifiers).",
    "R1": "Describe the data with a plurality of accurate, domain-relevant attributes so a third party can judge reuse.",
    "R1.1": "Release under a clear, accessible OPEN data-usage license (CC0 / CC-BY for data; MIT/Apache for code). 'All rights reserved' blocks reuse.",
    "R1.2": "Record detailed provenance (how, by whom, from what, with which instrument/pipeline the data was produced).",
    "R1.3": "Follow domain-relevant community standards (metadata schemas, minimum-information checklists like MIAME/MIBBI, ISA-Tab).",
}


def assess_fair(record: dict) -> dict:
    """Run the full 15-check FAIR rubric over a metadata record. Pure.

    Returns per-sub-principle scores, four per-letter subscores, an overall
    0–100 FAIR score, and a prioritized gap/fix punch-list.
    """
    pid_score, pid_scheme, pid_url_only = _detect_pid(record)
    rich, present_fields, missing_core = _metadata_richness(record)
    # F3: the PID appears in / is bound to the metadata (we have a PID AND a
    # description-bearing record) — proxy: PID present and metadata non-trivial.
    f3 = 1.0 if (pid_score >= 1.0 and rich > 0) else (0.5 if pid_score >= 0.4 else 0.0)
    f4 = _findable_indexed(record)
    a1, a1_1, a2, a_notes = _accessible(record)
    i1, i2, i3, i_detail = _interoperable(record)
    r1, r1_1, r1_2, r1_3, r_detail = _reusable(record)

    sub = {
        "F1": pid_score, "F2": rich, "F3": f3, "F4": f4,
        "A1": a1, "A1.1": a1_1, "A2": a2,
        "I1": i1, "I2": i2, "I3": i3,
        "R1": r1, "R1.1": r1_1, "R1.2": r1_2, "R1.3": r1_3,
    }

    def _letter(prefix: str) -> float:
        keys = [k for k in _WEIGHTS if k == prefix or k.startswith(prefix)]
        # only this letter's keys (F1..F4, A1.., I1.., R1..)
        keys = [k for k in keys if k[0] == prefix]
        wsum = sum(_WEIGHTS[k] for k in keys)
        return round(sum(sub[k] * _WEIGHTS[k] for k in keys) / wsum, 4) if wsum else 0.0

    letters = {p: _letter(p) for p in ("F", "A", "I", "R")}
    overall = round(
        sum(letters[p] * _LETTER_WEIGHT[p] for p in letters) * 100.0, 1
    )

    # prioritized gaps: deficit (1 - score) × weight-in-overall, biggest first.
    gaps: list[dict] = []
    for k, s in sub.items():
        if s >= 0.999:
            continue
        letter = k[0]
        weight_overall = _WEIGHTS[k] / sum(
            _WEIGHTS[x] for x in _WEIGHTS if x[0] == letter
        ) * _LETTER_WEIGHT[letter]
        priority = round((1.0 - s) * weight_overall, 5)
        gaps.append({
            "principle": k,
            "letter": letter,
            "score": round(s, 3),
            "priority": priority,
            "fix": _FIX[k],
        })
    gaps.sort(key=lambda g: g["priority"], reverse=True)

    if overall >= 85:
        grade, verdict = "A", "Strongly FAIR — meets funder DMSP expectations."
    elif overall >= 70:
        grade, verdict = "B", "Largely FAIR — a few concrete fixes close the gap."
    elif overall >= 50:
        grade, verdict = "C", "Partially FAIR — several principles need work before deposition."
    elif overall >= 30:
        grade, verdict = "D", "Weakly FAIR — substantial remediation needed for funder compliance."
    else:
        grade, verdict = "F", "Not FAIR — start with a PID, an open license, and a repository."

    return {
        "overall_fair_score": overall,
        "grade": grade,
        "verdict": verdict,
        "subscores": {
            "Findable": round(letters["F"] * 100, 1),
            "Accessible": round(letters["A"] * 100, 1),
            "Interoperable": round(letters["I"] * 100, 1),
            "Reusable": round(letters["R"] * 100, 1),
        },
        "sub_principles": {k: round(v, 3) for k, v in sub.items()},
        "detected": {
            "persistent_identifier": pid_scheme,
            "pid_is_url_only": pid_url_only,
            "metadata_fields_present": present_fields,
            "missing_core_metadata": missing_core,
            **i_detail,
            **r_detail,
        },
        "access_notes": a_notes,
        "prioritized_gaps": gaps,
    }


def _demo_record() -> dict:
    """A realistic, deliberately MIXED record: strong F/A, weak I/R."""
    return {
        "title": "Single-cell RNA-seq of cortical interneurons under hypoxia",
        "description": "Processed expression matrices and metadata for 24 samples.",
        "creators": ["A. Researcher", "B. Collaborator"],
        "doi": "10.5281/zenodo.7654321",
        "repository": "Zenodo",
        "access_protocol": "https",
        "access_open": True,
        "metadata_persists": True,
        "indexed_in": "Zenodo / OpenAIRE",
        "formats": ["xlsx", "pdf"],          # proprietary → low I1
        "license": "All rights reserved",     # closed → low R1.1
        "subject": "neuroscience, single-cell, hypoxia",
        "date": "2026-01-15",
        # no vocabularies, no provenance, no references → I2/I3/R1.2/R1.3 gaps
    }


def run_fair_check(payload: dict) -> dict:
    """payload: { record: <dict | JSON string of metadata fields>  OR  "demo" }

    Assess a dataset/metadata record for FAIR (Findable, Accessible,
    Interoperable, Reusable) compliance with a real, deterministic rubric
    grounded in Wilkinson 2016's 15 sub-principles + funder DMSP requirements.
    Never raises on malformed input — returns {"error": ...}.
    """
    raw = payload.get("record")
    demo = isinstance(raw, str) and raw.strip().lower() == "demo"
    if demo:
        record = _demo_record()
    elif isinstance(raw, str):
        s = raw.strip()
        if len(s) < 2:
            return {"error": 'provide a metadata record (JSON object or fields), or "demo"'}
        try:
            record = json.loads(s)
        except Exception:
            return {"error": "record string must be valid JSON describing the metadata fields"}
        if not isinstance(record, dict):
            return {"error": "record JSON must be an object of metadata fields"}
    elif isinstance(raw, dict):
        record = raw
    else:
        return {"error": 'provide a metadata record (JSON object or fields), or "demo"'}

    if not record:
        return {"error": "record is empty — supply at least one metadata field"}
    # Guard: keep the rubric stable on absurd inputs.
    if len(record) > 500:
        return {"error": "record has too many fields (max 500)"}

    result = assess_fair(record)
    result["demo"] = demo
    result["method"] = (
        "FAIR rubric over Wilkinson et al. 2016's 15 sub-principles (F1–F4, "
        "A1/A1.1/A2, I1–I3, R1/R1.1–R1.3); each scored by concrete, deterministic "
        "checks over the supplied metadata, weighted into per-principle subscores "
        "and an overall 0–100 FAIR score, with a priority-ranked fix list."
    )
    result["note"] = (
        "Horizontal, all-field tool: FAIR data management is funder-mandated "
        "across NIH/NSF/Horizon Europe/Wellcome/Gates (DMSP/DMP). This is a "
        "transparent self-assessment + remediation punch-list, not a certifying "
        "audit — deposit in a trusted repository for an authoritative FAIR badge."
    )
    if demo:
        result["note"] = "DEMO: a deliberately mixed record (strong Findable/Accessible, weak Interoperable/Reusable). " + result["note"]
    return result


# Registry the gateway imports.
FAIR_RUNNERS = {
    "faircheck": run_fair_check,
}
