import argparse
import bz2
import html
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "learning/app/polingual/sources"
THAI = re.compile(r"^[฀-๿]+$")
GURMUKHI = re.compile(r"[਀-੿]+")
KEEP = 8000


def write(name: str, rows: list[tuple]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text("".join("\t".join(map(str, r)) + "\n" for r in rows), encoding="utf-8")
    print(name, len(rows))


def thai(src: Path) -> None:
    rows = []
    for line in src.read_text(encoding="utf-8").splitlines():
        word, _, count = line.rpartition(" ")
        if THAI.match(word) and not word.startswith("เธ"):
            rows.append((word, count))
    write("th_opensubtitles.tsv", rows[:KEEP])


def latin(src: Path) -> None:
    s = src.read_text(encoding="utf-8")
    rows = []
    for tr in re.findall(r"<tr.*?</tr>", s, re.S)[1:]:
        cells = [html.unescape(re.sub("<[^>]+>", "", c)).strip() for c in re.findall(r"<td.*?</td>", tr, re.S)]
        if len(cells) == 5 and cells[4].isdigit():
            rows.append((int(cells[4]), cells[0], cells[1], cells[2]))
    rows.sort()
    write("la_dcc_core.tsv", rows)


def sanskrit(src: Path) -> None:
    counts: Counter[str] = Counter()
    for f in src.rglob("*.conllu"):
        for line in f.open(encoding="utf-8"):
            parts = line.split("\t")
            if len(parts) == 10 and parts[0].isdigit() and parts[3] not in ("PUNCT", "X"):
                counts[parts[2]] += 1
    write("sa_dcs_lemmas.tsv", counts.most_common(KEEP))


def punjabi(src: Path) -> None:
    counts: Counter[str] = Counter()
    with bz2.open(src, "rt", encoding="utf-8") as fh:
        for line in fh:
            for w in GURMUKHI.findall(unicodedata.normalize("NFC", line)):
                counts[w] += 1
    write("pa_wikipedia.tsv", counts.most_common(KEEP))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--th")
    ap.add_argument("--la")
    ap.add_argument("--sa")
    ap.add_argument("--pa")
    a = ap.parse_args()
    for fn, path in ((thai, a.th), (latin, a.la), (sanskrit, a.sa), (punjabi, a.pa)):
        if path:
            fn(Path(path))


if __name__ == "__main__":
    main()
