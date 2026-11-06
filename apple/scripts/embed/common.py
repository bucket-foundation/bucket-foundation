import json, os
from pathlib import Path

ROOT = Path(os.environ.get("EMBED_ROOT", Path.home() / "agfarms/.wt-embed-data"))
OUT = ROOT / "out"
VEC = OUT / "vec"
LANGS = "es fr it pt de nl sv pl fi ru el ar hi ja zh ko he fa tr cs id vi th ta la grc sa ang".split()
SCRIPT = {"ru": "Cyrl", "el": "Grek", "grc": "Grek", "ar": "Arab", "fa": "Arab", "he": "Hebr", "hi": "Deva", "sa": "Deva",
          "ta": "Taml", "th": "Thai", "ja": "Jpan", "zh": "Hans", "ko": "Kore"}


def script_of(lang):
    return SCRIPT.get(lang, "Latn")


def words(lang):
    return (VEC / lang / "words.txt").read_text(encoding="utf-8").split("\n")


def index(lang):
    return {w: i for i, w in enumerate(words(lang))}


def candidates():
    return json.load(open(OUT / "candidates.json"))


def eval_set(lang):
    p = ROOT / "eval" / f"{lang}.json"
    return json.load(open(p)) if p.exists() else {}
