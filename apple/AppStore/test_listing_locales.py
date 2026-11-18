import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(os.path.dirname(HERE), "Polingual", "AppStore")
NAME = "Polingual"
LIMITS = {"subtitle": 30, "keywords": 100, "promo": 170}
EVENT_LIMITS = {"name": 30, "short": 50, "long": 120}
TRADEMARKS = {"duolingo", "babbel", "busuu", "memrise", "rosetta", "mondly", "drops", "quizlet", "anki", "wordle", "pimsleur", "lingq"}
DASHES = ("–", "—")


def load(name):
    with open(os.path.join(STORE, name), encoding="utf-8") as f:
        return json.load(f)


def words(text):
    return [w for w in re.split(r"[\W_]+", text.casefold()) if w]


def locale_problems(locale, entry):
    out = []
    for field, limit in LIMITS.items():
        if len(entry[field]) > limit:
            out.append(f"{locale} {field} is {len(entry[field])} characters, limit {limit}")
    keywords = entry["keywords"]
    terms = keywords.split(",")
    if any(t != t.strip() or not t for t in terms):
        out.append(f"{locale} keywords have a space beside a comma or an empty term")
    shown = (NAME + " " + entry["subtitle"]).casefold()
    shown_words = words(shown)
    keyword_words = [w for t in terms for w in words(t)]
    seen = set()
    for w in keyword_words:
        if w in seen:
            out.append(f"{locale} keyword word repeats: {w}")
        seen.add(w)
        if w in shown_words or w in shown:
            out.append(f"{locale} keyword word is already in the name or subtitle: {w}")
        if w in TRADEMARKS:
            out.append(f"{locale} keyword is a competitor trademark: {w}")
    everything = set(shown_words) | seen
    for w in sorted(everything):
        for suffix in ("s", "es"):
            if w + suffix in everything:
                out.append(f"{locale} holds a word and its plural: {w}, {w + suffix}")
    dupes = {w for w in shown_words if shown_words.count(w) > 1}
    if dupes:
        out.append(f"{locale} name and subtitle repeat: {sorted(dupes)}")
    return out


def copy_problems():
    out = []
    page = load("custom_product_page.json")
    for locale, entry in page["locales"].items():
        if len(entry["captions"]) != 3:
            out.append(f"product page {locale} needs three captions")
        if len(entry["promo"]) > LIMITS["promo"]:
            out.append(f"product page {locale} promo is {len(entry['promo'])} characters, limit {LIMITS['promo']}")
    for event in load("in_app_events.json")["events"]:
        for locale, entry in event["locales"].items():
            for field, limit in EVENT_LIMITS.items():
                if len(entry[field]) > limit:
                    out.append(f"event {event['referenceName']} {locale} {field} is {len(entry[field])} characters, limit {limit}")
    for name in ("locales.json", "custom_product_page.json", "in_app_events.json"):
        with open(os.path.join(STORE, name), encoding="utf-8") as f:
            if any(d in f.read() for d in DASHES):
                out.append(f"{name} holds an em dash or en dash")
    return out


def all_problems():
    out = []
    for locale, entry in load("locales.json").items():
        out += locale_problems(locale, entry)
    return out + copy_problems()


def test_listing_copy_fits_the_store_rules():
    assert all_problems() == []


def test_check_catches_a_repeat_and_an_overrun():
    bad = {"subtitle": "Learn Languages & Word Games", "keywords": "word,puzzle,puzzles, quiz," + "x" * 100, "promo": ""}
    found = " ".join(locale_problems("en-US", bad))
    for expected in ("limit 100", "already in the name or subtitle: word", "plural: puzzle, puzzles", "space beside a comma"):
        assert expected in found


if __name__ == "__main__":
    test_check_catches_a_repeat_and_an_overrun()
    problems = all_problems()
    print("\n".join(problems) or f"listing copy ok: {len(load('locales.json'))} locales")
    sys.exit(1 if problems else 0)
