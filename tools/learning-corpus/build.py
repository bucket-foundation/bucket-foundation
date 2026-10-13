#!/usr/bin/env python3
import argparse
import collections
import json
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "learning" / "corpus"
SOURCES = CORPUS / "sources"
LINKS = Path(__file__).resolve().parent / "links.json"

WORK_INVENTORIES = ["gap-methods-epistemics", "gap-workplace-career", "literature"]
CLAIM_INVENTORIES = ["core", "career-work", "epistemics-impact"]
PRECEDENCE = WORK_INVENTORIES + CLAIM_INVENTORIES + ["mechanisms"]
INVENTORY_FILES = [
    "core", "literature", "literature-enriched", "career-work", "epistemics-impact",
    "mechanisms", "gap-workplace-career", "gap-methods-epistemics", "methods-table",
]
SUMMARY_FILES = [
    "core", "literature", "literature-enriched", "career-work", "epistemics-impact",
    "mechanisms", "gap-workplace-career", "gap-methods-epistemics",
]
VERIFICATION_RANK = ["doi-confirmed", "url-confirmed", "record-has-doi", "unconfirmed"]
CONFIRMED = {"doi-confirmed", "url-confirmed"}
EXCLUDED_KINDS = {"dataset", "open-question"}
STATUSES = [
    "backed", "backed-weak", "unbacked", "contradicted-internally",
    "contradicted-by-evidence", "proved",
]
TERMS = ["education", "knowledge", "learning", "mastery", "understanding"]
TITLE_MATCH_FLOOR = 0.6
ABSTRACTS_NAME = "abstracts.local.jsonl"
SQLITE_NAME = "corpus.sqlite"


def read_jsonl(path):
    with open(path, encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=False) + "\n")


def fold(text):
    decomposed = unicodedata.normalize("NFKD", text or "")
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", stripped.lower()).strip()


def doi_key(value):
    if not value:
        return None
    text = value.strip()
    arxiv = re.search(r"arxiv(?:\.org/(?:abs|pdf)/|:|\.)\s*(\d{4}\.\d{4,5})", text, re.I)
    if arxiv:
        return "arxiv:" + arxiv.group(1)
    doi = re.search(r"10\.\d{4,9}/[^\s\"<>]+", text)
    if not doi:
        return None
    found = re.sub(r"[?#].*$", "", doi.group(0).lower())
    found = re.sub(r"(/full|/abstract|/pdf|\.pdf)$", "", found)
    return found.rstrip(".,;)")


def url_key(value):
    if not value or not re.search(r"[./]", value):
        return None
    text = re.sub(r"^https?://", "", value.strip().lower())
    return re.sub(r"^www\.", "", text).rstrip("/")


def display_id(value):
    key = doi_key(value)
    if not key:
        return value or None
    if key.startswith("arxiv:"):
        return "arXiv:" + key[6:]
    return key


def author_list(authors):
    if isinstance(authors, list):
        return [a for a in authors if a]
    if authors:
        return [authors]
    return []


def first_surname(authors):
    names = author_list(authors)
    if not names:
        return ""
    first = re.split(r"\s*(?:;|&|\band\b|\bet al\b)\s*", names[0].strip(), maxsplit=1)[0].strip()
    if "," in first:
        first = first.split(",")[0]
    tokens = fold(first).split()
    if not tokens:
        return ""
    if "," in names[0] or len(tokens) == 1:
        return tokens[-1]
    return tokens[-1]


def year_of(value):
    match = re.search(r"\d{4}", str(value)) if value is not None else None
    return int(match.group(0)) if match else None


def main_title(title):
    head = (title or "").split(":")[0]
    folded = fold(head)
    if len(folded.split()) >= 2 and len(folded) >= 10:
        return folded
    return None


def bare_title(title):
    return fold(re.sub(r"\([^)]*\)", " ", title or ""))


def slugify(text, limit=6):
    return "-".join(fold(text).split()[:limit])


def numbers_in(text):
    cleaned = (text or "").replace("−", "-").replace(",", "")
    found = []
    for token in re.findall(r"(?<![\w.])-?\d+\.\d+|(?<![\w.])-?\.\d+|(?<![\w.])-?\d+", cleaned):
        decimals = len(token.split(".")[1]) if "." in token else 0
        value = abs(float(token))
        if decimals == 0 and 1800 <= value <= 2100:
            continue
        found.append((value, decimals))
    return found


def numbers_agree(left, right):
    for a, da in left:
        for b, db in right:
            places = min(da, db)
            if round(a, places) == round(b, places):
                return True
    return False


class Clusters:
    def __init__(self):
        self.parent = {}

    def find(self, item):
        self.parent.setdefault(item, item)
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, left, right):
        a, b = self.find(left), self.find(right)
        if a != b:
            self.parent[max(a, b)] = min(a, b)


def import_inventories(source_dir, links):
    source_dir = Path(source_dir)
    SOURCES.mkdir(parents=True, exist_ok=True)
    excluded = links["excluded_personal"]
    report = {}
    for name in SUMMARY_FILES:
        summary = (source_dir / f"{name}.md").read_text(encoding="utf-8")
        summary = re.sub(r"^(#+ [^\n(]*?)\s*\([^)\n]*\)\s*$", r"\1", summary, flags=re.M)
        (SOURCES / f"{name}.md").write_text(summary, encoding="utf-8")
    abstracts = []
    for name in INVENTORY_FILES:
        rows = read_jsonl(source_dir / f"{name}.jsonl")
        dropped = [r["id"] for r in rows if r.get("id") in excluded.get(name, [])]
        rows = [r for r in rows if r.get("id") not in excluded.get(name, [])]
        if name == "literature-enriched":
            for row in rows:
                record = row.get("openalex") or {}
                text = record.pop("abstract", None)
                if record:
                    record["abstract_held"] = bool(text)
                if text:
                    abstracts.append({"id": row["id"], "abstract": text})
        write_jsonl(SOURCES / f"{name}.jsonl", rows)
        report[name] = {"kept": len(rows), "dropped": dropped}
    write_jsonl(SOURCES / ABSTRACTS_NAME, abstracts)
    report["abstracts_split"] = len(abstracts)
    return report


def literature_verification(row):
    record = row.get("openalex") or {}
    key = doi_key(row.get("doi_or_url"))
    matched = row.get("enrichment") == "ok" and (row.get("title_match") or 0) >= TITLE_MATCH_FLOOR
    if matched and key and key == doi_key(record.get("doi")):
        return "doi-confirmed"
    if matched and record.get("id"):
        return "url-confirmed"
    if key:
        return "record-has-doi"
    return "unconfirmed"


def source_paths(entries):
    paths = []
    for entry in entries or []:
        path = entry if isinstance(entry, str) else entry.get("path")
        if path:
            paths.append(path)
    return paths


def normalise_sources(entries):
    out = []
    for entry in entries or []:
        if isinstance(entry, str):
            out.append({"path": entry})
            continue
        item = {"path": entry.get("path")}
        heading = entry.get("heading_or_line") or entry.get("line_or_heading")
        if heading:
            item["heading"] = heading
        if entry.get("repo_or_folder"):
            item["repo"] = entry["repo_or_folder"]
        out.append(item)
    return out


def load_candidates(data):
    candidates = []
    for inventory in WORK_INVENTORIES:
        for row in data[inventory]:
            verification = row["verification"]
            verified_at = row.get("verified_at")
            if inventory == "literature":
                verification = literature_verification(row)
                verified_at = (row.get("openalex") or {}).get("id")
            venue = row.get("venue") or ""
            record = row.get("openalex") or {}
            candidates.append({
                "inventory": inventory,
                "source_id": row["id"],
                "authors": author_list(row.get("authors")),
                "year": year_of(row.get("year")),
                "title": (row.get("title") or "").strip(),
                "venue": row.get("venue"),
                "doi_or_url": row.get("doi_or_url"),
                "study_type": row.get("study_type"),
                "population": row.get("population"),
                "finding": row.get("finding"),
                "effect": row.get("effect"),
                "contested": row.get("contested"),
                "topics": row.get("topics") or [],
                "verification": verification,
                "verified_at": verified_at,
                "paths": source_paths(row.get("internal_sources")),
                "abstract_held": bool(record.get("abstract_held")),
                "withdrawn": "withdrawn" in venue.lower() or str(record.get("is_retracted")) == "True",
                "enrichment": row.get("enrichment"),
                "title_match": row.get("title_match"),
                "citing": None,
            })
    for inventory in CLAIM_INVENTORIES + ["mechanisms"]:
        for row in data[inventory]:
            if inventory == "mechanisms":
                citing = f"mechanisms:{row['id']}"
            else:
                citing = f"{inventory}:{row['id']}"
            for index, cited in enumerate(row.get("cited_works") or []):
                link = cited.get("doi_or_url")
                candidates.append({
                    "inventory": inventory,
                    "source_id": f"{row['id']}#{index}",
                    "authors": author_list(cited.get("authors")),
                    "year": year_of(cited.get("year")),
                    "title": (cited.get("title") or "").strip(),
                    "venue": cited.get("venue"),
                    "doi_or_url": link,
                    "study_type": None,
                    "population": None,
                    "finding": None,
                    "effect": None,
                    "contested": None,
                    "topics": row.get("topics") or [],
                    "verification": "record-has-doi" if doi_key(link) else "unconfirmed",
                    "verified_at": None,
                    "paths": source_paths(row.get("internal_sources")),
                    "abstract_held": False,
                    "withdrawn": False,
                    "enrichment": None,
                    "title_match": None,
                    "citing": citing,
                })
    return candidates


def candidate_keys(candidate):
    keys = []
    surname = first_surname(candidate["authors"])
    year = candidate["year"]
    doi = doi_key(candidate["doi_or_url"])
    if doi:
        keys.append("d:" + doi)
    title = fold(candidate["title"])
    if title:
        keys.append(f"t:{title}|{surname}|{year}")
        head = main_title(candidate["title"])
        if head and surname and year:
            keys.append(f"m:{head}|{surname}|{year}")
    elif not doi:
        link = url_key(candidate["doi_or_url"])
        if link:
            keys.append("u:" + link)
    return keys


def cluster_candidates(candidates):
    clusters = Clusters()
    key_owner = {}
    unresolved = []
    author_year = []
    keyed = []
    for index, candidate in enumerate(candidates):
        keys = candidate_keys(candidate)
        if not keys:
            unresolved.append(index)
            continue
        keyed.append(index)
        clusters.find(index)
        for key in keys:
            if key in key_owner:
                clusters.union(index, key_owner[key])
            else:
                key_owner[key] = index
    same_author_year = collections.defaultdict(list)
    for index in keyed:
        candidate = candidates[index]
        surname = first_surname(candidate["authors"])
        if surname and candidate["title"]:
            same_author_year[(surname, candidate["year"])].append(index)
    for indexes in same_author_year.values():
        for left in indexes:
            short = bare_title(candidates[left]["title"])
            if len(short.split()) < 2 or len(short) < 10:
                continue
            for right in indexes:
                full = fold(candidates[right]["title"])
                if left != right and f" {short} " in f" {full} ":
                    clusters.union(left, right)
    by_author_year = collections.defaultdict(set)
    for index in keyed:
        candidate = candidates[index]
        surname = first_surname(candidate["authors"])
        if surname and candidate["year"] and candidate["title"]:
            by_author_year[(surname, candidate["year"])].add(clusters.find(index))
    still_unresolved = []
    for index in unresolved:
        candidate = candidates[index]
        surname = first_surname(candidate["authors"])
        targets = by_author_year.get((surname, candidate["year"]), set()) if surname else set()
        targets = {clusters.find(t) for t in targets}
        if len(targets) == 1:
            clusters.union(index, next(iter(targets)))
            author_year.append(index)
        else:
            still_unresolved.append(index)
    for index in keyed:
        candidate = candidates[index]
        if candidate["title"] or doi_key(candidate["doi_or_url"]):
            continue
        surname = first_surname(candidate["authors"])
        targets = by_author_year.get((surname, candidate["year"]), set()) if surname else set()
        targets = {clusters.find(t) for t in targets}
        if len(targets) == 1:
            clusters.union(index, next(iter(targets)))
            author_year.append(index)
    groups = collections.defaultdict(list)
    for index in range(len(candidates)):
        if index in still_unresolved:
            continue
        groups[clusters.find(index)].append(index)
    return groups, still_unresolved, author_year


def first_value(members, field):
    for member in members:
        if member[field]:
            return member[field]
    return None


def build_works(data):
    candidates = load_candidates(data)
    groups, unresolved, author_year = cluster_candidates(candidates)
    works = []
    used_ids = set()
    candidate_work = {}
    order = {name: rank for rank, name in enumerate(PRECEDENCE)}
    for root in sorted(groups):
        indexes = sorted(groups[root], key=lambda i: (order[candidates[i]["inventory"]], i))
        members = [candidates[i] for i in indexes]
        lead = members[0]
        if lead["inventory"] in WORK_INVENTORIES:
            base = lead["source_id"]
        else:
            titled = first_value(members, "title")
            surname = first_surname(first_value(members, "authors") or [])
            year = first_value(members, "year")
            tail = slugify(titled, 5) if titled else slugify(url_key(lead["doi_or_url"]) or "untitled", 5)
            base = "-".join(part for part in [surname or "anon", str(year or "nd"), tail] if part)
        work_id = base
        suffix = 2
        while work_id in used_ids:
            work_id = f"{base}-{suffix}"
            suffix += 1
        used_ids.add(work_id)
        dois = []
        for member in members:
            key = doi_key(member["doi_or_url"])
            if key and key not in dois:
                dois.append(key)
        link = display_id(first_value([m for m in members if doi_key(m["doi_or_url"])], "doi_or_url"))
        if not link:
            link = first_value(members, "doi_or_url")
        effects = []
        for member in members:
            if member["effect"] and member["inventory"] in WORK_INVENTORIES:
                effects.append({
                    "inventory": member["inventory"],
                    "source": member["source_id"],
                    "value": member["effect"],
                })
        verification = min(
            (m["verification"] for m in members), key=VERIFICATION_RANK.index
        )
        topics = sorted({t for m in members for t in m["topics"] if m["inventory"] in WORK_INVENTORIES})
        if not topics:
            topics = sorted({t for m in members for t in m["topics"]})
        work = {
            "id": work_id,
            "authors": first_value(members, "authors") or [],
            "year": first_value(members, "year"),
            "title": first_value(members, "title"),
            "venue": first_value(members, "venue"),
            "doi_or_url": link,
            "other_ids": [display_id(d) for d in dois if display_id(d) != link],
            "study_type": first_value(members, "study_type"),
            "population": first_value(members, "population"),
            "finding": first_value(members, "finding"),
            "effect": effects,
            "effect_conflict": False,
            "contested": first_value(members, "contested"),
            "abstract": None,
            "topics": topics,
            "verification": verification,
            "verified_at": first_value(members, "verified_at"),
            "withdrawn": any(m["withdrawn"] for m in members),
            "found_in": sorted({m["inventory"] for m in members}, key=PRECEDENCE.index),
            "source_ids": sorted({
                f"{m['inventory']}:{m['source_id']}" for m in members if m["inventory"] in WORK_INVENTORIES
            }),
            "internal_sources": sorted({p for m in members for p in m["paths"]}),
            "cited_by": sorted({m["citing"] for m in members if m["citing"]}),
        }
        if any(m["abstract_held"] for m in members):
            work["abstract"] = {"held": True, "source": "openalex", "file": ABSTRACTS_NAME}
        works.append(work)
        for index in indexes:
            candidate_work[index] = work_id
    citations = collections.defaultdict(list)
    loose = collections.defaultdict(list)
    for index, candidate in enumerate(candidates):
        if not candidate["citing"]:
            continue
        if index in candidate_work:
            if candidate_work[index] not in citations[candidate["citing"]]:
                citations[candidate["citing"]].append(candidate_work[index])
        else:
            loose[candidate["citing"]].append({
                "authors": " ".join(candidate["authors"]) or None,
                "year": candidate["year"],
                "title": candidate["title"] or None,
            })
    matched_loosely = [
        {"cited_by": candidates[i]["citing"], "work": candidate_work[i],
         "authors": " ".join(candidates[i]["authors"]), "year": candidates[i]["year"]}
        for i in author_year
    ]
    works.sort(key=lambda w: w["id"])
    return works, citations, loose, matched_loosely


def attach_claim_effects(works, data, citations):
    by_id = {w["id"]: w for w in works}
    for inventory in CLAIM_INVENTORIES:
        for row in data[inventory]:
            claim_id = f"{inventory}:{row['id']}"
            cited = citations.get(claim_id, [])
            if row.get("effect") and len(cited) == 1 and len(row.get("cited_works") or []) == 1:
                by_id[cited[0]]["effect"].append({
                    "inventory": inventory,
                    "source": claim_id,
                    "value": row["effect"],
                })
    for work in works:
        per_inventory = collections.defaultdict(list)
        for entry in work["effect"]:
            per_inventory[entry["inventory"]].extend(numbers_in(entry["value"]))
        filled = [nums for nums in per_inventory.values() if nums]
        conflict = False
        for i in range(len(filled)):
            for j in range(i + 1, len(filled)):
                if not numbers_agree(filled[i], filled[j]):
                    conflict = True
        work["effect_conflict"] = conflict


def is_confirmed(work):
    return work["verification"] in CONFIRMED and not work["withdrawn"]


def resolver(works):
    lookup = {}
    for work in works:
        for source in work["source_ids"]:
            lookup[source] = work["id"]
    return lookup


def build_claims(data, works, citations, loose, links):
    by_id = {w["id"]: w for w in works}
    lookup = resolver(works)
    contradicted = collections.defaultdict(list)
    ideas = collections.defaultdict(list)
    for entry in links["weak_ideas"]:
        resolved = [lookup[ref] for ref in entry["works"]]
        for claim_id in entry["claims"]:
            ideas[claim_id].append(entry["idea"])
            for work_id in resolved:
                if work_id not in contradicted[claim_id]:
                    contradicted[claim_id].append(work_id)
    related = {
        claim_id: [lookup[ref] for ref in refs]
        for claim_id, refs in links["related_gap_works"].items()
    }
    claims = []
    for inventory in CLAIM_INVENTORIES:
        for row in data[inventory]:
            if row["kind"] in EXCLUDED_KINDS:
                continue
            claim_id = f"{inventory}:{row['id']}"
            supports = citations.get(claim_id, [])
            noted = row["verification"]
            strong = [
                w for w in supports
                if is_confirmed(by_id[w]) and not by_id[w]["contested"]
            ]
            if noted.startswith("proved-in-lean"):
                status = "proved"
            elif claim_id in contradicted:
                status = "contradicted-by-evidence"
            elif noted.startswith("contradicted-internally"):
                status = "contradicted-internally"
            elif supports and strong and not noted.startswith("uncited-claim"):
                status = "backed"
            elif supports:
                status = "backed-weak"
            else:
                status = "unbacked"
            claims.append({
                "id": claim_id,
                "inventory": inventory,
                "kind": row["kind"],
                "name": row["name"],
                "statement": row["statement"],
                "topics": row.get("topics") or [],
                "internal_sources": normalise_sources(row.get("internal_sources")),
                "supports": supports,
                "status": status,
                "contradicted_by": contradicted.get(claim_id, []),
                "weak_ideas": ideas.get(claim_id, []),
                "related_gap_works": related.get(claim_id, []),
                "unresolved_citations": loose.get(claim_id, []),
                "effect": row.get("effect"),
                "formal": row.get("formal"),
                "evidence_grade_in_source": row.get("evidence_grade_in_source"),
                "inventory_verification": noted,
            })
    known = {c["id"] for c in claims}
    missing = [c for c in list(contradicted) + list(related) if c not in known]
    if missing:
        raise SystemExit(f"links.json names claims that do not exist: {missing}")
    return claims


def unsourced_parameters(mechanism):
    return [
        {"name": p.get("name"), "value": p.get("value")}
        for p in mechanism.get("parameters") or []
        if (p.get("source") or "no stated source").lower().startswith("no stated source")
    ]


def is_measured(mechanism):
    text = (mechanism.get("measured_by") or "").strip().lower()
    return bool(text) and not text.startswith("nothing")


def conflict_note(mechanism):
    note = mechanism.get("verification") or ""
    if note.startswith("doc-and-code-disagree"):
        return note.split(":", 1)[1].strip() if ":" in note else note
    return None


def build_methods(data, works, claims, links):
    by_id = {w["id"]: w for w in works}
    lookup = resolver(works)
    mechanisms = {m["id"]: m for m in data["mechanisms"] if m["kind"] == "bucket-mechanism"}
    methods = []
    for row in data["methods-table"]:
        work_ids = []
        for ref in row["best_evidence"]:
            if ref.startswith("literature:"):
                key = ref
            elif f"gap-methods-epistemics:{ref}" in lookup:
                key = f"gap-methods-epistemics:{ref}"
            else:
                key = f"gap-workplace-career:{ref}"
            work_id = lookup[key]
            if work_id not in work_ids:
                work_ids.append(work_id)
        pattern = re.compile(links["method_aliases"][row["method"]], re.I)
        claim_ids = []
        for claim in claims:
            shared = set(claim["supports"]) & set(work_ids)
            named = pattern.search(claim["name"] + " " + claim["statement"])
            if shared or named:
                claim_ids.append(claim["id"])
        mechanism_ids = [
            part.strip() for part in (row.get("in_bucket_today") or "").split(";") if part.strip()
        ]
        unknown = [m for m in mechanism_ids if m not in mechanisms]
        if unknown:
            raise SystemExit(f"methods-table names unknown mechanisms: {unknown}")
        unsourced = []
        for mechanism_id in mechanism_ids:
            for parameter in unsourced_parameters(mechanisms[mechanism_id]):
                unsourced.append({"mechanism": mechanism_id, **parameter})
        measured = any(is_measured(mechanisms[m]) for m in mechanism_ids)
        methods.append({
            "method": row["method"],
            "what_it_is": row["what_it_is"],
            "typical_effect": {"text": row["typical_effect"], "work_ids": work_ids},
            "confirmed_works": sum(1 for w in work_ids if is_confirmed(by_id[w])),
            "boundary_conditions": row["boundary_conditions"],
            "contested": row["contested"],
            "claims": claim_ids,
            "bucket_mechanisms": mechanism_ids,
            "bucket_parameters_unsourced": unsourced,
            "measured_in_bucket": "yes" if measured else "no",
            "measured_by": {m: mechanisms[m].get("measured_by") for m in mechanism_ids},
        })
    return methods


def build_mechanisms(data, works, methods, citations):
    by_id = {w["id"]: w for w in works}
    implementing = collections.defaultdict(list)
    for method in methods:
        for mechanism_id in method["bucket_mechanisms"]:
            implementing[mechanism_id].append(method)
    out = []
    for row in data["mechanisms"]:
        if row["kind"] != "bucket-mechanism":
            continue
        best = []
        for method in implementing.get(row["id"], []):
            ids = method["typical_effect"]["work_ids"]
            confirmed = [w for w in ids if is_confirmed(by_id[w])]
            best.append({
                "method": method["method"],
                "work_id": (confirmed or ids or [None])[0],
            })
        unsourced = unsourced_parameters(row)
        out.append({
            "id": row["id"],
            "name": row["name"],
            "rule": row["rule"],
            "methods": [m["method"] for m in implementing.get(row["id"], [])],
            "best_supporting_works": best,
            "cited_works": citations.get(f"mechanisms:{row['id']}", []),
            "parameters_total": len(row.get("parameters") or []),
            "unsourced_parameters": unsourced,
            "doc_code_conflict": conflict_note(row),
            "measured_by": row.get("measured_by"),
            "measured": "yes" if is_measured(row) else "no",
            "formal": row.get("formal"),
            "topics": row.get("topics") or [],
            "internal_sources": normalise_sources(row.get("internal_sources")),
        })
    return out


def strip_boilerplate(text):
    return re.sub(r"^Abstract not retrievable.*?recorded\.\s*", "", text or "")


def is_verbatim(text):
    quoted = re.search(r"[\"“][^\"”]{12,}[\"”]", text or "")
    return bool(quoted) and "paraphrase" not in (text or "").lower()


def build_definitions(works, claims, links):
    lookup = resolver(works)
    by_work = {w["id"]: w for w in works}
    by_claim = {c["id"]: c for c in claims}
    rows = []
    for claim_id, meta in links["definitions"]["claims"].items():
        claim = by_claim[claim_id]
        rows.append({
            "term": meta["term"],
            "definition": claim["statement"],
            "verbatim": is_verbatim(claim["statement"]),
            "origin": "internal",
            "source_claim_id": claim_id,
            "source_work_id": claim["supports"][0] if claim["supports"] else None,
            "source_path": claim["internal_sources"][0]["path"] if claim["internal_sources"] else None,
            "tradition": meta["tradition"],
            "claim_status": claim["status"],
                "work_verification": None,
        })
    for ref, meta in links["definitions"]["works"].items():
        work = by_work[lookup[ref]]
        rows.append({
            "term": meta["term"],
            "definition": strip_boilerplate(work["finding"]),
            "verbatim": is_verbatim(work["finding"]),
            "origin": "literature",
            "source_claim_id": None,
            "source_work_id": work["id"],
            "source_path": None,
            "tradition": meta["tradition"],
            "claim_status": None,
                "work_verification": work["verification"],
        })
    rows.sort(key=lambda r: (TERMS.index(r["term"]), r["origin"], r["source_claim_id"] or r["source_work_id"]))
    return rows


def founder_topic_counts(works, methods, links):
    method_works = {w for m in methods for w in m["typical_effect"]["work_ids"]}
    counts = {}
    for name, tags in links["founder_topics"].items():
        total = 0
        confirmed = 0
        for work in works:
            tagged = bool(set(work["topics"]) & set(tags))
            if name == "methods":
                tagged = tagged or work["id"] in method_works
            if tagged:
                total += 1
                confirmed += 1 if is_confirmed(work) else 0
        counts[name] = {"works": total, "confirmed": confirmed}
    return counts


def tag_counts(works):
    counts = collections.defaultdict(lambda: {"works": 0, "confirmed": 0})
    for work in works:
        for tag in work["topics"]:
            counts[tag]["works"] += 1
            counts[tag]["confirmed"] += 1 if is_confirmed(work) else 0
    return dict(sorted(counts.items()))


def run_checks(corpus_dir):
    corpus_dir = Path(corpus_dir)
    works = read_jsonl(corpus_dir / "works.jsonl")
    claims = read_jsonl(corpus_dir / "claims.jsonl")
    methods = read_jsonl(corpus_dir / "methods.jsonl")
    definitions = read_jsonl(corpus_dir / "definitions.jsonl")
    mechanisms = read_jsonl(corpus_dir / "mechanisms.jsonl")
    links = json.loads(LINKS.read_text(encoding="utf-8"))
    work_ids = [w["id"] for w in works]
    known = set(work_ids)
    by_id = {w["id"]: w for w in works}
    failures = []
    dangling = sorted({
        f"{c['id']} -> {w}" for c in claims
        for w in c["supports"] + c["contradicted_by"] + c["related_gap_works"] if w not in known
    })
    if dangling:
        failures.append(f"supports ids missing from works: {dangling[:5]}")
    repeated = [w for w, n in collections.Counter(work_ids).items() if n > 1]
    if repeated:
        failures.append(f"work ids repeated: {repeated[:5]}")
    seen_doi = collections.Counter(doi_key(w["doi_or_url"]) for w in works if doi_key(w["doi_or_url"]))
    doubled = [d for d, n in seen_doi.items() if n > 1]
    if doubled:
        failures.append(f"DOIs on more than one work: {doubled[:5]}")
    seen_title = collections.Counter(
        (fold(w["title"]), first_surname(w["authors"]), w["year"]) for w in works if w["title"]
    )
    twins = [t for t, n in seen_title.items() if n > 1]
    if twins:
        failures.append(f"title, author and year on more than one work: {twins[:5]}")
    for claim in claims:
        if claim["status"] not in STATUSES:
            failures.append(f"{claim['id']} has unknown status {claim['status']}")
        if claim["status"] in ("backed", "backed-weak") and not claim["supports"]:
            failures.append(f"{claim['id']} is {claim['status']} with no work")
        if claim["status"] == "backed" and not any(
            is_confirmed(by_id[w]) and not by_id[w]["contested"] for w in claim["supports"] if w in by_id
        ):
            failures.append(f"{claim['id']} is backed with no confirmed work")
        if claim["status"] == "contradicted-by-evidence" and not claim["contradicted_by"]:
            failures.append(f"{claim['id']} is contradicted with no work linked")
        if claim["status"] == "proved" and not claim["formal"]:
            failures.append(f"{claim['id']} is proved with no Lean reference")
    mechanism_ids = {m["id"] for m in mechanisms}
    for method in methods:
        for work_id in method["typical_effect"]["work_ids"]:
            if work_id not in known:
                failures.append(f"method {method['method']} names missing work {work_id}")
        for mechanism_id in method["bucket_mechanisms"]:
            if mechanism_id not in mechanism_ids:
                failures.append(f"method {method['method']} names missing mechanism {mechanism_id}")
    claim_ids = {c["id"] for c in claims}
    for row in definitions:
        if row["term"] not in TERMS:
            failures.append(f"definition has unknown term {row['term']}")
        if row["source_work_id"] and row["source_work_id"] not in known:
            failures.append(f"definition names missing work {row['source_work_id']}")
        if row["source_claim_id"] and row["source_claim_id"] not in claim_ids:
            failures.append(f"definition names missing claim {row['source_claim_id']}")
    if len(methods) != 32:
        failures.append(f"methods count is {len(methods)}, expected 32")
    if len(mechanisms) != 39:
        failures.append(f"mechanisms count is {len(mechanisms)}, expected 39")
    return {
        "failures": failures,
        "works": len(works),
        "claims": len(claims),
        "methods": len(methods),
        "definitions": len(definitions),
        "mechanisms": len(mechanisms),
        "status_counts": {s: sum(1 for c in claims if c["status"] == s) for s in STATUSES},
        "verification_counts": {
            v: sum(1 for w in works if w["verification"] == v) for v in VERIFICATION_RANK
        },
        "tag_counts": tag_counts(works),
        "founder_topics": founder_topic_counts(works, methods, links),
        "definition_counts": {
            t: sum(1 for d in definitions if d["term"] == t) for t in TERMS
        },
    }


def write_sqlite(corpus_dir, tables, abstracts):
    path = Path(corpus_dir) / SQLITE_NAME
    if path.exists():
        path.unlink()
    db = sqlite3.connect(path)
    for name, rows in tables.items():
        columns = list(rows[0].keys())
        if name == "works":
            columns.append("abstract_text")
        db.execute(f"CREATE TABLE {name} ({', '.join(f'\"{c}\"' for c in columns)})")
        for row in rows:
            values = []
            for column in columns:
                if column == "abstract_text":
                    value = abstracts.get(row["id"])
                else:
                    value = row[column]
                if isinstance(value, (list, dict, bool)):
                    value = json.dumps(value, ensure_ascii=False)
                values.append(value)
            db.execute(f"INSERT INTO {name} VALUES ({', '.join('?' for _ in columns)})", values)
    db.execute(
        "CREATE VIRTUAL TABLE works_fts USING fts5(id UNINDEXED, title, authors, venue, finding, abstract, topics)"
    )
    db.execute(
        "INSERT INTO works_fts SELECT id, title, authors, venue, finding, abstract_text, topics FROM works"
    )
    db.execute("CREATE VIRTUAL TABLE claims_fts USING fts5(id UNINDEXED, name, statement, topics)")
    db.execute("INSERT INTO claims_fts SELECT id, name, statement, topics FROM claims")
    db.commit()
    db.execute("VACUUM")
    db.close()
    return path.stat().st_size


def cell(text):
    return re.sub(r"\s+", " ", str(text if text is not None else "")).replace("|", "/").strip()


def possible_duplicates(works):
    by_author = collections.defaultdict(list)
    for work in works:
        surname = first_surname(work["authors"])
        if surname and work["title"] and work["year"]:
            by_author[surname].append(work)
    pairs = []
    for group in by_author.values():
        for i, left in enumerate(group):
            for right in group[i + 1:]:
                if abs(left["year"] - right["year"]) > 1:
                    continue
                if is_confirmed(left) and is_confirmed(right):
                    continue
                a, b = set(fold(left["title"]).split()), set(fold(right["title"]).split())
                if len(a & b) / min(len(a), len(b)) >= 0.7 and len(a & b) >= 3:
                    pairs.append(tuple(sorted((left["id"], right["id"]))))
    return sorted(pairs)


def write_gaps(corpus_dir, works, claims, methods, definitions, data, loose, matched_loosely, links, summary):
    by_id = {w["id"]: w for w in works}
    lookup = resolver(works)
    lines = ["<!-- voice-ignore-file: lists paper titles and effect statements as their sources give them -->", ""]
    lines += ["# Learning Corpus Gaps", ""]
    lines += ["A confirmed work has a DOI or page that someone checked against the record and is not withdrawn.", ""]
    lines += ["## Founder Topics", "", "| Topic | Works | Confirmed | Under five |", "|---|---|---|---|"]
    for name, count in summary["founder_topics"].items():
        flag = "yes" if count["confirmed"] < 5 else "no"
        lines.append(f"| {name} | {count['works']} | {count['confirmed']} | {flag} |")
    lines += ["", "## Topic Tags Under Five Confirmed Works", ""]
    thin_tags = [f"- {tag}: {c['confirmed']} of {c['works']}" for tag, c in summary["tag_counts"].items() if c["confirmed"] < 5]
    lines += thin_tags or ["Every tag holds five or more."]
    lines += ["", "## Methods Under Five Confirmed Works", "", "| Method | Confirmed | Mechanisms in Bucket | Measured |", "|---|---|---|---|"]
    for method in methods:
        if method["confirmed_works"] < 5:
            lines.append(
                f"| {method['method']} | {method['confirmed_works']} | {len(method['bucket_mechanisms'])} | {method['measured_in_bucket']} |"
            )
    lines += ["", "## Weak Ideas", "", "Ideas a gap-fill work marks as weakly supported, with the internal claims that assert them.", ""]
    lines += ["| Idea | Internal claims | Works |", "|---|---|---|"]
    for entry in links["weak_ideas"]:
        held = ", ".join(entry["claims"]) or "none held"
        cited = ", ".join(lookup[ref] for ref in entry["works"])
        lines.append(f"| {entry['idea']} | {held} | {cited} |")
    lines += ["", "## Claims Contradicted Internally", ""]
    for claim in claims:
        if claim["status"] == "contradicted-internally":
            lines.append(f"- `{claim['id']}`: {cell(claim['name'])}")
    lines += ["", "## Unbacked Claims", ""]
    for claim in claims:
        if claim["status"] == "unbacked":
            found = ""
            if claim["related_gap_works"]:
                found = " Gap fill found: " + ", ".join(claim["related_gap_works"]) + "."
            lines.append(f"- `{claim['id']}` ({claim['kind']}): {cell(claim['name'])}.{found}")
    lines += ["", "## Effect Conflicts", "", "Two inventories state an effect for the same work and share no number.", ""]
    for work in works:
        if work["effect_conflict"]:
            lines.append(f"- `{work['id']}`")
            for entry in work["effect"]:
                lines.append(f"  - {entry['inventory']} ({entry['source']}): {cell(entry['value'])}")
    lines += ["", "## Unconfirmed Works", ""]
    for state in ("record-has-doi", "unconfirmed"):
        rows = [w for w in works if w["verification"] == state]
        lines += [f"### {state}", "", f"{len(rows)} works.", ""]
        for work in rows:
            lines.append(f"- `{work['id']}`: {cell(work['title']) or cell(work['doi_or_url'])}")
        lines.append("")
    withdrawn = [w for w in works if w["withdrawn"]]
    lines += ["## Possible Duplicates", "", "Same first author, years one apart at most, most title words shared, one side unconfirmed. The build keeps them apart.", ""]
    pairs = possible_duplicates(works)
    lines += [f"- `{a}` and `{b}`" for a, b in pairs] or ["None."]
    lines += ["", "## Withdrawn Works", ""]
    lines += [f"- `{w['id']}`: {cell(w['title'])}" for w in withdrawn] or ["None."]
    lines += ["", "## Enrichment Mismatches", "", "OpenAlex returned a different title for the identifier, or no record.", ""]
    for row in data["literature"]:
        if row.get("enrichment") != "ok":
            work_id = lookup[f"literature:{row['id']}"]
            lines.append(
                f"- `{work_id}`: {row.get('enrichment')}, title match {row.get('title_match')}, identifier {cell(row.get('doi_or_url')) or 'none'}"
            )
    lines += ["", "## Citations Matched on Author and Year", "", "The internal citation gave no title, and one work in the corpus shares its first author and year.", ""]
    lines += [
        f"- `{m['cited_by']}` cites {cell(m['authors'])} {m['year']}, matched to `{m['work']}`" for m in matched_loosely
    ] or ["None."]
    lines += ["", "## Citations With No Work", "", "The internal citation names no title and no link, so no record was made.", ""]
    empty = True
    for claim_id, entries in sorted(loose.items()):
        for entry in entries:
            empty = False
            label = " ".join(str(v) for v in (entry["authors"], entry["year"]) if v) or "no author or year"
            lines.append(f"- `{claim_id}`: {cell(label)}")
    if empty:
        lines.append("None.")
    lines += ["", "## Definitions Missing", ""]
    for term in TERMS:
        for origin in ("internal", "literature"):
            if not any(d["term"] == term and d["origin"] == origin for d in definitions):
                lines.append(f"- {term}: no {origin} definition held")
    paraphrased = sum(1 for d in definitions if not d["verbatim"])
    lines.append(f"- {paraphrased} of {len(definitions)} definitions are paraphrases with no checked quotation")
    lines += ["", "## Open Questions", ""]
    for inventory in CLAIM_INVENTORIES:
        for row in data[inventory]:
            if row["kind"] == "open-question":
                lines.append(f"- `{inventory}:{row['id']}`: {cell(row['statement'])}")
    (Path(corpus_dir) / "gaps.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def write_readme(corpus_dir, summary, import_note):
    status = ", ".join(f"{name} {count}" for name, count in summary["status_counts"].items())
    founder = ", ".join(f"{name} {count['confirmed']}" for name, count in summary["founder_topics"].items())
    tags = ", ".join(f"{tag} {count['works']}" for tag, count in summary["tag_counts"].items())
    states = summary["verification_counts"]
    text = f"""# Learning Corpus

One index of the research Bucket holds on learning: the works cited, the internal claims that cite them, the methods, the definitions and the mechanisms in the app.

## Files

| File | Records | Holds |
|---|---|---|
| `works.jsonl` | {summary['works']} | One record per cited work |
| `claims.jsonl` | {summary['claims']} | Internal claims with status and supporting works |
| `methods.jsonl` | {summary['methods']} | Methods joined to works, claims and mechanisms |
| `definitions.jsonl` | {summary['definitions']} | Five terms, internal beside literature |
| `mechanisms.jsonl` | {summary['mechanisms']} | Bucket mechanisms joined to methods, parameters and measures |
| `gaps.md` | | Thin topics, unbacked claims, conflicts and unconfirmed works |
| `sources/` | | The inventories the build reads |

## Counts

- Claims by status: {status}.
- Works by verification: {', '.join(f'{k} {v}' for k, v in states.items())}.
- Confirmed works by founder topic: {founder}.
- Works by topic tag: {tags}.

A founder topic groups the tags `links.json` lists. The methods topic adds every work the methods table cites.

## Build

`tools/learning-corpus/build.py` reads `sources/` and writes every file here. Works merge on normalised DOI, then on normalised title with first author and year; a short title contained in a longer one counts as the same title. A claim's `supports` come from its `cited_works` alone. `links.json` beside the script holds the hand-made joins: weak ideas with their claims, definition terms with traditions, method aliases, topic groups.

```
python3 tools/learning-corpus/build.py
python3 -m unittest tools/learning-corpus/test_build.py
```

`--import <folder>` refreshes `sources/` first. Open questions and dataset rows get no claim record.

## Verification States

- `doi-confirmed`: the DOI resolved at Crossref or OpenAlex and the title matched.
- `url-confirmed`: a catalogue, publisher or OpenAlex page matched the record.
- `record-has-doi`: a DOI is on file, unchecked.
- `unconfirmed`: no checked identifier.

The first two states count as confirmed unless the work is withdrawn.

## Claim Statuses

- `backed`: one or more confirmed, uncontested works.
- `backed-weak`: every work is contested or unconfirmed.
- `unbacked`: no work.
- `contradicted-internally`: two Bucket files disagree.
- `contradicted-by-evidence`: a gap-fill work marks the idea as weakly supported; `contradicted_by` links it.
- `proved`: a Lean theorem, named in `formal`.

## Licence

Records and summaries are Bucket's own, under the repository licence. Abstracts come from OpenAlex and stay under their publishers' terms, so the build keeps them in `{ABSTRACTS_NAME}`, which git ignores; `works.jsonl` marks each work that has one. `{SQLITE_NAME}` is ignored too. {import_note}
"""
    (Path(corpus_dir) / "README.md").write_text(text, encoding="utf-8")
    return len(re.findall(r"\S+", text))


def load_sources():
    data = {}
    for name in INVENTORY_FILES:
        data[name] = read_jsonl(SOURCES / f"{name}.jsonl")
    data["literature"] = data.pop("literature-enriched")
    return data


def build():
    links = json.loads(LINKS.read_text(encoding="utf-8"))
    data = load_sources()
    works, citations, loose, matched_loosely = build_works(data)
    attach_claim_effects(works, data, citations)
    claims = build_claims(data, works, citations, loose, links)
    methods = build_methods(data, works, claims, links)
    mechanisms = build_mechanisms(data, works, methods, citations)
    definitions = build_definitions(works, claims, links)
    write_jsonl(CORPUS / "works.jsonl", works)
    write_jsonl(CORPUS / "claims.jsonl", claims)
    write_jsonl(CORPUS / "methods.jsonl", methods)
    write_jsonl(CORPUS / "definitions.jsonl", definitions)
    write_jsonl(CORPUS / "mechanisms.jsonl", mechanisms)
    lookup = resolver(works)
    abstracts = {}
    local = SOURCES / ABSTRACTS_NAME
    if local.exists():
        rows = []
        for row in read_jsonl(local):
            work_id = lookup.get(f"literature:{row['id']}")
            if work_id:
                abstracts[work_id] = row["abstract"]
                rows.append({"work_id": work_id, "source": "openalex", "abstract": row["abstract"]})
        write_jsonl(CORPUS / ABSTRACTS_NAME, sorted(rows, key=lambda r: r["work_id"]))
    summary = run_checks(CORPUS)
    dropped = sum(len(ids) for ids in links["excluded_personal"].values())
    import_note = f"The import leaves out {dropped} career-work dataset rows that describe private profiles and named people."
    write_gaps(CORPUS, works, claims, methods, definitions, data, loose, matched_loosely, links, summary)
    words = write_readme(CORPUS, summary, import_note)
    size = write_sqlite(
        CORPUS,
        {"works": works, "claims": claims, "methods": methods, "definitions": definitions, "mechanisms": mechanisms},
        abstracts,
    )
    summary["readme_words"] = words
    summary["sqlite_bytes"] = size
    summary["abstracts_local"] = len(abstracts)
    summary["abstracts_marked"] = sum(1 for w in works if w["abstract"])
    summary["effect_conflicts"] = sum(1 for w in works if w["effect_conflict"])
    return summary


def report(summary):
    print(f"works {summary['works']}  claims {summary['claims']}  methods {summary['methods']}  "
          f"definitions {summary['definitions']}  mechanisms {summary['mechanisms']}")
    print("claims by status:")
    for name, count in summary["status_counts"].items():
        print(f"  {name}: {count}")
    print("works by verification:")
    for name, count in summary["verification_counts"].items():
        print(f"  {name}: {count}")
    print("works by topic tag (confirmed of total):")
    for tag, count in summary["tag_counts"].items():
        print(f"  {tag}: {count['confirmed']} of {count['works']}")
    print("founder topics (confirmed of total):")
    for name, count in summary["founder_topics"].items():
        print(f"  {name}: {count['confirmed']} of {count['works']}")
    print("definitions by term:", summary["definition_counts"])
    print(f"effect conflicts: {summary['effect_conflicts']}")
    print(f"abstracts marked {summary['abstracts_marked']}, held locally {summary['abstracts_local']}")
    print(f"README words: {summary['readme_words']}")
    print(f"{SQLITE_NAME}: {summary['sqlite_bytes']} bytes")
    print("checks: every supports id exists in works; no work appears twice")
    if summary["failures"]:
        for failure in summary["failures"]:
            print("FAIL", failure)
    else:
        print("checks passed")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--import", dest="import_dir")
    args = parser.parse_args()
    if args.import_dir:
        links = json.loads(LINKS.read_text(encoding="utf-8"))
        for name, info in import_inventories(args.import_dir, links).items():
            print("import", name, info)
    summary = build()
    report(summary)
    return 1 if summary["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
