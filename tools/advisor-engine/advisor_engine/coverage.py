from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

FLOOR = 50
SMALL_POOL = 100
MAJORITY = 50.0
TESTS_FILE = "strata-tests.json"
EMPTY = {"pool": 0, "medium": 0}


@dataclass
class Statement:
    mode: str
    summary: str
    warnings: list[str] = field(default_factory=list)


def load(build: Path, home: Path) -> dict:
    cov = json.loads((build / "coverage.json").read_text())
    tests = home / TESTS_FILE
    if tests.is_file():
        cov["tests"] = json.loads(tests.read_text())
    return cov


def share(cell: dict) -> float:
    total = cell["pool"] + cell["medium"]
    return 100.0 * cell["medium"] / total if total else 0.0


def stratum(countries: list[str], fld: str | None) -> str | None:
    if len(countries) == 1 and fld:
        return f"{countries[0]}|{fld}"
    return None


def mode_for(cov: dict, candidates: int, countries: list[str], fld: str | None) -> str:
    if candidates < FLOOR:
        return "withheld"
    key = stratum(countries, fld)
    test = cov.get("tests", {}).get(key) if key else None
    return "tested" if test and test.get("passed") is True and int(test.get("pairs", 0)) >= 200 else "untested"


def mix(counts: Counter, top: int = 5) -> str:
    total = sum(counts.values())
    if not total:
        return "none"
    return ", ".join(f"{c or 'unknown'} {100 * n / total:.0f}%" for c, n in counts.most_common(top))


def statement(cov: dict, candidates: int, countries: list[str], fld: str | None, pool_mix: Counter, shown_mix: Counter) -> Statement:
    t = cov["totals"]
    mode = mode_for(cov, candidates, countries, fld)
    parts = [
        f"Bucket holds {t['advisors']:,} recorded advisors.",
        f"{t['name_only']:,} are known by name alone and cannot be matched to their papers.",
        f"This list draws on {t['pool']:,} who can.",
    ]
    warnings: list[str] = []
    fcell = cov["field"].get(fld, EMPTY) if fld else None
    if fcell is not None:
        parts.append(f"{fcell['pool']:,} of them are in {fld}.")
        if fcell["pool"] < SMALL_POOL:
            warnings.append(f"This list misses most advisors in {fld}. Treat it as a few leads and search by other means.")
    for c in countries:
        cell = cov["country"].get(c, EMPTY)
        parts.append(
            f"{cell['pool']:,} of them are in {c}. {cell['medium']:,} more people in {c} are held with an unreviewed identity match "
            f"and are left out, which is {share(cell):.1f}% of the advisors Bucket can identify there."
        )
        if share(cell) > MAJORITY:
            warnings.append(f"Most advisors Bucket can identify in {c} are missing from this list.")
        if cell["pool"] < SMALL_POOL:
            warnings.append(f"This list misses most advisors in {c}. Treat it as a few leads and search by other means.")
        if fld:
            pair = cov["pair"].get(f"{c}|{fld}", EMPTY)
            parts.append(f"For {fld} in {c} it draws on {pair['pool']:,} and leaves out {pair['medium']:,}, which is {share(pair):.1f}%.")
            if share(pair) > MAJORITY and share(cell) <= MAJORITY:
                warnings.append(f"Most advisors Bucket can identify for {fld} in {c} are missing from this list.")
    if not countries:
        parts.append(f"Country mix of the candidates: {mix(pool_mix)}. Country mix of the first rows: {mix(shown_mix)}.")
    parts.append("Advisors with no OpenAlex record are absent.")
    key = stratum(countries, fld)
    if mode == "tested":
        pairs = cov["tests"][key]["pairs"]
        parts.append(
            f"The order for {fld} in {countries[0]} was tested on {pairs:,} recorded pairs, against every rankable advisor in the field. "
            "The test used the papers a student had written before. An order from a written description alone has never been tested."
        )
    elif mode == "withheld":
        parts.append(f"Bucket holds {candidates:,} candidates for this search, too few to order.")
    else:
        passed = sorted(k.replace("|", ", ") for k, v in cov.get("tests", {}).items() if v.get("passed") is True)
        if passed and key:
            parts.append(f"The order has not been tested for {fld} in {countries[0]}. It was tested in {'; '.join(passed)}.")
        else:
            parts.append("The order has not been tested.")
    return Statement(mode, " ".join(parts), warnings)
