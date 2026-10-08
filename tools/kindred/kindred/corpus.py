import json
import re
from pathlib import Path

FRONT = re.compile(r"\A---\n(.*?)\n---\n", re.S)
SENTENCE = re.compile(r"(?<=[.!?])\s+")
WINDOW = 28
PASSAGE_WORDS = 110
MIN_WORDS = 25


def parse_front_matter(text):
    m = FRONT.match(text)
    meta = {}
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"')
        text = text[m.end():]
    return meta, text


def article_passages(path):
    meta, body = parse_front_matter(Path(path).read_text(encoding="utf-8"))
    out = []
    for para in re.split(r"\n\s*\n", body):
        para = para.strip()
        if para.startswith("#") or len(para.split()) < MIN_WORDS:
            continue
        out.append({
            "author": meta.get("author", "Robert Wright"),
            "year": (meta.get("date") or "")[:4],
            "title": meta.get("title", Path(path).stem),
            "url": meta.get("url", ""),
            "text": para,
        })
    return out


def seconds(stamp):
    h, m, s = stamp.split(":")
    return int(h) * 3600 + int(m) * 60 + int(float(s))


def transcript_passages(directory):
    d = Path(directory)
    segs = json.loads((d / "transcript.json").read_text(encoding="utf-8"))
    meta_path = d / "metadata.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    vid = meta.get("id") or d.name.split("-", 1)[0]
    title = meta.get("title") or d.name
    year = str(meta.get("upload_date", ""))[:4]
    channel = meta.get("uploader") or meta.get("channel") or "Nonzero"
    out, words, start = [], [], 0
    for s in segs:
        if not words:
            start = seconds(s["start"])
        words.extend(s["text"].split())
        if len(words) >= PASSAGE_WORDS:
            out.append({"author": channel, "year": year, "title": title, "url": f"https://youtu.be/{vid}?t={start}", "text": " ".join(words)})
            words = []
    if len(words) >= MIN_WORDS:
        out.append({"author": channel, "year": year, "title": title, "url": f"https://youtu.be/{vid}?t={start}", "text": " ".join(words)})
    return out


def load_wright(root):
    root = Path(root)
    out = []
    for p in sorted((root / "_intake" / "robert-wright" / "articles").glob("*.md")):
        out.extend(article_passages(p))
    for link in sorted((root / "_intake" / "robert-wright" / "yt-links").iterdir()):
        target = link.resolve()
        if (target / "transcript.json").exists():
            out.extend(transcript_passages(target))
    return out


def spans(text):
    out = []
    for sentence in SENTENCE.split(text.strip()):
        words = sentence.split()
        if len(words) <= WINDOW * 1.6:
            if len(words) >= 5:
                out.append(sentence)
        else:
            for i in range(0, len(words), WINDOW):
                chunk = words[i:i + WINDOW]
                if len(chunk) >= 5:
                    out.append(" ".join(chunk))
    return out
