import json
import re

from common import REPO, Row, keyword_fill, report, slug

PROBLEM_MAP = REPO / "_intake" / "solver-gap-engine" / "problem_map.jsonl"
SOURCE = "https://github.com/google-deepmind/formal-conjectures"
LICENCE = "Apache-2.0"
AMS = {
    "03": "logic", "05": "combinatorics", "11": "number theory", "12": "field theory", "13": "commutative algebra",
    "14": "algebraic geometry", "15": "linear algebra", "16": "associative rings", "17": "nonassociative rings",
    "18": "category theory", "19": "K-theory", "20": "group theory", "22": "topological groups", "26": "real functions",
    "28": "measure theory", "30": "complex analysis", "31": "potential theory", "32": "several complex variables",
    "33": "special functions", "34": "ordinary differential equations", "35": "partial differential equations",
    "37": "dynamical systems", "39": "difference equations", "40": "sequences and series", "41": "approximation",
    "42": "harmonic analysis", "43": "abstract harmonic analysis", "44": "integral transforms", "45": "integral equations",
    "46": "functional analysis", "47": "operator theory", "49": "calculus of variations", "51": "geometry",
    "52": "convex geometry", "53": "differential geometry", "54": "general topology", "55": "algebraic topology",
    "57": "manifolds", "58": "global analysis", "60": "probability", "62": "statistics", "65": "numerical analysis",
    "68": "computer science", "70": "mechanics", "74": "deformable solids", "76": "fluid mechanics", "78": "optics",
    "80": "thermodynamics", "81": "quantum theory", "82": "statistical mechanics", "83": "relativity",
    "85": "astrophysics", "86": "geophysics", "90": "operations research", "91": "game theory", "92": "biology",
    "93": "systems theory", "94": "information theory", "97": "mathematics education",
}
FAMILY = {
    "ErdosProblems": "Erdős problem",
    "GreensOpenProblems": "Green open problem",
    "WrittenOnTheWallII": "Written on the Wall II problem",
    "OpenQuantumProblems": "Open quantum problem",
}


def name_of(identifier):
    path, decl = identifier.split("::", 1)
    family, stem = path.split("/", 1)
    stem = stem[:-5] if stem.endswith(".lean") else stem
    base, _, variant = decl.partition(".variants.")
    if family in FAMILY:
        label = f"{FAMILY[family]} {stem.replace('/', ' ')}"
    else:
        words = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", stem.split("/")[-1]).replace("_", " ")
        label = words[:1].upper() + words[1:]
    if variant:
        label += ", variant " + variant.replace("_", " ").replace(".", " ")
    elif "." in base and not base.endswith(stem.lower().replace("/", "_")):
        tail = base.rsplit(".", 1)[-1]
        if tail not in {"statement", "conjecture", "theorem"} and not re.fullmatch(r"[a-z]+_\d+", tail):
            label += ", " + tail.replace("_", " ")
    return family, label, bool(variant)


def rows():
    out = []
    with PROBLEM_MAP.open(encoding="utf8") as handle:
        for line in handle:
            item = json.loads(line)
            family, name, is_variant = name_of(item["id"])
            level = 5 if family == "Millennium" else 2 if is_variant else 3
            branch = "physics" if family == "OpenQuantumProblems" else "mathematics"
            keywords = [AMS[c] for c in item.get("ams", []) if c in AMS]
            keywords = keyword_fill(keywords, re.sub(r"\$[^$]*\$", " ", item["text"]), (FAMILY.get(family, family).lower(), branch, item["status"], "formal conjectures"))
            out.append(
                Row(
                    id="fc-" + slug(item["id"].replace(".lean::", "-").replace(".variants.", "-")),
                    name=name,
                    branch=branch,
                    level=level,
                    status=item["status"],
                    source=f"{SOURCE}/blob/main/FormalConjectures/{item['id'].split('::')[0]}",
                    licence=LICENCE,
                    keywords=keywords,
                    lean="proved" if item.get("lean_proof") else "statement",
                )
            )
    report("formal-conjectures", out)
    return out
