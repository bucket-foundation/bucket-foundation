#!/usr/bin/env python3
import argparse
import html
import json
import os
import re
import sys
import tarfile
import time
import unicodedata
import urllib.parse
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import input_bundle as ib

ROOT = ib.ROOT
CACHE = ROOT / "_intake/open-stories"
MANIFEST = ROOT / "polingual/public/input/stories/manifest.json"
BUNDLES = Path(os.environ.get("POLINGUAL_STORIES_DIR", Path.home() / ".cache/polingual-open-stories"))
BUCKET = "polingual-input"
PREFIX = "stories/"
BASE_ENV = "NEXT_PUBLIC_POLINGUAL_INPUT_BASE"
CACHE_CONTROL = "public, max-age=31536000, immutable"
POLINGUAL_LANGS = ["ar", "cs", "de", "el", "en", "es", "fa", "fi", "fr", "he", "hi", "id", "it", "ja", "ko", "la",
                   "nl", "pa", "pl", "pt", "ru", "sa", "sv", "ta", "th", "tr", "vi", "zh"]
REPO_VERSION = {"global-asp": "4.0", "global-pb": "4.0", "pb-source": "4.0", "asp-source": None}
REPO_SOURCE = {"global-asp": "global-storybooks", "asp-source": "african-storybook", "pb-source": "storyweaver", "global-pb": "storyweaver"}
RESTRICTED = re.compile(r"all rights reserved|non.?commercial|no.?deriv|share.?alike|\bNC\b|\bND\b|\bSA\b", re.I)
PAIR_RATIO = (0.25, 4.0)
PAIR_SHARE = 0.8
EXCLUDED = Counter()
BETA_SHARE = 0.9
UA = "polingual-open-stories/1 (+https://polingual.com)"
DELAY = 1.0
REPOS = {"asp-source": "gsb", "global-asp": "gsb", "pb-source": "sw", "global-pb": "sw"}
ASB = "https://www.africanstorybook.org"
ASB_LANGS = {"English": "en", "French": "fr", "Portuguese": "pt", "Spanish": "es", "Arabic": "ar", "German": "de"}
ASB_CEFR = {1: "A1", 2: "A1", 3: "A2", 4: "B1", 5: "B1"}
SW = "https://storyweaver.org.in"
SW_CEFR = {1: "A1", 2: "A1", 3: "A2", 4: "B1"}
CEFR_STEPS = ["A1", "A2", "B1", "B2"]
COVERAGE_FLOOR = 0.85
MACHINE = re.compile(r"machine|google|deepl|automatic|auto-?translat|\bMT\b", re.I)
MARKS = "".join(re.escape(chr(c)) for c in range(0x300, 0x3000) if unicodedata.category(chr(c)) in ("Mn", "Mc")) + "\u200c\u200d"
WORD = re.compile(rf"(?:[^\W\d_]|[{MARKS}])+(?:['’\-](?:[^\W\d_]|[{MARKS}])+)*['’]?")
CJK = re.compile(r"[぀-ヿ㐀-鿿豈-﫿]+")
CJK_MAX = 4


def log(*a):
    print(*a, file=sys.stderr, flush=True)


class Fetcher:
    def __init__(self, delay=DELAY):
        self.delay = delay
        self.last = 0.0

    def get(self, url, dest):
        if dest.exists() and dest.stat().st_size > 0:
            return dest
        wait = self.last + self.delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    body = r.read()
                break
            except Exception as e:
                log("retry", url, e)
                time.sleep(5 * (attempt + 1))
        else:
            raise RuntimeError(f"fetch failed {url}")
        self.last = time.monotonic()
        tmp = dest.with_suffix(dest.suffix + ".part")
        tmp.write_bytes(body)
        tmp.replace(dest)
        return dest


def repo_dir(repo):
    return CACHE / REPOS[repo] / f"{repo}-master"


def fetch_repos(f):
    for repo, sub in REPOS.items():
        tgz = f.get(f"https://codeload.github.com/global-asp/{repo}/tar.gz/refs/heads/master", CACHE / sub / f"{repo}.tgz")
        if not repo_dir(repo).exists():
            with tarfile.open(tgz) as t:
                t.extractall(CACHE / sub, filter="data")


def parse_asb_catalog():
    home = (CACHE / "asb_home.html").read_text(encoding="utf-8", errors="replace")
    langs = dict(re.findall(r"<option value='(\d+)'>([^<]+)</option>", home))
    raw = (CACHE / "booklist.js").read_bytes().decode("utf-8", "replace")
    rows = []
    for m in re.finditer(r"push\((\{.*?\})\);", raw):
        try:
            rows.append(json.loads(re.sub(r'([{,])([a-z]+):', r'\1"\2":', m.group(1))))
        except json.JSONDecodeError:
            continue
    for r in rows:
        r["language"] = langs.get(r["lang"], "")
        r["title"] = html.unescape(r["title"].replace("\\'", "'"))
    return rows


def fetch_asb(f):
    f.get(ASB + "/", CACHE / "asb_home.html")
    f.get(ASB + "/booklistjs.php", CACHE / "booklist.js")
    books = [r for r in parse_asb_catalog() if r["language"] in ASB_LANGS and r["approved"] == "1"]
    log("asb approved books", len(books))
    for n, r in enumerate(books):
        f.get(f"{ASB}/newviewer/index.php?id={r['id']}", CACHE / "asb" / f"{r['id']}.html")
        if n % 50 == 0:
            log("asb", n, len(books))


def md_story(path):
    text = path.read_text(encoding="utf-8")
    title = (re.match(r"#\s*(.+)", text) or [None, path.stem])[1].strip()
    blocks = re.split(r"\n##\s*\n", "\n" + text)
    meta, pages = {}, []
    for b in blocks[1:]:
        lines = [l for l in b.strip().splitlines()]
        if lines and all(l.startswith("* ") for l in lines) and any(l.startswith("* License") for l in lines):
            for l in lines:
                k, _, v = l[2:].partition(":")
                meta[k.strip().lower()] = v.strip()
            continue
        pages.append(" ".join(l.strip() for l in lines if l.strip() and not l.startswith("![")))
    return {"title": title, "pages": [p for p in pages if p], "meta": meta, "num": path.name[:4], "file": path}


def names(s):
    return [n.strip() for n in re.split(r",|;| and ", s or "") if n.strip()]


def licence(name, version):
    if name == "CC0":
        return {"label": "CC0 1.0", "name": "CC0", "version": "1.0", "url": "https://creativecommons.org/publicdomain/zero/1.0/"}
    label = f"CC BY {version}" if version else "CC BY"
    url = f"https://creativecommons.org/licenses/by/{version}/" if version else "https://creativecommons.org/licenses/by/"
    return {"label": label, "name": "CC BY", "version": version, "url": url}


def md_licence(value, repo):
    v = (value or "").strip()
    if v == "[CC-BY]":
        return licence("CC BY", REPO_VERSION.get(repo))
    if v in ("[CC0]", "[CC-0]"):
        return licence("CC0", "1.0")
    return None


def asb_licence(copy_lines):
    text = " ".join(copy_lines)
    if RESTRICTED.search(text):
        return None
    for line in copy_lines:
        m = re.fullmatch(r"Creative Commons: Attribution (\d\.\d)", line)
        if m:
            return licence("CC BY", m.group(1))
        if line == "Attribution CC BY":
            return licence("CC BY", None)
        if re.fullmatch(r"(Creative Commons: )?CC0( 1\.0)?", line):
            return licence("CC0", "1.0")
    return None


def asb_page_html(path):
    h = path.read_text(encoding="utf-8", errors="replace")
    pages = []
    for m in re.finditer(r'<div class="page-wrapper"[^>]*><div class="[^"]*page-borders">(.*?)<div class="page-number">', h, re.S):
        body = m.group(1)
        img = re.search(r'src="(https://www\.africanstorybook\.org/illustrations/pages/[^"]+)"', body)
        paras = [" ".join(html.unescape(re.sub(r"<[^>]+>", " ", p)).split())
                 for p in re.findall(r"<p[^>]*>(.*?)</p>", body, re.S)]
        text = " ".join(p for p in paras if p)
        if text:
            pages.append({"text": text, "image": img.group(1) if img else None})
    roles = defaultdict(list)
    block = re.search(r'bookcover_author">(.*?)</div>', h, re.S)
    if block:
        role = None
        for part in re.split(r"<br\s*/?>", block.group(1)):
            lab = re.search(r'backcover_bold">\s*([^<]*?)\s*-\s*</span>(.*)', part, re.S)
            if lab:
                role, val = lab.group(1).strip().lower(), lab.group(2)
            else:
                val = part
            val = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", val)).split())
            if val and role is not None:
                roles[role or "contributor"].append(val)
    copy = re.search(r'backcover_copyright">(.*?)</div>', h, re.S)
    lines = []
    if copy:
        for part in re.split(r"<br\s*/?>", copy.group(1)):
            line = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", part)).split())
            if line:
                lines.append(line)
    return pages, dict(roles), lines


def asb_books():
    out = []
    for r in parse_asb_catalog():
        if r["language"] not in ASB_LANGS or r["approved"] != "1":
            continue
        p = CACHE / "asb" / f"{r['id']}.html"
        if not p.exists():
            continue
        pages, roles, copy = asb_page_html(p)
        if not pages:
            continue
        lic = asb_licence(copy)
        translators = [n for v in roles.get("translation", []) for n in names(v)]
        if lic is None:
            EXCLUDED["african-storybook licence"] += 1
            continue
        if any(MACHINE.search(t) for t in translators):
            EXCLUDED["machine translation"] += 1
            continue
        out.append({
            "source": "african-storybook", "id": f"asb-{r['id']}", "lang": ASB_LANGS[r["language"]],
            "title": r["title"], "url": f"{ASB}/reader.php?id={r['id']}",
            "authors": [n for k in ("author", "contributor") for v in roles.get(k, []) for n in names(v)],
            "illustrators": [n for v in roles.get("illustration", []) for n in names(v)],
            "translators": translators, "licence": lic,
            "rightsHolder": next((l for l in copy if l.startswith("©")), ""),
            "level": {"scale": "African Storybook 1-5", "value": int(r["level"]), "cefr": ASB_CEFR.get(int(r["level"]), "B1")},
            "pages": [p["text"] for p in pages], "images": [p["image"] for p in pages],
            "approved": True,
        })
    return out


def asb_title_levels():
    levels = {}
    for r in parse_asb_catalog():
        if r["language"] == "English" and r["level"].isdigit():
            key = norm_title(r["title"])
            if key not in levels or r["approved"] == "1":
                levels[key] = (int(r["level"]), r["id"])
    return levels


def norm_title(t):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", t.lower())).strip()


def md_id(repo, lang, num):
    return f"{REPO_SOURCE[repo]}-{repo}-{lang}-{num}"


def md_book(story, repo, lang, url, level, lic):
    m = story["meta"]
    return {
        "source": REPO_SOURCE[repo], "id": md_id(repo, lang, story["num"]), "lang": lang, "title": story["title"],
        "url": url, "authors": names(m.get("text")), "illustrators": names(m.get("illustration")),
        "translators": names(m.get("translation")), "licence": lic, "rightsHolder": "",
        "level": level, "pages": story["pages"], "images": [None] * len(story["pages"]), "num": story["num"],
        "repo": repo,
    }


def md_english(repo):
    out = {}
    for p in sorted((repo_dir(repo) / "en").glob("[0-9]*.md")):
        s = md_story(p)
        lic = md_licence(s["meta"].get("license"), repo)
        if lic is None:
            continue
        b = md_book(s, repo, "en", f"https://github.com/global-asp/{repo}/blob/master/en/{p.name}", None, lic)
        out[s["num"]] = b
    return out


def accept_md(s, repo):
    lic = md_licence(s["meta"].get("license"), repo)
    if lic is None:
        EXCLUDED[f"{repo} licence {s['meta'].get('license', '').strip() or 'missing'}"] += 1
        return None
    if MACHINE.search(s["meta"].get("translation", "")):
        EXCLUDED["machine translation"] += 1
        return None
    return lic


def gsb_books():
    levels = asb_title_levels()
    en = md_english("asp-source")
    out = []
    if "Attribution 4.0" not in (repo_dir("global-asp") / "LICENSE").read_text():
        log("global storybooks licence unconfirmed, skipped")
        return [], en
    for lang in POLINGUAL_LANGS:
        d = repo_dir("global-asp") / lang
        if not d.is_dir() or lang == "en":
            continue
        for p in sorted(d.glob("[0-9]*.md")):
            s = md_story(p)
            lic = accept_md(s, "global-asp")
            if lic is None:
                continue
            orig = en.get(s["num"])
            lv = levels.get(norm_title(orig["title"])) if orig else None
            level = ({"scale": "African Storybook 1-5", "value": lv[0], "cefr": ASB_CEFR.get(lv[0], "B1")}
                     if lv else {"scale": "African Storybook 1-5", "value": None, "cefr": None})
            b = md_book(s, "global-asp", lang, f"https://github.com/global-asp/global-asp/blob/master/{lang}/{p.name}", level, lic)
            b["original"] = {"title": orig["title"], "lang": "en"} if orig else None
            b["isTranslation"] = True
            out.append(b)
    return out, en


def sw_search(f, title):
    q = urllib.parse.urlencode({"query": title, "languages[]": "English", "per_page": 5})
    key = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]
    p = f.get(f"{SW}/api/v1/books-search?{q}", CACHE / "sw" / "search" / f"{key}.json")
    data = json.loads(p.read_text()).get("data", [])
    exact = [b for b in data if norm_title(b["title"]) == norm_title(title)]
    exact.sort(key=lambda b: (b.get("publisher") or {}).get("name") != "Pratham Books")
    return exact[0] if exact else None


def fetch_sw(f):
    for p in sorted((repo_dir("pb-source") / "en").glob("[0-9]*.md")):
        sw_search(f, md_story(p)["title"])


def sw_books(f):
    en_md = {s["num"]: s for s in map(md_story, sorted((repo_dir("pb-source") / "en").glob("[0-9]*.md")))}
    hits = {num: sw_search(f, s["title"]) for num, s in en_md.items()}
    out = []
    for repo in ("pb-source", "global-pb"):
        for lang in POLINGUAL_LANGS:
            d = repo_dir(repo) / lang
            if not d.is_dir():
                continue
            for p in sorted(d.glob("[0-9]*.md")):
                s = md_story(p)
                lic = accept_md(s, repo)
                if lic is None:
                    continue
                hit = hits.get(s["num"])
                lv = int(hit["level"]) if hit and str(hit.get("level", "")).isdigit() else None
                level = {"scale": "StoryWeaver 1-4", "value": lv, "cefr": SW_CEFR.get(lv)}
                url = f"{SW}/en/stories/{hit['slug']}" if hit and lang == "en" else f"https://github.com/global-asp/{repo}/blob/master/{lang}/{p.name}"
                b = md_book(s, repo, lang, url, level, lic)
                b["via"] = f"https://github.com/global-asp/{repo}"
                if hit:
                    sizes = (hit.get("coverImage") or {}).get("sizes") or []
                    if sizes:
                        b["cover"] = {"url": sizes[0]["url"], "credit": ", ".join(i["name"] for i in hit.get("illustrators", []))}
                if lang != "en" and s["num"] in en_md:
                    b["original"] = {"title": en_md[s["num"]]["title"], "lang": "en"}
                b["isTranslation"] = repo == "global-pb" or bool(b["translators"])
                out.append(b)
    return out, md_english("pb-source")


def digits(text):
    return re.findall(r"\d+", text)


def plausible(pages, en_pages):
    if not en_pages or len(en_pages) != len(pages):
        return False
    ok = 0
    for a, b in zip(pages, en_pages):
        r = len(a) / max(len(b), 1)
        if PAIR_RATIO[0] <= r <= PAIR_RATIO[1] and digits(a) == digits(b):
            ok += 1
    return ok >= PAIR_SHARE * len(pages)


def pair_pages(book, en_pages):
    return en_pages if plausible(book["pages"], en_pages) else None


def attach_pair(b, e):
    b["translationPages"] = e["pages"]
    b["pairedWith"] = e["id"]
    b["pairedBook"] = {"id": e["id"], "title": e["title"], "url": e["url"], "authors": e["authors"],
                       "translators": e["translators"], "license": e["licence"]["label"]}


def asb_pairs(books):
    en_by_imgs = {}
    for b in books:
        if b["lang"] == "en" and all(b["images"]):
            en_by_imgs.setdefault(tuple(b["images"]), b)
    for b in books:
        if b["lang"] == "en" or not all(b["images"]):
            continue
        e = en_by_imgs.get(tuple(b["images"]))
        if e and pair_pages(b, e["pages"]):
            b["isTranslation"] = True
            attach_pair(b, e)


def md_pairs(books, en):
    for b in books:
        if b["lang"] == "en":
            continue
        e = en.get(b["num"])
        if e and pair_pages(b, e["pages"]):
            attach_pair(b, e)


def flag_review(books):
    for b in books:
        if b.get("isTranslation") and not b["translators"]:
            b["review"] = ["no translator credited"]


class Tokenizer:
    def __init__(self, lex, lang):
        self.lex = lex
        self.cjk = lang in ("zh", "ja")

    def split_cjk(self, run):
        out, i = [], 0
        while i < len(run):
            for n in range(min(CJK_MAX, len(run) - i), 0, -1):
                if n == 1 or self.lex.known(run[i:i + n]):
                    out.append(run[i:i + n])
                    i += n
                    break
        return out

    def tokens(self, text):
        toks = []
        for m in WORD.finditer(text):
            prev = text[: m.start()].rstrip(ib.OPENERS)
            initial = not prev or prev[-1] in ib.ENDERS + "。！？"
            word = m.group(0)
            parts = []
            if self.cjk and CJK.search(word):
                pos = 0
                for c in CJK.finditer(word):
                    if c.start() > pos:
                        parts.append(word[pos:c.start()])
                    parts += self.split_cjk(c.group(0))
                    pos = c.end()
                if pos < len(word):
                    parts.append(word[pos:])
            else:
                parts = ib.split_word(word, self.lex.known)
            for k, s in enumerate(parts):
                lemma, mapped = self.lex.lemma(s, initial and k == 0)
                toks.append({"surface": s, "lemma": lemma, **({} if mapped else {"unmapped": True})})
        return toks


def credit_for(b):
    parts = [f"\"{b['title']}\""]
    if b["authors"]:
        parts.append("written by " + ", ".join(b["authors"]))
    if b["illustrators"]:
        parts.append("illustrated by " + ", ".join(b["illustrators"]))
    if b["translators"]:
        parts.append("translated by " + ", ".join(b["translators"]))
    src = {"african-storybook": "African Storybook", "global-storybooks": "Global Storybooks",
           "storyweaver": "StoryWeaver"}[b["source"]]
    tail = f", {b['rightsHolder']}" if b.get("rightsHolder") else ""
    line = f"{', '.join(parts)}. {src}, {b['url']}{tail}, {b['licence']['label']} ({b['licence']['url']})"
    e = b.get("pairedBook")
    if e:
        who = f" by {', '.join(e['authors'])}" if e["authors"] else ""
        tr = f", translated by {', '.join(e['translators'])}" if e["translators"] else ""
        line += f". English text \"{e['title']}\"{who}{tr}, {e['url']}, {e['license']}"
    return line


def bump(cefr, share):
    if cefr is None:
        return None
    if share < COVERAGE_FLOOR:
        return CEFR_STEPS[min(CEFR_STEPS.index(cefr) + 1, len(CEFR_STEPS) - 1)]
    return cefr


def book_units(b, tk, seen):
    items, units, cur = [], [], []
    tps = b.get("translationPages")
    for n, text in enumerate(b["pages"]):
        key = ib.fold(text)
        if key in seen:
            return [], []
        toks = tk.tokens(text)
        if not toks:
            continue
        item = {"id": f"{b['id']}:{n + 1}", "lang": b["lang"], "kind": "passage", "text": text, "tokens": toks,
                "lemmas": sorted({t["lemma"] for t in toks}),
                "source": {"name": b["source"], "url": b["url"], "title": b["title"],
                           "authors": {b["lang"]: ", ".join(b["authors"] + b["translators"]) or None}},
                "license": b["licence"]["label"], "page": n + 1}
        if tps:
            item["translation"] = tps[n]
        if b["images"][n]:
            item["image"] = {"url": b["images"][n], "credit": ", ".join(b["illustrators"]) or "African Storybook"}
        items.append(item)
    seen.update(ib.fold(t) for t in b["pages"])
    for it in items:
        cur.append(it)
        if sum(map(ib.ntok, cur)) >= ib.MIN_TOKENS:
            units.append(cur)
            cur = []
    if cur:
        if units:
            units[-1].extend(cur)
        elif sum(map(ib.ntok, cur)) >= ib.MIN_TOKENS:
            units.append(cur)
    credit = credit_for(b)
    credits = [{"url": b["url"], "author": a} for a in (b["authors"] + b["illustrators"] + b["translators"]) or [None]]
    e = b.get("pairedBook")
    if e:
        credits += [{"url": e["url"], "author": a, "lang": "en"} for a in e["authors"] + e["translators"]]
    out = []
    for k, u in enumerate(units):
        cov = ib.coverage(u)
        out.append({"id": f"story:{b['id']}:{k}", "kind": "passage", "itemIds": [i["id"] for i in u],
                    "targetLemmas": [], "tokenCount": sum(map(ib.ntok, u)), "credit": credit, "credits": credits,
                    "bookId": b["id"], "cefr": bump(b["level"]["cefr"], cov["tokenShare"]),
                    "sourceLevel": b["level"], "coverage": cov["tokenShare"], "paired": bool(tps)})
    keep = {i["id"] for u in units for i in u}
    return [i for i in items if i["id"] in keep], out


def book_meta(b):
    m = {k: b[k] for k in ("id", "source", "lang", "title", "url", "authors", "illustrators", "translators")}
    m["license"] = b["licence"]["label"]
    m["licenseVersion"] = b["licence"]["version"]
    m["licenseUrl"] = b["licence"]["url"]
    m["level"] = b["level"]
    m["pages"] = len(b["pages"])
    for k in ("pairedWith", "pairedBook", "via", "cover", "rightsHolder", "original", "review"):
        if b.get(k):
            m[k] = b[k]
    if b["source"] == "african-storybook":
        m["approved"] = True
    return m


class NullLex:
    def known(self, s):
        return False

    def lemma(self, s, initial=False):
        return s, False


def lexicon(lang, a):
    if a.packs and (a.packs / lang / f"polingual-{lang}.sqlite.zst").exists():
        return ib.open_lexicon(lang, a.packs, a.scratch, a.index)
    return None


def build(a):
    f = Fetcher()
    asb = asb_books()
    asb_pairs(asb)
    gsb, gsb_en = gsb_books()
    md_pairs(gsb, gsb_en)
    sw, sw_en = sw_books(f)
    md_pairs(sw, sw_en)
    flag_review(asb + gsb + sw)
    by_lang = defaultdict(list)
    for b in asb + sw + gsb:
        if b["lang"] in a.langs:
            by_lang[b["lang"]].append(b)
    BUNDLES.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    base = os.environ.get(BASE_ENV)
    manifest = {"format": "polingual-input", "kind": "open-stories", "licences": "CC BY or CC0 only, read per book", "langs": {}, "betaRule": f"tokenShare below {BETA_SHARE} or no word pack ships as beta with coverage shown",
                "bucket": BUCKET, "prefix": PREFIX,
                "bundleBase": None if not base or re.match(r"https?://(127\.0\.0\.1|localhost)[:/]", base) else base,
                "bundleBaseEnv": BASE_ENV,
                "sources": {
                    "african-storybook": {"url": ASB, "filter": "ASb approved books only; licence line parsed exactly"},
                    "global-storybooks": {"url": "https://globalstorybooks.net", "licenceCheck": "global-asp/global-asp LICENSE: Creative Commons Attribution 4.0; per-book [CC-BY] tag"},
                    "storyweaver": {"url": SW, "text": "github.com/global-asp/pb-source and global-pb, extracted from StoryWeaver ePubs; per-book [CC-BY] tag"},
                },
                "translationRule": "item.translation holds the human English edition of the same page; no pair, no translation",
                "machineFilter": MACHINE.pattern, "pairing": {"ratio": list(PAIR_RATIO), "share": PAIR_SHARE, "digitsMatch": True}}
    for lang in sorted(by_lang):
        lex = lexicon(lang, a)
        tk = Tokenizer(lex or NullLex(), lang)
        items, units, books, seen = [], [], [], set()
        for b in sorted(by_lang[lang], key=lambda b: (b["source"] != "african-storybook", b["source"], b["id"])):
            its, us = book_units(b, tk, seen)
            if us:
                items += its
                units += us
                books.append(book_meta(b))
        if not units:
            continue
        bundle = {"format": "polingual-input", "version": 1, "lang": lang,
                  "attribution": [
                      "Stories from African Storybook (africanstorybook.org), Global Storybooks (globalstorybooks.net) and StoryWeaver (storyweaver.org.in), CC BY or CC0 per book. Each unit carries its book credit line and licence.",
                      "Lemmas from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0.",
                  ],
                  "coverage": ib.coverage(items), "tatoebaItems": 0, "tatoebaIdsMatched": 0,
                  "books": books, "items": items, "units": units}
        name = ib.write_bundle(bundle, BUNDLES)
        paired_units = sum(u["paired"] for u in units)
        stats = {"file": name, "books": len(books), "units": len(units), "items": len(items),
                 "tokens": bundle["coverage"]["tokens"], "tokenShare": bundle["coverage"]["tokenShare"],
                 "typeShare": bundle["coverage"]["typeShare"],
                 "pairedUnits": paired_units, "pairedShare": round(paired_units / len(units), 4),
                 "bySource": {s: sum(1 for b in books if b["source"] == s) for s in sorted({b["source"] for b in books})}}
        stats["wordPack"] = lex is not None
        stats["beta"] = lex is None or stats["tokenShare"] < BETA_SHARE
        manifest["langs"][lang] = stats
        log(lang, json.dumps(stats))
    manifest["booksExcluded"] = dict(sorted(EXCLUDED.items()))
    manifest["booksForReview"] = {lang: [b["id"] for b in bs if b.get("review")] for lang, bs in by_lang.items()
                                  if lang in manifest["langs"] and any(b.get("review") for b in bs)}
    log("excluded", json.dumps(manifest["booksExcluded"]))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


def request(method, url, key, body=None, headers=None):
    req = urllib.request.Request(url, data=body, method=method,
                                 headers={"Authorization": f"Bearer {key}", "apikey": key, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def upload():
    api = (os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not api or not key:
        sys.exit("open_stories: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (npm run db:local:status)")
    body = json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode()
    code, out = request("POST", f"{api}/storage/v1/bucket", key, body, {"Content-Type": "application/json"})
    if code not in (200, 201) and b"already exists" not in out.lower() and b"duplicate" not in out.lower():
        sys.exit(f"open_stories: bucket create failed {code} {out[:200]!r}")
    sent = skipped = 0
    for entry in json.loads(MANIFEST.read_text())["langs"].values():
        name = PREFIX + entry["file"]
        if request("HEAD", f"{api}/storage/v1/object/public/{BUCKET}/{name}", key)[0] == 200:
            skipped += 1
            continue
        code, out = request("POST", f"{api}/storage/v1/object/{BUCKET}/{name}", key, (BUNDLES / entry["file"]).read_bytes(),
                            {"Content-Type": "application/json", "cache-control": CACHE_CONTROL, "x-upsert": "true"})
        if code not in (200, 201):
            sys.exit(f"open_stories: {name} failed {code} {out[:200]!r}")
        sent += 1
    print(f"uploaded {sent}, already present {skipped}, base {api}/storage/v1/object/public/{BUCKET}/{PREFIX}")


def check_bundles_dir(path=None):
    d = (path or BUNDLES).resolve()
    if d == ROOT.resolve() or ROOT.resolve() in d.parents:
        sys.exit(f"open_stories: POLINGUAL_STORIES_DIR {d} is inside the repo; bundles live outside git")


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["fetch", "build", "upload"])
    ap.add_argument("--langs", default=",".join(POLINGUAL_LANGS))
    ap.add_argument("--packs")
    ap.add_argument("--index")
    ap.add_argument("--scratch")
    a = ap.parse_args(argv)
    a.langs = a.langs.split(",")
    a.packs = ib.env_path(a.packs, "POLINGUAL_PACKS_DIR")
    a.index = ib.env_path(a.index, "PHOTONS_INDEX")
    a.scratch = ib.env_path(a.scratch, "INPUT_SCRATCH_DIR") or CACHE / "scratch"
    a.scratch.mkdir(parents=True, exist_ok=True)
    check_bundles_dir()
    if a.cmd == "fetch":
        f = Fetcher()
        fetch_repos(f)
        fetch_sw(f)
        fetch_asb(f)
    elif a.cmd == "upload":
        upload()
    else:
        build(a)


if __name__ == "__main__":
    main()
