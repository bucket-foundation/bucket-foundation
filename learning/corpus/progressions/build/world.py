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
CC_BY = "https://creativecommons.org/licenses/by/4.0/"
ADAPTED = "Bucket Foundation selected and reformatted the data."
NEEDS_CREDIT = re.compile(r"CC BY|Open Government|Open Licence|Licence Ouverte|Standard Terms of Use|EU reuse", re.I)
RULE_EXCEPTION = "Cleared by the US federal works rule with the terms page unread. Third-party text, images and trademarks on the page stay under their owners' terms, and a row that reproduces such material is not cleared."
ATTRIBUTIONS = [
    ("abs-osca-2024", {"table": ["world_occupations"], "licence": ["CC BY 4.0"], "scheme": ["OSCA 2024"]}, "Australian Bureau of Statistics", "OSCA, Occupation Standard Classification for Australia, 2024", "CC-BY-4.0", CC_BY,
     "Source: Australian Bureau of Statistics, OSCA - Occupation Standard Classification for Australia, 2024, licensed under CC BY 4.0 (%s). %s" % (CC_BY, ADAPTED)),
    ("stats-nz-nol", {"table": ["world_occupations"], "licence": ["CC BY 4.0"], "scheme": ["NOL v1.0"]}, "Stats NZ", "National Occupation List v1.0", "CC-BY-4.0", CC_BY,
     "This work includes Stats NZ's data, National Occupation List v1.0, which are licensed by Stats NZ for reuse under the Creative Commons Attribution 4.0 International licence (%s). %s" % (CC_BY, ADAPTED)),
    ("ons-soc-2020", {"table": ["world_occupations"], "licence": ["Open Government Licence v3.0"], "scheme": ["SOC 2020"]}, "Office for National Statistics", "Standard Occupational Classification 2020 and its coding index", "OGL-UK-3.0", "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
     "Source: Office for National Statistics, Standard Occupational Classification 2020. Contains public sector information licensed under the Open Government Licence v3.0 (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)."),
    ("statcan-noc-2021", {"table": ["world_occupations"], "licence": ["Statistics Canada Open Licence"], "scheme": ["NOC 2021"]}, "Statistics Canada", "National Occupational Classification (NOC) 2021 Version 1.0", "Statistics Canada Open Licence", "https://www.statcan.gc.ca/en/reference/licence",
     "Adapted from Statistics Canada, National Occupational Classification (NOC) 2021 Version 1.0, retrieved 2026-10-11. This does not constitute an endorsement by Statistics Canada of this product. Reproduced under the Statistics Canada Open Licence (https://www.statcan.gc.ca/en/reference/licence)."),
    ("japan-jsco-2009", {"table": ["world_occupations"], "licence": ["Government of Japan Standard Terms of Use 2.0"], "scheme": ["JSCO 2009"]}, "Ministry of Internal Affairs and Communications, Japan", "Japan Standard Occupational Classification, revision 5 of 2009", "Government of Japan Standard Terms of Use 2.0", "https://www.soumu.go.jp/menu_kyotsuu/policy/tyosaku.html",
     "Source: Ministry of Internal Affairs and Communications, Japan Standard Occupational Classification (Rev. 5, 2009), https://www.soumu.go.jp/main_content/000587432.csv (accessed 2026-10-11), Government Standard Terms of Use 2.0. Bucket Foundation edited the content."),
    ("insee-pcs-2020", {"table": ["world_occupations"], "licence": ["Licence Ouverte 2.0"], "scheme": ["PCS 2020"]}, "INSEE", "Professions et catégories socioprofessionnelles, PCS 2020, correspondence with ISCO-08", "etalab-2.0", "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
     "Source: INSEE, Professions et catégories socioprofessionnelles (PCS 2020), correspondence with ISCO-08, retrieved 2026-10-11, reused under the Licence Ouverte 2.0 (https://www.etalab.gouv.fr/licence-ouverte-open-licence/)."),
    ("world-bank-wdi", {"table": ["world_indicators", "world_stages"], "licence": ["CC BY 4.0"]}, "World Bank", "World Development Indicators, education series", "CC-BY-4.0", CC_BY,
     "Source: World Bank, World Development Indicators, licensed under CC BY 4.0 (%s). %s Data source: UNESCO Institute for Statistics" % (CC_BY, ADAPTED)),
    ("cedefop-nqf", {"table": ["world_nqf"], "licence": ["CC BY 4.0 (EU reuse policy, source to be credited)"]}, "Cedefop, European Centre for the Development of Vocational Training", "NQFs online tool and the European inventory of national qualifications frameworks", "CC-BY-4.0", "https://www.cedefop.europa.eu/en/copyright",
     "Source: Cedefop, NQFs online tool and European inventory of NQFs. Copyright Cedefop; reuse is authorised provided the source is acknowledged (https://www.cedefop.europa.eu/en/copyright). %s" % ADAPTED),
    ("eu-cedefop-eurydice", {"table": ["world_exams", "world_professions", "world_elements"], "licence": ["CC BY 4.0 (EU reuse policy, source to be credited)"]}, "European Union: Cedefop and Eurydice", "Cedefop country reports and Eurydice national education system pages", "CC-BY-4.0", "https://commission.europa.eu/legal-notice_en",
     "Source: Cedefop and Eurydice, European Union. Reuse is authorised under CC BY 4.0 (%s) provided the source is acknowledged. %s" % (CC_BY, ADAPTED)),
    ("gov-uk", {"table": ["world_exams"], "licence": ["Open Government Licence v3.0"]}, "UK Government", "GOV.UK guidance on qualification levels", "OGL-UK-3.0", "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
     "Source: GOV.UK. Contains public sector information licensed under the Open Government Licence v3.0 (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)."),
    ("onet-31", {"table": ["progression", "backbone_codes"], "scheme": ["onet31", "onet-soc"]}, "USDOL/ETA", "O*NET 31.0 Database", "CC-BY-4.0", CC_BY,
     "This corpus includes information from the O*NET 31.0 Database (https://www.onetcenter.org/database.html) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), used under the CC BY 4.0 licence (%s). O*NET is a trademark of USDOL/ETA. Bucket Foundation has modified all or some of this information. USDOL/ETA has not approved, endorsed or tested these modifications." % CC_BY),
    ("ccss", {"table": ["progression"], "framework_id": ["school-fw-ccss-math", "school-fw-ccss-ela"]}, "NGA Center and CCSSO", "Common Core State Standards", "Common Core public licence", "https://www.thecorestandards.org/public-license/",
     "Copyright 2010 National Governors Association Center for Best Practices and Council of Chief State School Officers. All rights reserved. Used under the public licence (https://www.thecorestandards.org/public-license/). The labels are Bucket's own wording and are no part of the standards."),
    ("wikimedia", {"table": ["resources", "technologies", "tech_occupation", "tech_training_response"], "host": ["en.wikipedia.org", "en.wikibooks.org", "en.wikiversity.org"]}, "Wikimedia projects and their contributors", "English Wikipedia, Wikibooks, Wikiversity", "CC-BY-SA-4.0", "https://creativecommons.org/licenses/by-sa/4.0/",
     "Names, dates and links come from pages of the Wikimedia projects and their contributors, under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Bucket selected and reformatted them, and these rows stay under CC BY-SA 4.0."),
    ("openstax", {"table": ["books", "resources"], "host": ["openstax.org"]}, "OpenStax, Rice University", "OpenStax book catalogue", "CC-BY-4.0", CC_BY,
     "Book records come from OpenStax (https://openstax.org/), Rice University, under CC BY 4.0 (%s). Bucket reformatted them. Each book's own licence is in its row." % CC_BY),
    ("england-nc", {"table": ["progression"], "system": ["england-nc"]}, "Department for Education", "National curriculum in England", "OGL-UK-3.0", "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
     "Contains public sector information licensed under the Open Government Licence v3.0 (https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)."),
    ("australia-v9", {"table": ["progression"], "system": ["australia-v9"]}, "ACARA", "Australian Curriculum version 9", "CC-BY-4.0", "https://www.australiancurriculum.edu.au/copyright-and-terms-of-use",
     "Copyright Australian Curriculum, Assessment and Reporting Authority (ACARA) 2010 to present, licensed under CC BY 4.0 (%s). ACARA does not endorse this product. Bucket selected and shortened the material." % CC_BY),
]
SOURCE_CREDITS = [
    ("wordbank", {"host": ["wordbank.stanford.edu"]}, "Wordbank, Frank et al.", "Wordbank: An open repository for developmental vocabulary data", "CC-BY-4.0", CC_BY,
     "Source: Wordbank, Frank et al., Wordbank: An open repository for developmental vocabulary data, https://langcog.github.io/wordbank-datapage/, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Bucket Foundation selected and reformatted the data."),
    ("tech-interview-handbook-site", {"host": ["www.techinterviewhandbook.org"]}, "Yangshun Tay", "Tech Interview Handbook", "MIT", "https://github.com/yangshun/tech-interview-handbook/blob/main/LICENSE",
     "Copyright (c) 2017-Present Yangshun Tay. MIT License, https://github.com/yangshun/tech-interview-handbook/blob/main/LICENSE."),
    ("cdc", {"host": ["www.cdc.gov"]}, "Centers for Disease Control and Prevention", "Learn the Signs. Act Early. milestone material", "US federal work, public domain", "https://www.cdc.gov/other/agencymaterials.html",
     "Source: Centers for Disease Control and Prevention. Bucket Foundation selected and shortened the content. CDC has not endorsed this product."),
]
TERMS_READ = {"ons-soc-2020", "gov-uk", "england-nc", "statcan-noc-2021", "wordbank", "tech-interview-handbook-site", "cdc", "japan-jsco-2009", "world-bank-wdi"}
FEDERAL_URL = "https://www.usa.gov/government-copyright"
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
        self.credit = collections.Counter()

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
                if table in WORLD_TABLES and NEEDS_CREDIT.search(str(row.get("licence"))):
                    self.credit[(table, row["licence"], row.get("scheme") if table == "world_occupations" else None)] += 1
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
            r["clearance"] = "terms read" if r.get("fetched") else "rule, terms unread" if r.get("public") == "rows" else "none"
            r["exception"] = None
            if r.get("licence") == "CC-BY-SA-4.0" and r.get("public") == "rows":
                r["public"] = "codes"
                r["notes"] = clean((r.get("notes") or "") + " Held as codes and links: the source is share-alike and the compilation is CC BY 4.0.")
            if r["clearance"] == "rule, terms unread" and r.get("public") == "rows":
                r["exception"] = RULE_EXCEPTION
            r["publishable"] = r.get("public") == "rows"
            r["verified"] = bool(r.get("fetched"))
            yield r

    def attributions(self):
        for key, match, body, dataset, spdx, url, line in ATTRIBUTIONS:
            n = sum(v for (table, lic, scheme), v in self.credit.items() if table in match.get("table", ()) and lic in match.get("licence", ()) and (scheme is None or scheme in match.get("scheme", ())))
            yield self.credit_row(key, match, body, dataset, spdx, url, line, n, [])
        explicit = {key for key, *_ in SOURCE_CREDITS}
        for key, match, body, dataset, spdx, url, line in SOURCE_CREDITS:
            yield self.credit_row(key, match, body, dataset, spdx, url, line, 0, [key])
        for r in rows_of(os.path.join(HERE, "source_licences.jsonl")):
            if r.get("public") != "rows" or r["id"] in explicit or r.get("licence") == "CC-BY-SA-4.0":
                continue
            source = (r.get("attribution") or {}).get("source") or r["id"]
            line = "Source: %s, a work of the US federal government. Bucket Foundation selected and shortened the content. The agency has not endorsed this product." % source
            yield self.credit_row(r["id"], r.get("match") or {}, source, source, r.get("licence"), FEDERAL_URL, line, 0, [r["id"]])

    def credit_row(self, key, match, body, dataset, spdx, url, line, n, source_ids):
        return collections.OrderedDict([
            ("id", "credit-%s" % key), ("match", match), ("source_ids", source_ids), ("source", body), ("dataset", dataset), ("licence", spdx), ("licence_url", url),
            ("requires_attribution", True), ("credit_line", line), ("terms_read", key in TERMS_READ), ("world_rows", n),
        ])

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
        self.write("attributions", self.attributions())
        uncredited = [k for k in self.credit if not any(k[0] in m.get("table", ()) and k[1] in m.get("licence", ()) and (k[2] is None or k[2] in m.get("scheme", ())) for _, m, *_ in ATTRIBUTIONS)]
        if uncredited:
            raise SystemExit("no credit line for %s" % uncredited)
        with open(os.path.join(OUT, "world_stats.json"), "w", encoding="utf-8") as fh:
            json.dump({"world_slice_loaded": present, "tables": self.stats, "rows_withheld_restricted_host": dict(self.withheld), "duplicate_ids_renumbered": self.renamed}, fh, indent=1)
            fh.write("\n")
        print(json.dumps({k: (v["rows"], v["verified_share"]) for k, v in self.stats.items()}), dict(self.withheld))
        print("peak memory MB", resource.getrusage(resource.RUSAGE_SELF).ru_maxrss // 1024)


if __name__ == "__main__":
    World().run()
