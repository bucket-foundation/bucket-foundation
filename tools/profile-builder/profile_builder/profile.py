import math
import re
from collections import Counter

from .sources import Item

BRANCHES = {
    "mathematics": ["theorem", "proof", "algebra", "lean", "graph", "matrix", "linear", "topology", "probability", "statistics", "optimization"],
    "physics": ["quantum", "physics", "energy", "particle", "thermodynamics", "optics", "photon", "field"],
    "chemistry": ["chemistry", "molecule", "protein", "reaction", "compound", "materials", "amyloid"],
    "information": ["algorithm", "software", "data", "ai", "llm", "model", "agent", "retrieval", "embedding", "compute", "api", "protocol", "blockchain", "x402"],
    "biophysics": ["biology", "cell", "mitochondria", "longevity", "health", "circadian", "biophysics", "dna"],
    "cosmology": ["cosmology", "universe", "astronomy", "galaxy", "cmb", "gravity"],
    "mind": ["learning", "education", "cognition", "knowledge", "teaching", "curriculum", "philosophy", "mind", "student"],
    "earth": ["climate", "fishing", "ocean", "agriculture", "earth", "geography", "country"],
}
STOP = set("""the a an and or of to in for on with by is are be as at this that it from your you we our can will not
use using used all any more one two new each into how what when which who also than then there their its
them they these those if else get set run make file files code md json true false null none yes see
http https www com org io github readme license mit bucket foundation agfarms claude agents never next dev admin src curl user password read about docs build committed banned wed sep oct aug jul jun mon tue thu fri sat sun jan feb mar apr may nov dec open work tier cards card figure figures api npm bash sign menu home back click page log login signup view share copy link""".split())
TOKEN = re.compile(r"[a-z][a-z0-9+#-]{2,}")

def tokens(text: str) -> list[str]:
    return [t for t in TOKEN.findall(text.lower()) if t not in STOP]

def strip_boilerplate(items: list[Item], max_share: float = 0.2) -> list[str]:
    line_df: Counter = Counter()
    split = [[l.strip() for l in re.split(r"[\n.|]", it.text) if l.strip()] for it in items]
    for lines in split:
        line_df.update(set(lines))
    limit = max(2, int(max_share * len(items)))
    return [it.title + " " + " ".join(l for l in lines if line_df[l] <= limit) for it, lines in zip(items, split)]

def top_terms(items: list[Item], k: int = 40, max_doc_share: float = 0.4) -> list[tuple[str, float]]:
    df: Counter = Counter()
    tf: Counter = Counter()
    n = max(len(items), 1)
    for text in strip_boilerplate(items):
        toks = tokens(text)
        tf.update(toks)
        df.update(set(toks))
    scored = {t: c * math.log(1 + n / df[t]) for t, c in tf.items() if (df[t] >= 2 or n < 5) and df[t] <= max_doc_share * n}
    return sorted(scored.items(), key=lambda kv: -kv[1])[:k]

def branch_scores(items: list[Item]) -> dict[str, float]:
    counts = Counter()
    for it in items:
        toks = Counter(tokens(it.title + " " + it.text))
        for b, words in BRANCHES.items():
            counts[b] += sum(toks[w] for w in words)
    total = sum(counts.values()) or 1
    return {b: round(counts[b] / total, 4) for b in BRANCHES}

def skills(items: list[Item]) -> list[tuple[str, int]]:
    langs = Counter(it.meta.get("language") for it in items if it.meta.get("language"))
    return langs.most_common()

def build(person: dict, items: list[Item]) -> dict:
    usable = [it for it in items if it.text.strip()]
    return {
        "person": person,
        "counts": {"items": len(items), "usable": len(usable), "by_source": dict(Counter(it.source for it in items))},
        "branches": branch_scores(usable),
        "interests": [{"term": t, "weight": round(w, 2)} for t, w in top_terms(usable)],
        "skills": [{"language": l, "repos": c} for l, c in skills(items)],
        "evidence": [{"source": it.source, "url": it.url, "title": it.title, **{k: v for k, v in it.meta.items() if k in ("kind", "language", "stars", "pushed", "year")}} for it in items],
        "errors": [{"url": it.url, "error": e} for it in items for e in ([it.meta["error"]] if it.meta.get("error") else []) + list(it.meta.get("errors") or [])],
    }
