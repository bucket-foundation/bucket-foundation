import json
import re

from common import REPO, Row, form_of, keywords_from, posed_year, report, resolved_year, slug

PROBLEM_MAP = REPO / "_intake" / "solver-gap-engine" / "problem_map.jsonl"
LEAN_ROOT = REPO / "_intake" / "solver-gap-engine" / "fc" / "FormalConjectures"
SOURCE = "https://github.com/google-deepmind/formal-conjectures"
LICENCE = "Apache-2.0"
STATUS_SOURCE = "formal-conjectures status field in problem_map.jsonl"
FAMILY = {
    "ErdosProblems": "Erdős problem",
    "GreensOpenProblems": "Green open problem",
    "WrittenOnTheWallII": "Written on the Wall II problem",
    "OpenQuantumProblems": "Open quantum problem",
}
DROP_PARTS = {"variants", "parts", "statement", "conjecture", "theorem"}


def name_of(identifier):
    path, decl = identifier.split("::", 1)
    family, stem = path.split("/", 1)
    stem = stem[:-5] if stem.endswith(".lean") else stem
    leaf = stem.split("/")[-1]
    if family == "OEIS":
        label = f"OEIS A{leaf}"
    elif family in FAMILY:
        label = f"{FAMILY[family]} {stem.replace('/', ' ')}"
    else:
        words = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", leaf).replace("_", " ")
        label = words[:1].upper() + words[1:]
    parts = [p.strip(":") for p in re.split(r"[._]", decl)]
    snake = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", leaf).lower().split("_")
    while parts and (parts[0].lower() in snake or re.fullmatch(r"[a-z]+", parts[0]) and parts[0] in {"erdos", "green", "wotw", "oqp", "open", "quantum", "problem"} or re.fullmatch(r"\d+", parts[0]) and parts[0] in snake):
        parts.pop(0)
    tail = " ".join(p for p in parts if p and p.lower() not in DROP_PARTS and p != leaf)
    return family, label + (f", {tail}" if tail else ""), bool(tail)


def lean_statement(path, decl):
    file = LEAN_ROOT / path
    if not file.exists():
        return ""
    lines = file.read_text(encoding="utf8").split("\n")
    pattern = re.compile(r"^\s*(theorem|lemma|def|abbrev)\s+" + re.escape(decl.split(".")[-1]) + r"\b")
    for i, line in enumerate(lines):
        if pattern.match(line) or re.match(r"^\s*(theorem|lemma|def|abbrev)\s+" + re.escape(decl) + r"\b", line):
            block = []
            for later in lines[i:]:
                block.append(later.strip())
                if ":=" in later:
                    break
            return " ".join(block)
    return ""


def rows():
    out = []
    with PROBLEM_MAP.open(encoding="utf8") as handle:
        for line in handle:
            item = json.loads(line)
            path, decl = item["id"].split("::", 1)
            family, name, is_variant = name_of(item["id"])
            branch = "physics" if family == "OpenQuantumProblems" else "mathematics"
            text = item["text"].strip()
            if text:
                statement, statement_source = text, str(PROBLEM_MAP.relative_to(REPO))
            else:
                statement, statement_source = lean_statement(path, decl), f"{SOURCE}/blob/main/FormalConjectures/{path}"
            if not statement:
                statement, statement_source = f"Lean declaration {decl} in {path}", f"{SOURCE}/blob/main/FormalConjectures/{path}"
            prose = re.sub(r"\$[^$]*\$", " ", statement)
            row_id = "fc-" + slug(item["id"].replace(".lean::", "-").replace(".variants.", "-"))
            file_id = "fc-" + slug(path[:-5] if path.endswith(".lean") else path)
            out.append(
                Row(
                    id=row_id,
                    name=name,
                    branch=branch,
                    form=form_of(name, prose, is_variant),
                    variant_of=file_id if is_variant else "",
                    status=item["status"],
                    source=f"{SOURCE}/blob/main/FormalConjectures/{path}",
                    licence=LICENCE,
                    keywords=keywords_from(prose, name=name),
                    lean="proved" if item.get("lean_proof") else "statement",
                    posed=posed_year(prose),
                    resolved=resolved_year(prose) if item["status"] == "solved" else "",
                    statement=statement,
                    statement_source=statement_source,
                    status_source=STATUS_SOURCE,
                )
            )
    parents = {}
    for row in out:
        if not row.variant_of:
            parents.setdefault("fc-" + slug(row.source.split("FormalConjectures/")[1][:-5]), row.id)
    for row in out:
        if row.variant_of and row.variant_of not in parents:
            parents[row.variant_of] = row.id
            row.variant_of = ""
            row.form = form_of(row.name, row.statement)
    for row in out:
        if row.variant_of:
            row.variant_of = parents[row.variant_of]
    report("formal-conjectures", out)
    return out
