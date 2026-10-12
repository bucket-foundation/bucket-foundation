import collections
import json
import os
import re
import resource
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.dirname(HERE)
OUT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(HERE, "public")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")
RESTRICTED_HOST = re.compile(r"ipums", re.I)
OPEN_LICENCE = re.compile(r"CC BY|CC0|Open Government|Open Licence|Licence Ouverte|Standard Terms of Use|public domain", re.I)
NAME_WORDS = 8
TEXT_LIMIT = 300
LABEL_LIMIT = 240
NATURAL_EARTH = "Natural Earth 1:50m Admin 0 Countries, label point"
NATURAL_EARTH_URL = "https://www.naturalearthdata.com/about/terms-of-use/"
WORLD_TABLES = [
    "world_systems", "world_stages", "world_exams", "world_nqf", "world_occupations", "world_professions",
    "world_elements", "world_languages", "world_tvet_bodies", "world_indicators",
]


def rows_of(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except ValueError:
                    continue


def clean(value, limit=TEXT_LIMIT):
    if isinstance(value, str):
        value = EMAIL.sub("[email removed]", value)
        return value if len(value) <= limit else value[:limit - 3].rsplit(" ", 1)[0] + "..."
    if isinstance(value, list):
        return [clean(v, limit) for v in value]
    return value


def name(value):
    if isinstance(value, str) and value.strip() and len(value.split()) <= NAME_WORDS and len(value) <= 120:
        return value.strip()
    return None


def names(values):
    return [n for n in (name(v) for v in values or []) if n]


def licence(value):
    return value if isinstance(value, str) and value.strip() and not value.lower().startswith("unknown") else "unknown"


def first_url(r):
    urls = r.get("source_urls")
    return r.get("source_url") or (urls[0] if isinstance(urls, list) and urls else None)


class World:
    def __init__(self):
        self.folder = os.path.join(ROOT, "world")
        self.countries = {r["iso3"]: r for r in rows_of(os.path.join(self.folder, "countries.jsonl"))}
        self.stats = collections.OrderedDict()
        self.ids = set()
        self.renamed = 0

    def base(self, r, row_id=None):
        country = self.countries.get(r.get("iso3")) or {}
        url = first_url(r)
        return collections.OrderedDict([
            ("id", row_id or r["id"]), ("slice", "world"), ("iso3", r.get("iso3")), ("country", r.get("country") or country.get("name")),
            ("region", r.get("region") or country.get("region")), ("region_method", "stated"),
            ("language", r.get("language")), ("language_method", "stated" if r.get("language") else "none"),
            ("national_language", r.get("national_language") or country.get("national_language")),
            ("licence", licence(r.get("licence"))), ("source_url", url), ("verified", bool(r.get("verified")) and bool(url)),
        ])

    def write(self, table, rows):
        path = os.path.join(OUT, table + ".jsonl")
        n = verified = 0
        with open(path, "w", encoding="utf-8") as fh:
            for row in rows:
                base, k = row["id"], 1
                while row["id"] in self.ids:
                    k += 1
                    row["id"] = "%s-%d" % (base, k)
                    self.renamed += 1
                self.ids.add(row["id"])
                n += 1
                verified += bool(row.get("verified"))
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
        self.stats[table] = {"rows": n, "verified": verified, "verified_share": round(verified / n, 4) if n else 0.0, "bytes": os.path.getsize(path)}

    def systems(self):
        for r in rows_of(os.path.join(self.folder, "systems.jsonl")):
            row = self.base(r)
            row.update(
                programme_no=r.get("programme_no"), name_national=name(r.get("name_national")), name_english=name(r.get("name_english")),
                qualification_national=name(r.get("qualification_national")), qualification_english=name(r.get("qualification_english")),
                isced_level=r.get("isced_level"), isced_p=r.get("isced_p"), isced_a=r.get("isced_a"), entry_age=r.get("entry_age"),
                duration_years=r.get("duration_years"), orientation=name(r.get("orientation")), access_to_isced=clean(r.get("access_to_isced"), 40),
                work_based=r.get("work_based"), eqf_level=r.get("eqf_level"), level=r.get("level"), purpose=r.get("purpose"),
            )
            yield row

    def stages(self):
        for r in rows_of(os.path.join(self.folder, "stages.jsonl")):
            row = self.base(r)
            row.update(
                isced_level=r.get("isced_level"), level=r.get("level"), age_from=r.get("age_from"), duration_years_main=r.get("duration_years_main"),
                programme_count=r.get("programme_count"), vocational_programme_count=r.get("vocational_programme_count"),
                main_programmes=names(r.get("main_programmes")), main_programmes_national=names(r.get("main_programmes_national")),
                qualifications=names(r.get("qualifications")), compulsory_age_from=r.get("compulsory_age_from"), compulsory_age_to=r.get("compulsory_age_to"),
                wb_official_entry_age=r.get("wb_official_entry_age"), wb_duration_years=r.get("wb_duration_years"),
                wb_gross_enrolment_ratio=r.get("wb_gross_enrolment_ratio"), wb_gross_enrolment_year=r.get("wb_gross_enrolment_year"), purpose=r.get("purpose"),
            )
            yield row

    def exams(self):
        for r in rows_of(os.path.join(self.folder, "exams.jsonl")):
            row = self.base(r)
            row.update(
                name=clean(r.get("name"), 160), level=r.get("level"), gates=clean(r.get("gates"), LABEL_LIMIT), gates_basis="recall",
                body=clean(r.get("body"), 160), purpose=r.get("purpose"), name_confirmed=bool(r.get("name_confirmed")), verified_scope=clean(r.get("verified_scope"), 120),
            )
            yield row

    def nqf(self):
        for r in rows_of(os.path.join(self.folder, "nqf.jsonl")):
            row = self.base(r)
            row.update(
                row_type=r.get("row_type"), framework=name(r.get("framework")), nqf_level=r.get("nqf_level"), eqf_level=r.get("eqf_level"),
                levels=r.get("levels"), status=name(r.get("status")), responsible_body=name(r.get("responsible_body")),
                qualification_types=names(r.get("qualification_types")), verification_basis=clean(r.get("verification_basis"), 160),
            )
            yield row

    def occupations(self):
        for r in rows_of(os.path.join(self.folder, "occupations_national.jsonl")):
            row = self.base(r)
            keep = bool(OPEN_LICENCE.search(row["licence"]))
            row.update(
                scheme=clean(r.get("scheme"), 120), code=r.get("code"), title=name(r.get("title")) if keep else None,
                title_english=name(r.get("title_english")) if keep else None, title_basis="source" if keep else "withheld, licence unknown",
                class_level=r.get("class_level"), isco08=r.get("isco08"), isco_link_type=clean(r.get("isco_link_type"), 160),
                requirement_level=r.get("requirement_level"), purpose=r.get("purpose"),
            )
            yield row

    def professions(self):
        for r in rows_of(os.path.join(self.folder, "professions.jsonl")):
            row = self.base(r)
            row["verified"] = False
            row.update(
                profession=r.get("profession"), isco08=r.get("isco08"), route=clean(r.get("route"), LABEL_LIMIT), basis="recall, no regulator page fetched",
                level=r.get("level"), purpose=r.get("purpose"), name_confirmed=bool(r.get("name_confirmed")),
            )
            yield row

    def elements(self):
        for r in rows_of(os.path.join(self.folder, "country_elements.jsonl")):
            row = self.base(r)
            row.update(
                element=r.get("element"), description=clean(r.get("description"), LABEL_LIMIT), basis="recall", name_confirmed=bool(r.get("name_confirmed")),
                vocational_share_of_secondary_pct=r.get("vocational_share_of_secondary_pct"), share_year=r.get("share_year"), share_verified=r.get("share_verified"),
                work_based_programmes_in_isced_mapping=r.get("work_based_programmes_in_isced_mapping"),
                tertiary_programmes_in_isced_mapping=r.get("tertiary_programmes_in_isced_mapping"), adult_programmes_in_isced_mapping=r.get("adult_programmes_in_isced_mapping"),
            )
            yield row

    def languages(self):
        for r in rows_of(os.path.join(self.folder, "languages.jsonl")):
            row = self.base(r)
            row["source_url"] = r.get("official_page_url")
            row["verified"] = False
            row.update(languages_of_instruction=names(r.get("languages_of_instruction")), note=clean(r.get("note"), LABEL_LIMIT), basis="recall", sources_english_only=r.get("sources_english_only"))
            yield row

    def tvet(self):
        for r in rows_of(os.path.join(self.folder, "tvet_bodies.jsonl")):
            row = self.base(r)
            row.update(name=clean(r.get("name"), 160), name_national=clean(r.get("name_national"), 160), short_name=r.get("short_name"), type=r.get("type"), url=r.get("url"))
            yield row

    def indicators(self):
        for r in rows_of(os.path.join(self.folder, "indicators.jsonl")):
            row = self.base(r)
            row["source_url"] = "https://api.worldbank.org/v2/country/%s/indicator/%s" % (r.get("iso3"), r.get("indicator"))
            row.update(indicator=r.get("indicator"), indicator_name=clean(r.get("indicator_name"), 160), value=r.get("value"), year=r.get("year"))
            yield row

    def country_rows(self):
        with open(os.path.join(HERE, "ne", "ne_50m.geojson"), encoding="utf-8") as fh:
            features = json.load(fh)["features"]
        seen = set()
        for f in sorted(features, key=lambda f: str(f["properties"].get("ISO_A2_EH"))):
            p = f["properties"]
            iso2, iso3 = p.get("ISO_A2_EH"), p.get("ISO_A3_EH")
            if not isinstance(iso2, str) or not re.fullmatch(r"[A-Z]{2}", iso2) or iso2 in seen:
                continue
            seen.add(iso2)
            extra = self.countries.get(iso3) or {}
            yield collections.OrderedDict([
                ("id", "country-%s" % iso2.lower()), ("slice", "world"), ("iso2", iso2), ("iso3", iso3 if isinstance(iso3, str) and re.fullmatch(r"[A-Z]{3}", iso3) else None),
                ("name", p.get("NAME_EN") or p.get("NAME")), ("lat", round(float(p["LABEL_Y"]), 4)), ("lng", round(float(p["LABEL_X"]), 4)),
                ("region", iso2), ("region_method", "stated"), ("point_source", NATURAL_EARTH), ("licence", "public domain"), ("terms_url", NATURAL_EARTH_URL),
                ("in_world_slice", bool(extra)), ("population_2023", extra.get("population_2023")), ("oecd", extra.get("oecd")),
                ("national_language", extra.get("national_language")), ("official_page_url", extra.get("official_page_url")), ("verified", True),
                ("source_url", "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/"),
            ])

    def tech_occupation(self):
        folder = os.path.join(ROOT, "history-technology")
        n = 0
        for r in rows_of(os.path.join(folder, "tech_occupation.jsonl")):
            if RESTRICTED_HOST.search(json.dumps(r)):
                self.withheld["tech_occupation"] += 1
                continue
            n += 1
            yield collections.OrderedDict([
                ("id", "tech-occ-%03d" % n), ("slice", "history-technology"), ("technology_id", r.get("technology_id")), ("occupation", clean(r.get("occupation"), 120)),
                ("relation", r.get("relation")), ("year", r.get("year")), ("years_after_technology", r.get("years_after_technology")),
                ("source_type", r.get("source_type")), ("source_url", r.get("source_url")), ("verified", bool(r.get("verified")) and bool(r.get("source_url"))),
            ])

    def training_response(self):
        folder = os.path.join(ROOT, "history-technology")
        codes = {str(c.get("name")).lower(): c.get("region") for c in self.countries.values()}
        for r in rows_of(os.path.join(folder, "training_response.jsonl")):
            if RESTRICTED_HOST.search(json.dumps(r)):
                self.withheld["tech_training_response"] += 1
                continue
            yield collections.OrderedDict([
                ("id", "tech-tr-%s" % str(r["id"]).replace("ht-tr-", "")), ("slice", "history-technology"), ("technology_id", r.get("technology_id")), ("wave", r.get("wave")),
                ("name", clean(r.get("name"), 160)), ("kind", r.get("kind")), ("country", r.get("country")), ("region", codes.get(str(r.get("country")).lower())),
                ("year", r.get("year")), ("lag_years", r.get("lag_years")), ("source_url", r.get("source_url")), ("verified", bool(r.get("verified")) and bool(r.get("source_url"))),
            ])

    def lags(self):
        folder = os.path.join(ROOT, "history-technology")
        groups = collections.defaultdict(list)
        n = 0
        for r in rows_of(os.path.join(folder, "lags.jsonl")):
            if RESTRICTED_HOST.search(json.dumps(r)) or re.search(r"census", str(r.get("measure")) + str(r.get("basis")), re.I):
                self.withheld["tech_lags"] += 1
                continue
            n += 1
            groups[r.get("measure")].append(r.get("lag_years"))
            yield collections.OrderedDict([
                ("id", "tech-lag-%03d" % n), ("slice", "history-technology"), ("row_type", "case"), ("technology_id", r.get("technology_id")),
                ("occupation", clean(r.get("occupation"), 120)), ("measure", clean(r.get("measure"), 120)), ("from_year", r.get("from_year")), ("to_year", r.get("to_year")),
                ("lag_years", r.get("lag_years")), ("n", 1), ("basis", clean(r.get("basis"), 160)), ("verified", bool(r.get("both_ends_fetched"))),
            ])
        for i, (measure, values) in enumerate(sorted(groups.items()), 1):
            values = [v for v in values if isinstance(v, (int, float))]
            yield collections.OrderedDict([
                ("id", "tech-lag-summary-%02d" % i), ("slice", "history-technology"), ("row_type", "summary"), ("technology_id", None), ("occupation", None),
                ("measure", clean(measure, 120)), ("from_year", None), ("to_year", None), ("lag_years", statistics.median(values) if values else None),
                ("n", len(values)), ("basis", "median of the case rows with this measure; min %s, max %s" % (min(values), max(values)) if values else None), ("verified", False),
            ])

    def licences(self):
        for r in rows_of(os.path.join(HERE, "source_licences.jsonl")):
            r = collections.OrderedDict((k, clean(v)) if isinstance(v, str) else (k, v) for k, v in r.items())
            if r.get("public") != "rows":
                r["publishable"] = False
            r["verified"] = bool(r.get("fetched"))
            yield r

    def run(self):
        os.makedirs(OUT, exist_ok=True)
        self.withheld = collections.Counter()
        present = os.path.isdir(self.folder) and bool(self.countries)
        if present:
            for table, source in zip(WORLD_TABLES, (self.systems, self.stages, self.exams, self.nqf, self.occupations, self.professions, self.elements, self.languages, self.tvet, self.indicators)):
                self.write(table, source())
        self.write("countries", self.country_rows())
        self.write("tech_occupation", self.tech_occupation())
        self.write("tech_training_response", self.training_response())
        self.write("tech_lags", self.lags())
        if os.path.exists(os.path.join(HERE, "source_licences.jsonl")):
            self.write("source_licences", self.licences())
        with open(os.path.join(OUT, "world_stats.json"), "w", encoding="utf-8") as fh:
            json.dump({"world_slice_loaded": present, "tables": self.stats, "rows_withheld_restricted_host": dict(self.withheld), "duplicate_ids_renumbered": self.renamed}, fh, indent=1)
            fh.write("\n")
        print(json.dumps({k: (v["rows"], v["verified_share"]) for k, v in self.stats.items()}), dict(self.withheld))
        print("peak memory MB", resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024)


if __name__ == "__main__":
    World().run()
