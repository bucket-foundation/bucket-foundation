import re

FACETS = ["life_stage", "purpose", "kind", "mode", "region", "language", "era_from", "era_to"]
VOCAB = {
    "life_stage": ["infancy", "early-childhood", "primary", "secondary", "tertiary", "working-adult", "mid-career-change", "old-age"],
    "purpose": ["work", "school", "civic", "personal", "survival", "play", "spiritual", "care"],
    "kind": ["declarative", "procedural", "motor", "perceptual", "social-emotional", "tacit-craft", "judgement"],
    "mode": ["school", "apprenticeship", "family", "oral-tradition", "self-teaching", "play", "religious-formation", "military", "online"],
}
STAGE_BY_LEVEL = {
    "early": "early-childhood", "primary": "primary", "lower-secondary": "secondary", "upper-secondary": "secondary",
    "undergraduate-lower": "tertiary", "undergraduate-upper": "tertiary", "graduate": "tertiary",
    "professional-entry": "working-adult", "professional-advanced": "working-adult",
}
SCHOOL_LEVELS = {"early", "primary", "lower-secondary", "upper-secondary", "undergraduate-lower", "undergraduate-upper", "graduate"}
PROFESSIONAL = {"professional-entry", "professional-advanced"}
CATALOGUE_TABLES = {"courses", "programs"}
POSITIONAL_SLICES = {"everyday", "round2-arts-everyday"}
SCHOOL_SLICES = {"school", "university-stem", "university-other", "round2-fields", "land-health-service", "arts-media", "k12-full"}
WORK_SLICES = {"career", "trades-technical", "round2-occupations", "interview"}
CATALOGUE_YEAR = 2026
RELIGIOUS_FIELDS = {
    "catechesis", "Catholic formation", "Catholic seminary formation", "Jewish learning", "Islamic learning",
    "madrasa education", "Buddhist monastic education", "Hindu Vedic education", "rabbinic ordination",
}
APPRENTICE = re.compile(r"apprentic|journeyman|journeyworker|ausbildung|gesellen|meister", re.I)
COUNTRY = {
    "us": "US", "united states": "US", "usa": "US", "minnesota": "US",
    "england": "GB", "uk": "GB", "united kingdom": "GB", "uk-england": "GB", "great britain": "GB", "england and wales": "GB",
    "de": "DE", "germany": "DE", "ca": "CA", "canada": "CA", "singapore": "SG", "india": "IN", "australia": "AU",
    "japan": "JP", "switzerland": "CH", "spain": "ES", "pakistan": "PK", "china": "CN", "france": "FR", "italy": "IT",
    "kenya": "KE", "finland": "FI", "brazil": "BR", "mexico": "MX", "nigeria": "NG", "indonesia": "ID", "russia": "RU",
    "south korea": "KR", "korea": "KR", "netherlands": "NL", "ireland": "IE", "new zealand": "NZ", "south africa": "ZA",
}
MANY = re.compile(r"international|global|worldwide|europe|\beu\b|,| and |;", re.I)
REGION_LANGUAGE = {"US": "en", "GB": "en", "AU": "en", "NZ": "en", "IE": "en", "DE": "de", "JP": "ja"}
SYSTEM_REGION = {
    "australia-v9": "AU", "ontario": "CA", "india-ncert": "IN", "england-nc": "GB", "japan": "JP", "kenya-cbc": "KE",
    "finland": "FI", "singapore": "SG", "cambridge-igcse": "international", "cambridge-as-a-level": "international",
    "ib-dp": "international",
}
US_SYSTEMS = {
    "texas-teks", "california", "new-york", "ccss", "ncas", "dlm-essential-elements", "wida", "ngss", "jumpstart", "ncss",
    "head-start-elof", "shape-america", "actfl", "cee", "ap", "csta", "nhes", "iste", "casel", "advance-cte", "cctc",
    "civics-standards", "geography-standards",
}


def region_code(text):
    if not isinstance(text, str) or not text.strip():
        return None
    key = text.strip().lower()
    if re.fullmatch(r"us-[a-z]{2}", key):
        return "US"
    if key in COUNTRY:
        return COUNTRY[key]
    if re.fullmatch(r"[a-z]{2}", key) and text.strip().isupper():
        return text.strip()
    if MANY.search(key):
        return "international"
    return None


def system_region(system):
    if system in US_SYSTEMS:
        return "US"
    return SYSTEM_REGION.get(system)


def cip_code(row):
    return ((row.get("cip") or {}).get("code")) or ""


def life_stage(table, row):
    if table in CATALOGUE_TABLES:
        return "tertiary"
    if row.get("slice") in POSITIONAL_SLICES or str(row.get("field") or "").startswith("languages"):
        return None
    if table == "frameworks":
        low, high = STAGE_BY_LEVEL.get(row.get("level_from")), STAGE_BY_LEVEL.get(row.get("level_to"))
        return low if low and low == high else None
    return STAGE_BY_LEVEL.get(row.get("level"))


def levels_of(table, row):
    if table == "frameworks":
        return {row.get("level_from"), row.get("level_to")} - {None}
    return {row.get("level")} - {None}


def purpose(table, row):
    if table in CATALOGUE_TABLES:
        return "school"
    code = cip_code(row)
    if code.startswith("33"):
        return "civic"
    if code.startswith("36"):
        return "play"
    if code.startswith("37"):
        return "personal"
    if row.get("field") in RELIGIOUS_FIELDS:
        return "spiritual"
    if row.get("slice") in POSITIONAL_SLICES and (code.startswith("38.02") or code.startswith("39")):
        return "spiritual"
    levels = levels_of(table, row)
    if row.get("onet_soc") or levels & PROFESSIONAL or row.get("slice") in WORK_SLICES:
        return "work"
    if row.get("slice") in SCHOOL_SLICES and levels and levels <= SCHOOL_LEVELS:
        return "school"
    return None


def kind(table, row):
    if table in CATALOGUE_TABLES:
        return None
    code = cip_code(row)
    if code.startswith(("36.0108", "36.0114", "50.03")):
        return "motor"
    if code.startswith(("50.02", "36.0102", "48.07")):
        return "tacit-craft"
    if code.startswith("35"):
        return "social-emotional"
    if row.get("slice") == "trades-technical" or code.startswith(("46", "47", "48.05", "49")):
        return "procedural"
    return None


def mode(table, row):
    if table in CATALOGUE_TABLES:
        return "school"
    code = cip_code(row)
    field = str(row.get("field") or "")
    if field in RELIGIOUS_FIELDS:
        return "religious-formation"
    if code.startswith(("28", "29")) or field.startswith("military"):
        return "military"
    if field.startswith("MOOC"):
        return "online"
    if APPRENTICE.search(str(row.get("topic") or row.get("name") or "")):
        return "apprenticeship"
    if code.startswith("36.0103"):
        return "play"
    levels = levels_of(table, row)
    if row.get("slice") in SCHOOL_SLICES and levels and levels <= SCHOOL_LEVELS:
        return "school"
    return None


def region(table, row, framework, body_region):
    if table in CATALOGUE_TABLES:
        return "US"
    if table == "frameworks":
        return None
    if row.get("system"):
        return system_region(row["system"])
    if table == "progression" and framework:
        return framework.get("region")
    if table == "assessments":
        return body_region
    return None


def era(table, row, framework):
    if table in CATALOGUE_TABLES:
        return CATALOGUE_YEAR, CATALOGUE_YEAR
    if table == "progression" and framework and isinstance(framework.get("era_from"), int):
        return framework["era_from"], framework.get("era_to")
    return None, None


def valid(name, value):
    if name in VOCAB:
        return value if value in VOCAB[name] else None
    if name == "region":
        return region_code(value)
    if name == "language":
        return value if isinstance(value, str) and re.fullmatch(r"[a-z]{2,3}", value) else None
    if name in ("era_from", "era_to"):
        return value if isinstance(value, int) and not isinstance(value, bool) and -100000 <= value <= 2200 else None
    return None


def assign(table, row, stated=None, framework=None, body_region=None):
    stated = stated or {}
    ruled = {
        "life_stage": life_stage(table, row), "purpose": purpose(table, row), "kind": kind(table, row),
        "mode": mode(table, row), "region": region(table, row, framework, body_region),
    }
    ruled["era_from"], ruled["era_to"] = era(table, row, framework)
    out = {}
    for name in FACETS:
        value = valid(name, stated.get(name))
        method = "stated" if value is not None else "none"
        if value is None and name != "language" and ruled.get(name) is not None:
            value, method = ruled[name], "rule"
        out[name] = value
        out[name + "_method"] = method
    if out["language"] is None:
        guess = "en" if table in CATALOGUE_TABLES else REGION_LANGUAGE.get(out["region"])
        if guess:
            out["language"], out["language_method"] = guess, "rule"
    return out
