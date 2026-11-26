#!/usr/bin/env python3
import argparse
import gzip
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
import urllib.robotparser
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import input_bundle as ib
import open_stories as st

ROOT = ib.ROOT
CACHE = ROOT / "_intake/open-news"
MANIFEST = ROOT / "polingual/public/input/news/manifest.json"
BUNDLES = Path(os.environ.get("POLINGUAL_NEWS_DIR", Path.home() / ".cache/polingual-open-news"))
PREFIX = "news/"
UA = "polingual-open-news/1 (+https://polingual.com)"
GV_HOSTS = {"ar": "ar", "cs": "cs", "de": "de", "el": "el", "es": "es", "fa": "fa", "fr": "fr", "he": "he", "hi": "hi",
            "id": "id", "it": "it", "ja": "jp", "ko": "ko", "nl": "nl", "pa": "pa", "pl": "pl", "pt": "pt", "ru": "ru",
            "sv": "sv", "tr": "tr", "zh": "zhs"}
VOA_HOSTS = {"en": "learningenglish.voanews.com", "es": "www.vozdeamerica.com", "fr": "www.voaafrique.com",
             "pt": "www.voaportugues.com", "zh": "www.voachinese.com", "id": "www.voaindonesia.com",
             "ko": "www.voakorea.com", "vi": "www.voatiengviet.com", "tr": "www.voaturkce.com",
             "ru": "www.golosameriki.com", "fa": "ir.voanews.com"}
GV_PER_LANG = 50
VOA_PER_LANG = 40
LE_ARTICLES = 200
THREADS = 8
GV_LICENCE = re.compile(r"<a rel='license' href='https://creativecommons\.org/licenses/by/(\d\.\d)/[^']*'")
AGENCY = re.compile(r"(?<![A-Za-z])(Associated Press|AP|Reuters|AFP|Agence France-Presse|France-Presse|France Presse|Getty|EFE|Europa Press|ANSA|dpa|Xinhua|Anadolu|Antara|Kyodo|Yonhap|Bloomberg|TASS|Lusa)(?![A-Za-z])"
                    r"|(?<![А-Яа-яЁё])(АП|ТАСС|Луза)(?![А-Яа-яЁё])"
                    r"|美联社|美聯社|路透社|路透|法新社|新华社|新華社|共同社|共同通信|ロイター|AP通信|ＡＰ|ＡＦＰ|AP통신|로이터|AFP통신|연합뉴스|블룸버그"
                    r"|Ассошиэйтед Пресс|Ассошиэйтед|Рейтер|Франс Пресс|Франс-Пресс|АФП|Синьхуа|Блумберг"
                    r"|آسوشیتدپرس|آسوشیتد پرس|اسوشیتدپرس|رویترز|خبرگزاری فرانسه|فرانس‌پرس|فرانس پرس|بلومبرگ"
                    r"|أسوشيتد برس|اسوشيتد برس|رويترز|فرانس برس|وكالة الصحافة الفرنسية|بلومبرغ"
                    r"|אסושייטד פרס|רויטרס|סוכנות הידיעות הצרפתית"
                    r"|Thông tấn xã Pháp|Ajans France-Presse|Anadolu Ajansı")
WIRE_DATELINE = re.compile(r"[(（](AP|Reuters|AFP|EFE|dpa|美联社|路透社|法新社|АП|Рейтер|АФП|رویترز|رويترز)[)）]\s*[-—–:：]?")
THIRD_PARTY = re.compile(r"©\s*(?!\s*(?:\d{4}\s*)?(?:Voice of America|VOA|USAGM|U\.S\. Agency for Global Media))[^<\n]{2,60}|Special to VOA|freelance|stringer|contractor", re.I)
PARTNER = re.compile(r"(republi|publié|publicad|veröffentlich|опубликован|转载|轉載|再掲|게재|منتشر|نُشر|פורסם|yayımlan|diterbitkan|originally published)[^.]{0,200}(partner|partenari|asociaci|colabora|kooperation|партн|合作|伙伴|夥伴|提携|파트너|همکاری|شراك|שותפ|ortakl|kemitraan)", re.I)
SHORT_MIN = {"cjk": 8, "hebrew": 15, "other": 20}
CJK_CHARS = re.compile(r"[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]")
HEBREW = re.compile(r"[\u0590-\u05ff]")
PD = {"label": "Public Domain", "name": "Public Domain", "version": None,
      "url": "https://www.usagm.gov/terms-of-use/", "basis": "US government work, 17 U.S.C. 105"}
LEVELS = {"voa-learning-english": "B1", "voa": "B2", "global-voices": "B2"}
EXCLUDED = Counter()
BOILERPLATE = 3


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def fetcher():
    st.UA = UA
    f = st.Fetcher()
    f.robots = Robots(f)
    return f


def text_of(fragment):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragment)).split())


def slug_key(url):
    return re.sub(r"[^A-Za-z0-9]+", "_", url.split("//", 1)[-1])[:180]


class Robots:
    def __init__(self, f):
        self.f = f
        self.parsers = {}

    def parser(self, url):
        host = url.split("/")[2]
        if host not in self.parsers:
            self.parsers[host] = robots_from_text(robots_text(host, fetch_robots))
        return self.parsers[host]

    def allowed(self, url):
        rp = self.parser(url)
        delay = rp.crawl_delay(UA) or rp.crawl_delay("*")
        if delay:
            self.f.delay = max(self.f.delay, float(delay))
        return rp.can_fetch(UA, url)


DISALLOW_ALL = "User-agent: *\nDisallow: /\n"


def fetch_robots(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except (urllib.error.URLError, TimeoutError) as e:
        log("robots.txt unreachable", url, e)
        return None, ""


def robots_text(host, fetch):
    path = CACHE / "robots" / f"{host}.txt"
    if path.exists():
        return path.read_text(errors="replace")
    status, text = fetch(f"https://{host}/robots.txt")
    if status is not None and 400 <= status < 500:
        text = ""
    elif status != 200:
        return DISALLOW_ALL
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    return text


def robots_from_text(text):
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(text.splitlines())
    return rp


def get(f, url, sub):
    dest = CACHE / sub / (slug_key(url) + ".html")
    if dest.exists():
        return dest
    if not f.robots.allowed(url):
        EXCLUDED["robots.txt disallow"] += 1
        return None
    try:
        return f.get(url, dest)
    except RuntimeError as e:
        log(e)
        EXCLUDED["fetch failed"] += 1
        return None


ROBOTS = None


def robots_ok(url):
    if ROBOTS is None or ROBOTS.allowed(url):
        return True
    EXCLUDED["robots.txt disallow"] += 1
    return False


def min_len(text):
    if CJK_CHARS.search(text):
        return SHORT_MIN["cjk"]
    if HEBREW.search(text):
        return SHORT_MIN["hebrew"]
    return SHORT_MIN["other"]


def keep_para(p):
    if len(p) < min_len(p):
        EXCLUDED["paragraph too short"] += 1
        return False
    return True


def gv_list(f, lang, host):
    url = f"https://{host}.globalvoices.org/wp-json/wp/v2/posts?per_page={GV_PER_LANG}&_fields=id,link,date"
    dest = CACHE / "gv" / "list" / f"{host}.json"
    if not dest.exists() and not f.robots.allowed(url):
        EXCLUDED["robots.txt disallow"] += 1
        return []
    p = f.get(url, dest)
    return [r["link"] for r in json.loads(p.read_text())]


def gv_parse(path):
    h = path.read_text(encoding="utf-8", errors="replace")
    flat = h.replace("\n", " ")
    lic = GV_LICENCE.search(flat)
    title = re.search(r"<h1[^>]*class=['\"][^'\"]*entry-title[^'\"]*['\"][^>]*>(.*?)</h1>", flat) or re.search(r"<title>(.*?)</title>", flat)
    orig = re.search(r"post-translation-en'><a href='([^']+)'", flat)
    roles = defaultdict(list)
    for label, who in re.findall(r"<span class='credit-label'>([^<]*)</span><a [^>]*class='user-link'>([^<]+)</a>", flat):
        key = "translator" if re.search(r"tradu|trans|übersetz|перев|翻|번역|ترجم|μετάφρ|terjema|vertaal|przetłum|çevir|anuvad|अनुवाद|תורגם|ترجمه|překl", label, re.I) else "author"
        roles[key].append(html.unescape(who).strip())
    body = re.search(r"<div class=['\"]entry-container['\"][^>]*>(.*?)<div class=['\"](?:post-translations|entry-footer|gv-post-footer|sharing)", flat)
    body = body.group(1) if body else flat
    body = re.sub(r"<blockquote.*?</blockquote>|<figure.*?</figure>|<div[^>]*wp-caption.*?</div>|<script.*?</script>|<iframe.*?</iframe>", " ", body)
    paras = [text_of(p) for p in re.findall(r"<p(?:\s[^>]*)?>(.*?)</p>", body)]
    caption = [p for p in paras if re.match(r"^(Photo|Image|Foto|Imagen|Screenshot)\b", p, re.I)]
    EXCLUDED["caption paragraph"] += len(caption)
    paras = [p for p in paras if p not in caption and keep_para(p)]
    partner = bool(PARTNER.search(" ".join(paras[:2] + paras[-3:])))
    return {"partner": partner, "licence": st.licence("CC BY", lic.group(1)) if lic else None,
            "title": re.sub(r"\s+·\s+Global Voices.*$", "", text_of(title.group(1))) if title else "",
            "original": orig.group(1) if orig else None, "authors": list(dict.fromkeys(roles["author"])),
            "translators": list(dict.fromkeys(roles["translator"])),
            "paras": paras}


def voa_urls(f, lang, host):
    if not f.robots.allowed(f"https://{host}/sitemap.xml"):
        EXCLUDED["robots.txt disallow"] += 1
        return []
    p = f.get(f"https://{host}/sitemap.xml", CACHE / "voa" / "sitemaps" / f"{host}.xml")
    first = re.search(r"<loc>(https://[^<]*sitemap_\d+_1\.xml\.gz)</loc>", p.read_text())
    if not first:
        return []
    gz = f.get(first.group(1), CACHE / "voa" / "sitemaps" / f"{host}_1.xml.gz")
    locs = re.findall(r"<loc>([^<]*/a/[^<]+\.html)</loc>", gzip.decompress(gz.read_bytes()).decode("utf-8", "replace"))
    texty = [u for u in locs if re.search(r"/a/[^/]+/\d+\.html$", u)]
    return texty[: LE_ARTICLES if lang == "en" else VOA_PER_LANG]


def voa_parse(path):
    h = path.read_text(encoding="utf-8", errors="replace").replace("\n", " ")
    title = re.search(r"<title>\s*(.*?)\s*</title>", h)
    m = re.search(r'<div[^>]*class="wsw"[^>]*>(.*)', h)
    if not m:
        return None
    body = m.group(1)
    body = re.split(r'<div[^>]*class="[^"]*(?:c-author|comments|content-offset|share--box)', body)[0]
    quotes = len(re.findall(r"<blockquote", body))
    EXCLUDED["voa blockquote"] += quotes
    body = re.sub(r'<div[^>]*class="wsw__embed".*?</div>\s*</div>\s*</div>|<figure.*?</figure>|<script.*?</script>|<blockquote.*?</blockquote>', " ", body)
    paras = [text_of(p) for p in re.findall(r"<p(?:\s[^>]*)?>(.*?)</p>", body)]
    paras = [p for p in paras if keep_para(p)]
    page = text_of(re.sub(r"<script.*?</script>|<style.*?</style>", " ", h))
    byline = re.findall(r'"author":\{"@type":"(?:Person|Organization)","name":"([^"]+)"', h)
    author = None
    for p in paras[-6:]:
        a = re.match(r"^(.{3,80}?) (?:wrote|adapted|reported) (?:this|the) (?:story|report)", p)
        if a:
            author = a.group(1)
    ld = re.search(r'"author":\{"@type":"(?:Person|Organization)","name":"([^"]+)"', h)
    return {"title": text_of(title.group(1)) if title else "", "paras": paras, "thirdParty": bool(THIRD_PARTY.search(page)),
            "byline": byline,
            "authors": [author or (ld.group(1) if ld else "Voice of America")]}


def screen_voa(paras, title=""):
    whole = " ".join([title] + paras)
    if WIRE_DATELINE.search(whole):
        return "voa wire dateline"
    if AGENCY.search(whole):
        return "voa names a wire agency"
    return None


def fetch_gv(lang, host):
    f = fetcher()
    origs = []
    for url in gv_list(f, lang, host):
        page = get(f, url, "gv/posts")
        orig = gv_parse(page)["original"] if page else None
        if orig:
            origs.append(orig)
    log("gv", lang, "done")
    return origs


def fetch_voa(lang, host):
    f = fetcher()
    for url in voa_urls(f, lang, host):
        get(f, url, "voa/articles")
    log("voa", lang, "done")
    return []


def fetch(a):
    jobs = [(fetch_gv, l, h) for l, h in GV_HOSTS.items() if l in a.langs]
    jobs += [(fetch_voa, l, h) for l, h in VOA_HOSTS.items() if l in a.langs]
    origs = []
    with ThreadPoolExecutor(THREADS) as ex:
        for r in ex.map(lambda j: j[0](j[1], j[2]), jobs):
            origs += r
    f = fetcher()
    for url in dict.fromkeys(origs):
        get(f, url, "gv/en")
    log("gv en done", len(origs))


def article(source, lang, aid, title, url, authors, translators, lic, paras, level):
    return {"source": source, "id": aid, "lang": lang, "title": title, "url": url, "authors": authors,
            "illustrators": [], "translators": translators, "licence": lic, "rightsHolder": "",
            "level": {"scale": "source", "value": None, "cefr": level}, "pages": paras, "images": [None] * len(paras)}


def gv_articles(a):
    out = []
    english = {}
    partner_orig = set()
    for lang, host in GV_HOSTS.items():
        if lang not in a.langs:
            continue
        lp = CACHE / "gv" / "list" / f"{host}.json"
        if not lp.exists():
            continue
        for url in [r["link"] for r in json.loads(lp.read_text())]:
            p = CACHE / "gv/posts" / (slug_key(url) + ".html")
            if not p.exists() or not robots_ok(url):
                continue
            g = gv_parse(p)
            if g["licence"] is None:
                EXCLUDED["global-voices licence"] += 1
                continue
            if g["partner"]:
                EXCLUDED["global-voices partner content"] += 1
                continue
            if any(st.MACHINE.search(t) for t in g["translators"]):
                EXCLUDED["machine translation"] += 1
                continue
            b = article("global-voices", lang, f"gv-{lang}-{slug_key(url)[-60:]}", g["title"], url, g["authors"],
                        g["translators"], g["licence"], g["paras"], LEVELS["global-voices"])
            if g["original"]:
                b["isTranslation"] = True
                op = CACHE / "gv/en" / (slug_key(g["original"]) + ".html")
                if op.exists() and robots_ok(g["original"]):
                    e = english.get(g["original"])
                    if e is None:
                        o = gv_parse(op)
                        if o["partner"]:
                            EXCLUDED["global-voices partner original"] += 1
                            partner_orig.add(g["original"])
                        elif o["licence"]:
                            e = article("global-voices", "en", f"gv-en-{slug_key(g['original'])[-60:]}", o["title"],
                                        g["original"], o["authors"], [], o["licence"], o["paras"], LEVELS["global-voices"])
                            english[g["original"]] = e
                    if e:
                        b["english"] = e
                if g["original"] in partner_orig:
                    EXCLUDED["global-voices translation of partner content"] += 1
                    continue
            out.append(b)
    return out + list(english.values())


def voa_articles(a):
    out = []
    for lang, host in VOA_HOSTS.items():
        if lang not in a.langs:
            continue
        sm = CACHE / "voa" / "sitemaps" / f"{host}_1.xml.gz"
        if not sm.exists():
            continue
        locs = re.findall(r"<loc>([^<]*/a/[^<]+\.html)</loc>", gzip.decompress(sm.read_bytes()).decode("utf-8", "replace"))
        urls = [u for u in locs if re.search(r"/a/[^/]+/\d+\.html$", u)][: LE_ARTICLES if lang == "en" else VOA_PER_LANG]
        for url in urls:
            p = CACHE / "voa/articles" / (slug_key(url) + ".html")
            if not p.exists() or not robots_ok(url):
                continue
            v = voa_parse(p)
            if not v or not v["paras"]:
                EXCLUDED["voa no text"] += 1
                continue
            reason = screen_voa(v["paras"], v["title"])
            if reason is None and v["thirdParty"]:
                reason = "voa third-party copyright or contractor credit"
            if reason:
                EXCLUDED[reason] += 1
                continue
            kept = v["paras"]
            src = "voa-learning-english" if lang == "en" else "voa"
            aid = f"{src}-{lang}-{re.search(r'(\d+)\.html$', url).group(1)}"
            out.append(article(src, lang, aid, v["title"], url, v["authors"], [], dict(PD), kept, LEVELS[src]))
    return out


SOURCE_NAMES = {"global-voices": "Global Voices", "voa": "Voice of America", "voa-learning-english": "VOA Learning English"}


def credit(b):
    parts = [f"\"{b['title']}\""]
    if b["authors"]:
        parts.append("by " + ", ".join(b["authors"]))
    if b["translators"]:
        parts.append("translated by " + ", ".join(b["translators"]))
    lic = b["licence"]
    line = f"{', '.join(parts)}. {SOURCE_NAMES[b['source']]}, {b['url']}, {lic['label']} ({lic['url']})"
    e = b.get("pairedBook")
    if e:
        who = f" by {', '.join(e['authors'])}" if e["authors"] else ""
        line += f". English original \"{e['title']}\"{who}, {e['url']}, {e['license']}"
    return line


def strip_boilerplate(arts):
    seen = Counter(p for b in arts for p in set(b["pages"]))
    for b in arts:
        EXCLUDED["boilerplate paragraph"] += sum(seen[p] >= BOILERPLATE for p in b["pages"])
        b["pages"] = [p for p in b["pages"] if seen[p] < BOILERPLATE]
        b["images"] = [None] * len(b["pages"])


def build(a):
    global ROBOTS
    ROBOTS = fetcher().robots
    arts = voa_articles(a) + gv_articles(a)
    st.flag_review(arts)
    by_lang = defaultdict(list)
    for b in arts:
        by_lang[b["lang"]].append(b)
    for bs in by_lang.values():
        strip_boilerplate(bs)
    for b in arts:
        e = b.pop("english", None)
        if e and st.plausible(b["pages"], e["pages"]):
            st.attach_pair(b, e)
    BUNDLES.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    base = os.environ.get(st.BASE_ENV)
    manifest = {"format": "polingual-input", "kind": "open-news", "langs": {}, "bucket": st.BUCKET, "prefix": PREFIX,
                "bundleBase": None if not base or re.match(r"https?://(127\.0\.0\.1|localhost)[:/]", base) else base,
                "bundleBaseEnv": st.BASE_ENV,
                "betaRule": f"tokenShare below {st.BETA_SHARE} or no word pack ships as beta with coverage shown",
                "sources": {
                    "voa": {"licence": "US public domain per article page; paragraphs naming AP, Reuters, AFP or other agencies dropped; wire datelines drop the article; captions and embeds dropped"},
                    "global-voices": {"licence": "rel=license link on each article page, CC BY only; blockquotes, figures and embeds dropped"},
                },
                "translationRule": "item.translation holds the Global Voices English original paragraph when paragraph count, length ratio and digits match; VOA language services are separate reporting and carry none",
                "pairing": {"ratio": list(st.PAIR_RATIO), "share": st.PAIR_SHARE, "digitsMatch": True}}
    for lang in sorted(by_lang):
        lex = st.lexicon(lang, a)
        tk = st.Tokenizer(lex or st.NullLex(), lang)
        items, units, metas, seen = [], [], [], set()
        for b in sorted(by_lang[lang], key=lambda b: (b["source"], b["id"])):
            its, us = st.book_units(b, tk, seen)
            if not us:
                continue
            line = credit(b)
            for u in us:
                u["credit"] = line
            for it in its:
                it["source"]["name"] = b["source"]
            items += its
            units += us
            m = st.book_meta(b)
            if b["licence"].get("basis"):
                m["licenseBasis"] = b["licence"]["basis"]
            metas.append(m)
        if not units:
            continue
        bundle = {"format": "polingual-input", "version": 1, "lang": lang,
                  "attribution": ["News from Voice of America (US public domain) and Global Voices (CC BY). Each unit carries its article credit line and licence.",
                                  "Lemmas from Wiktionary via Kaikki (kaikki.org), CC-BY-SA 3.0."],
                  "coverage": ib.coverage(items), "tatoebaItems": 0, "tatoebaIdsMatched": 0,
                  "books": metas, "items": items, "units": units}
        name = ib.write_bundle(bundle, BUNDLES)
        paired = sum(u["paired"] for u in units)
        stats = {"file": name, "articles": len(metas), "units": len(units), "items": len(items),
                 "tokens": bundle["coverage"]["tokens"], "tokenShare": bundle["coverage"]["tokenShare"],
                 "pairedUnits": paired, "pairedShare": round(paired / len(units), 4),
                 "bySource": dict(Counter(m["source"] for m in metas)), "wordPack": lex is not None}
        stats["beta"] = lex is None or stats["tokenShare"] < st.BETA_SHARE
        manifest["langs"][lang] = stats
        log(lang, json.dumps(stats))
    manifest["articlesExcluded"] = dict(sorted(EXCLUDED.items()))
    log("excluded", json.dumps(manifest["articlesExcluded"]))
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n")


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["fetch", "build", "upload"])
    ap.add_argument("--langs", default=",".join(st.POLINGUAL_LANGS))
    ap.add_argument("--packs")
    ap.add_argument("--index")
    ap.add_argument("--scratch")
    a = ap.parse_args(argv)
    a.langs = a.langs.split(",")
    a.packs = ib.env_path(a.packs, "POLINGUAL_PACKS_DIR")
    a.index = ib.env_path(a.index, "PHOTONS_INDEX")
    a.scratch = ib.env_path(a.scratch, "INPUT_SCRATCH_DIR") or CACHE / "scratch"
    a.scratch.mkdir(parents=True, exist_ok=True)
    st.check_bundles_dir(BUNDLES)
    if a.cmd == "fetch":
        fetch(a)
    elif a.cmd == "upload":
        st.upload(MANIFEST, BUNDLES, PREFIX)
    else:
        build(a)


if __name__ == "__main__":
    main()
