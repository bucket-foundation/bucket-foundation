import collections
import json
import os
import re
import subprocess
import unicodedata
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
PACKAGE = os.path.dirname(HERE)
REPO = os.path.abspath(os.path.join(PACKAGE, "..", "..", ".."))
OUT = os.path.join(PACKAGE, "tables")
CORPUS = os.path.join(REPO, "learning", "corpus", "progressions", "tables")
DECKS = os.path.join(REPO, "learning", "app", "corpus")
SCHEMA = "bucket.alignment/1"
LEVELS = [
    "early", "primary", "lower-secondary", "upper-secondary", "undergraduate-lower",
    "undergraduate-upper", "graduate", "professional-entry", "professional-advanced",
]
LEVEL_RANK = {name: i for i, name in enumerate(LEVELS)}
MATCHES = ["exact", "broader", "narrower", "related", "prerequisite-of", "none"]
LEVEL_MATCHES = {"exact", "broader", "narrower"}
TIGHT_MATCHES = {"exact", "narrower"}
EDGE_TYPES = {"prerequisite", "prerequisite_or_concurrent", "recommended_prerequisite"}
STOPWORDS = {
    "a", "an", "the", "of", "and", "to", "in", "for", "on", "with", "i", "ii", "iii", "iv", "introduction",
    "introductory", "intro", "basic", "elementary", "advanced", "general", "principles", "fundamentals",
    "topics", "special", "seminar", "lab", "laboratory", "s",
}
COURSE_CODE = re.compile(
    r"^(.*?\b(?:[A-Z]{2,6} ?\d{2,5}[A-Z]{0,2}|\d{1,2}\.[0-9A-Z]{2,5}|Part I[IAB]*)\b)\s+(.+)$"
)
GENERIC_STEMS = {
    "physi", "chemi", "mathe", "biolo", "scien", "princ", "theor", "metho", "appli", "topic", "studi", "cours",
    "syste", "found", "eleme", "colle", "unive", "moder", "resea", "pract", "conce", "probl", "techn", "part",
    "unit", "lectu", "chapt", "handb", "honor", "major", "engin", "analy", "model", "struc", "proce", "prope",
}
STEM = 5
ACCEPTED_MATCHES = {"exact", "broader", "narrower", "prerequisite-of"}
STATUS = "unreviewed-proposal"
CONJUNCTION = re.compile(r"\band\b|[,;&/]")
OPEN_LICENCE = re.compile(r"^(CC0|CC BY|Public domain|MIT$|GNU |Free Documentation License|Copyright SEP, free to read)")
CLOSED_REGISTRY = {"unknown", "restricted"}


def read_zst(path):
    proc = subprocess.Popen(["zstd", "-dc", path], stdout=subprocess.PIPE)
    for line in proc.stdout:
        yield json.loads(line)
    proc.wait()


def read_jsonl(path):
    if path.endswith(".zst"):
        yield from read_zst(path)
        return
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=False) + "\n")


def stems(text):
    return frozenset(t[:STEM] for t in tokens(text)) - GENERIC_STEMS


def lexical_check(title, statement, label, kind):
    label_stems = stems(label)
    if not label_stems:
        return False, "label-generic"
    if kind == "topic":
        return bool(stems(title) & label_stems), "title-term-in-label"
    return label_stems <= stems(f"{title} {statement}"), "label-terms-in-statement"


def in_band(rule, level):
    if level not in LEVEL_RANK:
        return False
    return LEVEL_RANK[rule["level_from"][0]] <= LEVEL_RANK[level] <= LEVEL_RANK[rule["level_to"][0]]


def deck_fields(path=None):
    rules = collections.defaultdict(lambda: {"cip": [], "field": [], "level_from": [], "level_to": []})
    with open(path or os.path.join(HERE, "deck_fields.tsv"), encoding="utf-8") as handle:
        next(handle)
        for line in handle:
            deck, kind, value = line.rstrip("\n").split("\t")
            rules[deck][kind].append(value)
    return dict(rules)


def in_field(rule, cip_code, field):
    if field and field in rule["field"]:
        return True
    return bool(cip_code) and any(cip_code.startswith(prefix) for prefix in rule["cip"])


def load_atoms():
    index = json.load(open(os.path.join(DECKS, "index.json"), encoding="utf-8"))
    atoms = []
    for entry in index["decks"]:
        if entry.get("kind") == "language":
            continue
        deck = json.load(open(os.path.join(DECKS, os.path.basename(entry["file"])), encoding="utf-8"))
        branch = deck["meta"]["branch"]
        deck_title = re.split(r"\s+[—–-]\s+", deck["meta"]["title"])[0]
        for atom in deck["atoms"]:
            atoms.append({
                "atom": f"atom:{branch}/{atom['id']}",
                "deck": branch,
                "slug": atom["id"],
                "title": atom["title"],
                "summary": atom.get("summary") or "",
                "statement": " ".join(filter(None, [
                    atom.get("summary"), *(atom.get("depths") or {}).values(), atom.get("note"), atom.get("lesson"),
                ])),
                "deck_title": deck_title,
                "requires": list(atom.get("requires") or []),
            })
    return atoms


def atom_text(atom):
    return f"{atom['title']}. {atom['summary']} Deck: {atom['deck_title']}."


def split_label(topic):
    head, sep, tail = topic.partition(": ")
    if sep and re.search(r"\d", head) and len(head) <= 40:
        return tail, False
    found = COURSE_CODE.match(topic)
    if found:
        return found.group(2), True
    return topic, False


def row_label(table, row):
    if table == "courses":
        return row["title"], "course"
    if row.get("slice") == "k12-full":
        return row.get("subfield") or "", "strand"
    label, is_course = split_label(row.get("topic") or "")
    return label, "course" if is_course else "topic"


def row_text(table, row):
    label, kind = row_label(table, row)
    subfield = row.get("subfield")
    if kind != "strand" and table == "progression" and subfield and subfield.lower() not in label.lower():
        return f"{label} ({subfield})"
    return label


def tokens(text):
    plain = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    out = set()
    for word in re.findall(r"[a-z0-9]+", plain):
        if word in STOPWORDS:
            continue
        if len(word) > 3 and word.endswith("s") and not word.endswith(("ss", "is", "us")):
            word = word[:-1]
        out.add(word)
    return frozenset(out)


def relation(atom_title, label, kind):
    atom_tokens, label_tokens = tokens(atom_title), tokens(label)
    if atom_tokens and atom_tokens == label_tokens:
        return "exact", "equal-tokens"
    if kind == "course":
        return "broader", "course-title"
    if kind == "strand":
        return "broader", "strand-heading"
    if label_tokens and label_tokens < atom_tokens:
        return "broader", "label-inside-atom-title"
    if atom_tokens and atom_tokens < label_tokens:
        if CONJUNCTION.search(label):
            return "broader", "label-lists-several"
        return "narrower", "atom-title-inside-label"
    return "related", "embedding-only"


def thresholds(path=None):
    return json.load(open(path or os.path.join(HERE, "threshold.json"), encoding="utf-8"))


def accepts(score, level, limits):
    school = level in LEVEL_RANK and LEVEL_RANK[level] <= LEVEL_RANK["upper-secondary"]
    return score >= (limits["school_threshold"] if school else limits["threshold"])


def licence_linkable(licence, registry_licence=None):
    if registry_licence is not None and registry_licence.lower() in CLOSED_REGISTRY:
        return False
    return bool(licence) and bool(OPEN_LICENCE.match(licence))


def host_of(url):
    return (urlparse(url or "").hostname or "").lower()


def registry_by_host():
    out = {}
    for row in read_jsonl(os.path.join(CORPUS, "source_licences.jsonl")):
        for host in (row.get("match") or {}).get("host") or []:
            out[host.lower()] = row["licence"]
    return out


def cip_family(code):
    if not code:
        return None
    return code[:5] if len(code) >= 5 else code


def stated_edges():
    forward = collections.defaultdict(set)
    for edge in read_jsonl(os.path.join(CORPUS, "edges.jsonl.zst")):
        if edge["type"] in EDGE_TYPES and edge["stated"] and not edge["external"] and edge["src"]:
            forward[edge["src"]].add(edge["dst"])
    return forward


def reachable(forward, start, limit=100000):
    seen, stack = set(), [start]
    while stack and len(seen) < limit:
        node = stack.pop()
        for nxt in forward.get(node, ()):
            if nxt not in seen and nxt != start:
                seen.add(nxt)
                stack.append(nxt)
    return seen


def edge_queue(forward_pairs, reverse_pairs):
    if forward_pairs and reverse_pairs:
        return "review-second"
    if reverse_pairs:
        return "review-first"
    if forward_pairs:
        return "review-later"
    return "no-corpus-path"


def level_summary(rows):
    weights = collections.Counter()
    counts = collections.Counter()
    for row in rows:
        if row["match"] in LEVEL_MATCHES and row.get("level") in LEVEL_RANK:
            weights[row["level"]] += row["score"]
            counts[row["level"]] += 1
    if not counts:
        return None
    ordered = sorted(counts, key=LEVEL_RANK.get)
    mode = max(ordered, key=lambda name: (round(weights[name], 6), -LEVEL_RANK[name]))
    tight = [r["level"] for r in rows if r["match"] in TIGHT_MATCHES and r.get("level") in LEVEL_RANK]
    return {
        "level": mode,
        "level_first": ordered[0],
        "level_last": ordered[-1],
        "spread": LEVEL_RANK[ordered[-1]] - LEVEL_RANK[ordered[0]],
        "levels": {name: counts[name] for name in ordered},
        "level_schema_rule": min(tight, key=LEVEL_RANK.get) if tight else None,
        "rows": sum(counts.values()),
    }


def load_alignments(path=None):
    return list(read_jsonl(path or os.path.join(OUT, "alignments.jsonl")))
