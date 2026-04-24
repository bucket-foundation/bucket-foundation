"""Canon scoring: simple, explainable heuristic."""
from __future__ import annotations
from datetime import datetime

FOUNDATIONAL_VENUES = {
    "nature", "science", "pnas", "proceedings of the national academy of sciences",
    "cell", "new england journal of medicine", "nejm", "the lancet", "jama", "bmj",
    "physical review", "physical review letters", "physical review d", "physical review e",
    "physical review a", "physical review b", "physical review x",
    "annual reviews", "annual review", "philosophical transactions",
    "journal of experimental medicine", "reviews of modern physics",
}

BRANCH_KEYWORDS = {
    "01-mathematics": ["theorem", "topology", "algebra", "category", "number theory", "geometry", "logic", "proof"],
    "02-physics": ["quantum", "relativity", "particle", "field theory", "thermodynamics", "mechanics", "electrodynamics"],
    "03-chemistry": ["reaction", "catalysis", "molecular", "bond", "synthesis", "chemistry"],
    "04-information": ["information", "computation", "algorithm", "entropy", "turing", "complexity", "shannon"],
    "05-biophysics": ["cell", "protein", "mitochondri", "membrane", "enzyme", "dna", "rna", "metabol", "biophys", "neuron"],
    "06-cosmology": ["cosmolog", "universe", "galax", "dark matter", "dark energy", "big bang", "inflation", "asteroid", "extinction"],
    "07-mind": ["consciousness", "cognition", "perception", "neural", "brain", "mind", "psycholog"],
}


def score(record: dict) -> tuple[int, list[str]]:
    """Return (score 0-100, reasons[])."""
    reasons: list[str] = []
    s = 0

    cr_type = (record.get("_crossref_type") or "").lower()
    if cr_type in {"journal-article", "book", "book-chapter", "monograph", "proceedings-article"}:
        s += 30
        reasons.append(f"+30 peer-reviewed type ({cr_type})")

    cc = record.get("citation_count") or 0
    if cc > 1000:
        s += 25
        reasons.append(f"+25 highly cited ({cc})")
    elif cc > 50:
        s += 20
        reasons.append(f"+20 citation_count>50 ({cc})")
    elif cc > 10:
        s += 10
        reasons.append(f"+10 citation_count>10 ({cc})")

    year = record.get("year")
    try:
        if year and int(year) < datetime.utcnow().year - 5:
            s += 15
            reasons.append(f"+15 survived >5y (year={year})")
    except (ValueError, TypeError):
        pass

    oa = (record.get("oa_status") or {}).get("is_oa")
    if oa:
        s += 10
        reasons.append("+10 open access")

    venue_name = ((record.get("venue") or {}).get("name") or "").lower()
    if any(v in venue_name for v in FOUNDATIONAL_VENUES):
        s += 15
        reasons.append(f"+15 foundational venue ({venue_name[:40]})")

    if record.get("is_retracted"):
        s -= 30
        reasons.append("-30 retracted")

    s = max(0, min(100, s))
    return s, reasons


def branch_hints(record: dict) -> list[str]:
    text = " ".join([
        (record.get("title") or ""),
        " ".join(c.get("display_name", "") if isinstance(c, dict) else str(c) for c in (record.get("concepts") or [])),
    ]).lower()
    hits = []
    for branch, kws in BRANCH_KEYWORDS.items():
        if any(k in text for k in kws):
            hits.append(branch)
    return hits
