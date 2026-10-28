#!/usr/bin/env python3
import argparse
import datetime
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

FORMAT = "bkt-deck"
DECK_KIND = "words"
CURATOR = "Bucket Foundation"
CARD_FIELDS = ["surface", "ipa", "pos", "meaning", "tier", "kind", "translations", "etymology"]
FORMAT_VERSION = 1
TABLE = "photons_full"
SOURCE = "Wiktionary via Kaikki (kaikki.org)"
SOURCE_URL = "https://kaikki.org"
WIKTIONARY_URL = "https://en.wiktionary.org"
LICENCE = "CC-BY-SA 4.0"
LICENCE_URL = "https://creativecommons.org/licenses/by-sa/4.0/"
ADAPTATION = (
    "Adapted by Bucket Foundation from Wiktionary entries extracted by Kaikki: each entry is cut down to the word, "
    "its IPA, its part of speech and its English senses, and the words are put in order with the common ones first. "
    "This pack is shared under the same licence."
)
SENSE_JOIN = " · "
SAMPLE_ROWS = 1000
FETCH_ROWS = 5000
INSERT_ROWS = 20000
DEFAULT_MAX_BYTES = 5 * 1024**3
ZSTD_LEVEL = 19
TIER_ORDER = ["core", "common", "basic", "functional", "extended", "rare"]
CORE_POS = {"noun", "verb", "adj", "adv", "num", "pron", "prep", "det", "conj", "intj", "particle", "postp"}
TRANSLATION_PREDICATES = {"translates", "translation", "translation_of", "translated_as"}
ETYMOLOGY_WORDS = ("deriv", "etym", "inherit", "borrow", "cognate", "descend", "root")
PHOTON_PREFIX = "photon:word:"
LINKS_KEPT = 40

LANGUAGE_NAMES = {
    "akk": "Akkadian",
    "ang": "Old English",
    "ar": "Arabic",
    "cop": "Coptic",
    "cs": "Czech",
    "de": "German",
    "egy": "Egyptian",
    "el": "Greek",
    "en": "English",
    "es": "Spanish",
    "fa": "Persian",
    "fi": "Finnish",
    "fr": "French",
    "got": "Gothic",
    "grc": "Ancient Greek",
    "he": "Hebrew",
    "hi": "Hindi",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "la": "Latin",
    "nl": "Dutch",
    "non": "Old Norse",
    "pl": "Polish",
    "pt": "Portuguese",
    "ru": "Russian",
    "sa": "Sanskrit",
    "sux": "Sumerian",
    "sv": "Swedish",
    "ta": "Tamil",
    "th": "Thai",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "zh": "Chinese",
}

MARKS = re.compile("[̀-֑ͯ-ׇؐ-ًؚ-ٰٟۖ-ۭ]")
PARENS = re.compile(r"\([^)]*\)")
SPACES = re.compile(r"\s+")
PART_END = re.compile(r"[.!?…]+$")
ARTICLE = re.compile(r"^(to|a|an|the)\s+")
FORM_OF = re.compile(
    r"^(?:[\w'-]+[ /]){0,6}?(?:inflection|plural|singular|dual|form|forms|participle|gerund|infinitive|imperative|indicative|"
    r"subjunctive|supine|tense|person|genitive|dative|accusative|ablative|vocative|nominative|locative|instrumental|"
    r"comparative|superlative|diminutive|augmentative|spelling|romanization|transliteration|abbreviation|initialism|"
    r"acronym|synonym|misspelling|variant|contraction|clipping|ellipsis|degree|definite|indefinite|conjugation|declension) of\b",
    re.IGNORECASE,
)


def fold(word):
    return MARKS.sub("", unicodedata.normalize("NFKD", word)).lower().strip()


def plain(gloss):
    return SPACES.sub(" ", PARENS.sub(" ", gloss)).strip()


def first_part(gloss):
    return PART_END.sub("", re.split(r"[,;/]", plain(gloss))[0].strip()).strip()


def headword(gloss):
    return ARTICLE.sub("", first_part(gloss).lower())


def senses(meaning):
    return [s.strip() for s in meaning.split(SENSE_JOIN) if s.strip()]


def head_choices(gloss):
    found = []
    for part in re.split(r"[,;/]", plain(gloss)):
        head = ARTICLE.sub("", PART_END.sub("", part.strip()).strip().lower())
        if head and head not in found:
            found.append(head)
    return found


def head_of(lang, surface, meaning, concepts=frozenset()):
    if lang == "en":
        return fold(surface)
    parts = senses(meaning)
    choices = head_choices(parts[0]) if parts else []
    return next((h for h in choices if h in concepts), choices[0] if choices else "")


def tier_rank(tier):
    t = (tier or "").strip().lower()
    return TIER_ORDER.index(t) if t in TIER_ORDER else len(TIER_ORDER)


def rank_key(lang, surface, ipa, pos, meaning, tier, concepts):
    parts = senses(meaning)
    head = head_of(lang, surface, meaning, concepts)
    return (
        tier_rank(tier),
        1 if parts and FORM_OF.search(parts[0]) else 0,
        0 if pos in CORE_POS else 1,
        1 if SPACES.search(surface.strip()) else 0,
        0 if head in concepts else 1,
        -min(len(parts), 9),
        0 if ipa else 1,
        len(surface),
    )


def link_target(to):
    text = to if isinstance(to, str) else ""
    return text[len(PHOTON_PREFIX):] if text.startswith(PHOTON_PREFIX) else text


def relation_links(relations):
    if isinstance(relations, str):
        try:
            relations = json.loads(relations)
        except ValueError:
            relations = None
    edges = []
    if isinstance(relations, list):
        edges = [e for e in relations if isinstance(e, dict)]
    elif isinstance(relations, dict):
        for predicate, targets in relations.items():
            for to in targets if isinstance(targets, list) else [targets]:
                edges.append({"predicate": predicate, "to": to.get("to") if isinstance(to, dict) else to})
    translations = []
    etymology = []
    for e in edges:
        predicate = str(e.get("predicate") or e.get("type") or e.get("rel") or "").lower()
        target = link_target(e.get("to") or e.get("target") or e.get("id"))
        if not target:
            continue
        if predicate in TRANSLATION_PREDICATES:
            translations.append(target)
        elif any(w in predicate for w in ETYMOLOGY_WORDS):
            etymology.append(target)
    return translations[:LINKS_KEPT], etymology[:LINKS_KEPT]


def links_text(links):
    return json.dumps(links, ensure_ascii=False, separators=(",", ":")) if links else ""


class PgSource:
    def __init__(self, conn, table=TABLE):
        self.conn = conn
        self.table = table
        self.serial = 0
        conn.set_session(readonly=True, autocommit=False)

    def _stream(self, sql, params=()):
        self.serial += 1
        cur = self.conn.cursor(name=f"bkt_words_{self.serial}")
        cur.itersize = FETCH_ROWS
        try:
            cur.execute(sql, params)
            for row in cur:
                yield row
        finally:
            cur.close()
            self.conn.rollback()

    def languages(self):
        return sorted(r[0] for r in self._stream(f"select distinct lang from {self.table} where lang is not null"))

    def sample_relations(self, lang, n=SAMPLE_ROWS):
        return [r[0] for r in self._stream(f"select relations from {self.table} where lang = %s limit %s", (lang, n))]

    def forms(self):
        return self._stream(f"select lang, surface from {self.table} where lang is not null and surface is not null")

    def rows(self, lang):
        return self._stream(f"select surface, ipa, pos, meaning_en, tier, kind, relations from {self.table} where lang = %s", (lang,))


def inspect_relations(source, lang, n=SAMPLE_ROWS):
    sampled = source.sample_relations(lang, n)
    with_translations = 0
    with_etymology = 0
    non_empty = 0
    for relations in sampled:
        translations, etymology = relation_links(relations)
        if relations not in (None, [], {}, "[]", "{}", ""):
            non_empty += 1
        with_translations += 1 if translations else 0
        with_etymology += 1 if etymology else 0
    return {"language": lang, "sampled": len(sampled), "non_empty": non_empty, "with_translations": with_translations, "with_etymology": with_etymology}


def shared_forms(source, path):
    db = sqlite3.connect(path)
    db.executescript("pragma journal_mode=off; pragma synchronous=off; create table forms(folded text not null, lang text not null);")
    batch = []
    for lang, surface in source.forms():
        folded = fold(surface or "")
        if folded:
            batch.append((folded, lang))
        if len(batch) >= INSERT_ROWS:
            db.executemany("insert into forms values (?, ?)", batch)
            batch = []
    db.executemany("insert into forms values (?, ?)", batch)
    db.executescript(
        "create table shared(folded text primary key) without rowid;"
        "insert into shared select folded from forms group by folded having count(distinct lang) > 1;"
        "drop table forms;"
    )
    db.commit()
    db.close()


PACK_SCHEMA = """
pragma page_size=4096;
pragma journal_mode=off;
pragma synchronous=off;
create table meta(k text primary key, v text not null) without rowid;
create table words(
  id integer primary key,
  surface text not null,
  folded text not null,
  ipa text not null,
  pos text not null,
  meaning text not null,
  head text not null,
  tier text not null,
  kind text not null,
  shared integer not null,
  translations text not null,
  etymology text not null
);
"""

PACK_INDEXES = """
create index words_head on words(head, id);
create index words_folded on words(folded, id);
create virtual table words_fts using fts5(surface, folded, meaning, content='words', content_rowid='id', tokenize='unicode61 remove_diacritics 2');
insert into words_fts(words_fts) values('rebuild');
insert into words_fts(words_fts) values('optimize');
"""

STAGE_SCHEMA = """
pragma journal_mode=off;
pragma synchronous=off;
create table stage(
  r0 integer, r1 integer, r2 integer, r3 integer, r4 integer, r5 integer, r6 integer, r7 integer,
  surface text, folded text, ipa text, pos text, meaning text, head text, tier text, kind text, translations text, etymology text
);
"""


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def compress(src, dst, level=ZSTD_LEVEL):
    if not shutil.which("zstd"):
        raise SystemExit("export_packs: the zstd command is missing; install zstd")
    subprocess.run(["zstd", "-q", "-f", f"-{level}", "-T0", str(src), "-o", str(dst)], check=True)


def deck_id(lang):
    return f"polingual-{lang}"


def pack_file(lang):
    return f"{deck_id(lang)}.sqlite.zst"


def build_pack(lang, rows, out_dir, *, concepts=frozenset(), shared_db=None, built=None, commit="unknown", work_dir=None, level=ZSTD_LEVEL):
    out = Path(out_dir) / lang
    out.mkdir(parents=True, exist_ok=True)
    name = LANGUAGE_NAMES.get(lang, lang)
    built = built or datetime.date.today().isoformat()
    dropped = {"empty_surface": 0, "empty_meaning": 0}
    counts = {"read": 0, "with_translations": 0, "with_etymology": 0, "with_ipa": 0}
    with tempfile.TemporaryDirectory(dir=work_dir) as tmp:
        stage_path = Path(tmp) / "stage.sqlite"
        db_path = Path(tmp) / f"{deck_id(lang)}.sqlite"
        stage = sqlite3.connect(stage_path)
        stage.executescript(STAGE_SCHEMA)
        batch = []
        for surface, ipa, pos, meaning, tier, kind, relations in rows:
            counts["read"] += 1
            surface = (surface or "").strip()
            meaning = (meaning or "").strip()
            if not surface:
                dropped["empty_surface"] += 1
                continue
            if not meaning:
                dropped["empty_meaning"] += 1
                continue
            ipa = (ipa or "").strip()
            pos = (pos or "").strip()
            translations, etymology = relation_links(relations)
            counts["with_translations"] += 1 if translations else 0
            counts["with_etymology"] += 1 if etymology else 0
            counts["with_ipa"] += 1 if ipa else 0
            key = rank_key(lang, surface, ipa, pos, meaning, tier, concepts)
            batch.append((*key, surface, fold(surface), ipa, pos, meaning, head_of(lang, surface, meaning, concepts), (tier or "").strip(), (kind or "").strip(), links_text(translations), links_text(etymology)))
            if len(batch) >= INSERT_ROWS:
                stage.executemany(f"insert into stage values ({','.join('?' * 18)})", batch)
                batch = []
        stage.executemany(f"insert into stage values ({','.join('?' * 18)})", batch)
        stage.commit()
        stage.close()

        db = sqlite3.connect(db_path)
        db.executescript(PACK_SCHEMA)
        db.execute("attach database ? as stage", (str(stage_path),))
        if shared_db:
            db.execute("attach database ? as forms", (str(shared_db),))
        shared_sql = "exists (select 1 from forms.shared f where f.folded = s.folded)" if shared_db else "0"
        db.execute(
            "insert into words(surface, folded, ipa, pos, meaning, head, tier, kind, shared, translations, etymology) "
            f"select s.surface, s.folded, s.ipa, s.pos, s.meaning, s.head, s.tier, s.kind, {shared_sql}, s.translations, s.etymology "
            "from stage.stage s order by s.r0, s.r1, s.r2, s.r3, s.r4, s.r5, s.r6, s.r7, s.surface"
        )
        db.commit()
        rows_kept = db.execute("select count(*) from words").fetchone()[0]
        meta = {
            "format": FORMAT,
            "format_version": str(FORMAT_VERSION),
            "id": deck_id(lang),
            "title": f"{name} words",
            "kind": DECK_KIND,
            "fields": json.dumps(CARD_FIELDS),
            "curator": CURATOR,
            "language": lang,
            "language_name": name,
            "rows": str(rows_kept),
            "source": SOURCE,
            "source_url": SOURCE_URL,
            "wiktionary_url": WIKTIONARY_URL,
            "licence": LICENCE,
            "licence_url": LICENCE_URL,
            "adaptation": ADAPTATION,
            "built": built,
            "exporter_commit": commit,
        }
        db.executemany("insert into meta values (?, ?)", sorted(meta.items()))
        db.commit()
        db.execute("detach database stage")
        if shared_db:
            db.execute("detach database forms")
        db.executescript(PACK_INDEXES)
        db.commit()
        db.execute("vacuum")
        db.close()

        db_sha = sha256_file(db_path)
        db_bytes = db_path.stat().st_size
        target = out / pack_file(lang)
        compress(db_path, target, level)

    manifest = {
        "format": FORMAT,
        "format_version": FORMAT_VERSION,
        "id": deck_id(lang),
        "title": f"{name} words",
        "kind": DECK_KIND,
        "language": lang,
        "language_name": name,
        "fields": CARD_FIELDS,
        "counts": {"cards": rows_kept, "with_ipa": counts["with_ipa"], "with_translations": counts["with_translations"], "with_etymology": counts["with_etymology"]},
        "rows": rows_kept,
        "version": db_sha[:12],
        "file": pack_file(lang),
        "bytes": target.stat().st_size,
        "sha256": sha256_file(target),
        "db_bytes": db_bytes,
        "db_sha256": db_sha,
        "source": SOURCE,
        "source_url": SOURCE_URL,
        "wiktionary_url": WIKTIONARY_URL,
        "licence": LICENCE,
        "licence_url": LICENCE_URL,
        "curator": CURATOR,
        "adaptation": ADAPTATION,
        "built": built,
        "exporter_commit": commit,
        "dropped": dropped,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def export_all(source, out_dir, *, languages=None, concepts=frozenset(), max_bytes=DEFAULT_MAX_BYTES, built=None, commit="unknown", log=print, level=ZSTD_LEVEL):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    wanted = list(languages) if languages else source.languages()
    report = {"relations": [], "packs": [], "stopped": None, "total_rows": 0, "total_bytes": 0, "dropped": {"empty_surface": 0, "empty_meaning": 0}}
    for lang in wanted:
        found = inspect_relations(source, lang)
        report["relations"].append(found)
        log(f"relations {lang}: {found['with_translations']} of {found['sampled']} sampled rows carry translation links, {found['with_etymology']} carry etymology links")
    with tempfile.TemporaryDirectory(dir=out_dir) as tmp:
        shared_db = Path(tmp) / "shared.sqlite"
        shared_forms(source, shared_db)
        for lang in wanted:
            m = build_pack(lang, source.rows(lang), out_dir, concepts=concepts, shared_db=shared_db, built=built, commit=commit, work_dir=tmp, level=level)
            report["packs"].append({**{k: m[k] for k in ("id", "language", "language_name", "rows", "bytes", "db_bytes", "sha256", "dropped")}, "with_translations": m["counts"]["with_translations"], "with_etymology": m["counts"]["with_etymology"]})
            report["total_rows"] += m["rows"]
            report["total_bytes"] += m["bytes"]
            for k in report["dropped"]:
                report["dropped"][k] += m["dropped"][k]
            log(f"pack {lang}: {m['rows']} rows, {m['bytes']} bytes, dropped {m['dropped']['empty_surface']} empty surface and {m['dropped']['empty_meaning']} empty meaning")
            if report["total_bytes"] > max_bytes:
                report["stopped"] = f"total passed {max_bytes} bytes after {lang}"
                log(f"stopped: {report['stopped']}")
                break
    (out_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def load_concepts(path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return frozenset()
    return frozenset(w["c"] for w in data.get("words", []) if isinstance(w, dict) and w.get("c"))


def repo_commit(repo):
    try:
        return subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def connect(env):
    try:
        import psycopg2
    except ImportError:
        raise SystemExit("export_packs: psycopg2 is missing; run python3 -m pip install psycopg2-binary")
    if not env.get("PGPASSWORD"):
        raise SystemExit("export_packs: set PGPASSWORD for the read; the script never stores it")
    return psycopg2.connect(
        host=env.get("PGHOST", "127.0.0.1"),
        port=int(env.get("PGPORT", "5433")),
        dbname=env.get("PGDATABASE", "polingual"),
        user=env.get("PGUSER", "bucket"),
        password=env["PGPASSWORD"],
        application_name="bkt-deck-export",
    )


def main(argv=None):
    repo = Path(__file__).resolve().parents[2]
    p = argparse.ArgumentParser(description="Export per-language Polingual word packs for the Bucket desktop app.")
    p.add_argument("--out", required=True, help="folder that receives one subfolder per language")
    p.add_argument("--lang", action="append", help="export this language only; repeat for more")
    p.add_argument("--inspect-only", action="store_true", help="report on the relations column and stop")
    p.add_argument("--concepts", default=str(repo / "learning/app/polingual/subset.json"), help="word list whose concepts rank first")
    p.add_argument("--max-total-bytes", type=int, default=DEFAULT_MAX_BYTES)
    p.add_argument("--level", type=int, default=ZSTD_LEVEL)
    a = p.parse_args(argv)
    conn = connect(os.environ)
    try:
        source = PgSource(conn)
        if a.inspect_only:
            for lang in a.lang or source.languages():
                print(json.dumps(inspect_relations(source, lang)))
            return 0
        report = export_all(source, a.out, languages=a.lang, concepts=load_concepts(a.concepts), max_bytes=a.max_total_bytes, commit=repo_commit(repo), level=a.level)
    finally:
        conn.close()
    print(f"total: {report['total_rows']} rows, {report['total_bytes']} bytes in {len(report['packs'])} packs")
    return 1 if report["stopped"] else 0


if __name__ == "__main__":
    sys.exit(main())
