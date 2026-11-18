import json
from html import escape
import re
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "public" / "d8"

out = (D / "index.html").read_text()
out = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n', "", out)
out = re.sub(r'<select class="lsel".*?</select>', "", out, flags=re.S)
LANGS = {f.stem: json.loads(f.read_text()) for f in sorted((Path(__file__).resolve().parent / "i18n").glob("*.json")) if f.stem != "keys"}
KEYS = json.loads((Path(__file__).resolve().parent / "i18n" / "keys.json").read_text())
SITE = "https://www.polingual.com"
RTL = {"ar", "fa", "he"}
LONG_CTA = {"ar", "de", "el", "nl", "ru", "ta", "vi"}
JOINED = {"ar", "fa", "hi", "ta", "th"}
WORDS = {w["slug"]: w for w in json.loads((D.parent.parent / "src" / "data" / "words.json").read_text())}
EN_STRIP = {"browse": "Browse {count} words in {n} languages"}
LANG_COUNT = len({f["lang"] for w in WORDS.values() for f in w["forms"]})
ALT = f'<link rel="alternate" hreflang="en-US" href="{SITE}/">\n' + "".join(f'<link rel="alternate" hreflang="{v["hreflang"]}" href="{SITE}/{k}">\n' for k, v in LANGS.items()) + f'<link rel="alternate" hreflang="x-default" href="{SITE}/">\n'
SEL = '<select class="lsel" aria-label="Language" onchange="location.href=this.value" style="font:inherit;font-size:inherit;color:inherit;background:transparent;border:0;cursor:pointer;margin-left:12px">'


def browse(code, tr):
    base = "" if code == "en" else f"/{code}"
    rtl = ' dir="rtl"' if code in RTL else ""
    label = escape(tr["browse"].format(count=len(WORDS), n=LANG_COUNT))
    return f'<p class="hw"{rtl}><a href="{base}/word">{label}</a></p>'


def picker(cur):
    opts = [("en", "/", "English")] + [(k, f"/{k}", v["name"]) for k, v in LANGS.items()]
    return SEL + "".join(f'<option value="{href}" lang="{k}"{" selected" if k == cur else ""}>{name}</option>' for k, href, name in opts) + "</select>"


LINKS = json.loads((D.parent.parent / "src" / "lib" / "footer-links.json").read_text())
REL = ' rel="noopener"'
FOOT = "".join(f'<a href="{l["href"]}"{REL if l["href"].startswith("http") else ""}>{l["label"]}</a>' for l in LINKS)
HEAD = '<a class="l" href="/support">Support</a>'
BUNDLES = D.parent.parent / "src" / "i18n" / "words"
SOURCES = [("https://en.wiktionary.org", "Wiktionary"), ("https://kaikki.org", "Kaikki"), ("https://commons.wikimedia.org", "Wikimedia Commons"), ("https://creativecommons.org/licenses/by-sa/4.0/", "CC BY-SA 4.0")]


def credit(code):
    b = json.loads((BUNDLES / f"{code}.json").read_text())
    links = " · ".join(f'<a href="{href}">{name}</a>' for href, name in SOURCES)
    text = {k: escape(b[k], quote=False) for k in ("footerTagline", "footerData", "footerPublished")}
    return f'{text["footerTagline"]} · {text["footerData"]} {links}. <bdi>{text["footerPublished"]}</bdi>'


out, credits = re.subn(r'<span class="fc">.*?</span>', lambda m: '<span class="fc">__CREDIT__</span>', out, flags=re.S)
if credits != 3:
    raise SystemExit("footer credit anchors moved")
out, footers = re.subn(r'<span class="fx">.*?</span>', lambda m: '<span class="fx">' + FOOT + "__LANGSEL__</span>", out, flags=re.S)
if footers != 3 or out.count(HEAD) != 1:
    raise SystemExit("language picker anchors moved")
out = re.sub(r'<p class="hw">.*?</p>', "__HW__", out, flags=re.S)
if out.count("__HW__") != 2:
    raise SystemExit("browse link anchors moved")
out = out.replace(HEAD, HEAD + "__LANGSEL__")
out = out.replace('<link rel="canonical"', ALT + '<link rel="canonical"', 1)
(D / "index.html").write_text(out.replace("__CREDIT__", credit("en")).replace("__LANGSEL__", picker("en")).replace("__HW__", browse("en", EN_STRIP)))
(D.parent.parent / "src" / "lib" / "site-langs.json").write_text(json.dumps(list(LANGS)) + "\n")


def localize(code, lang):
    missing = [k for k in KEYS["page"] if k not in lang["page"]] + [k for k in KEYS["modal"] if k not in lang["modal"]] + [k for k in KEYS["strip"] if k not in lang.get("strip", {})]
    if missing:
        raise SystemExit(f"{code}: untranslated {missing!r}")
    html = out.replace("__LANGSEL__", picker(code))
    pairs = [
        ('<html lang="en">', f'<html lang="{code}">'),
        (f'<link rel="canonical" href="{SITE}/">', f'<link rel="canonical" href="{SITE}/{code}">'),
        (f'<meta property="og:url" content="{SITE}/">', f'<meta property="og:url" content="{SITE}/{code}">'),
        ('content="en_US"', f'content="{lang["locale"]}"'),
    ] + [(k, lang["page"][k]) for k in KEYS["page"]]
    for a, b in pairs:
        if a not in html:
            raise SystemExit(f"{code}: missing {a!r}")
        html = html.replace(a, b)
    if code in JOINED:
        html = html.replace("</head>", "<style>small{letter-spacing:0!important;font-family:Nunito,sans-serif!important}</style></head>", 1)
    if code in LONG_CTA:
        html = html.replace("</head>", "<style>#app .band{min-height:clamp(150px,25dvh,260px);height:auto;padding-top:clamp(64px,11.5dvh,120px)}</style></head>", 1)
    if code in RTL:
        html = html.replace("</head>", "<style>h1,h2,p,small,b,span,a,.pill,.btn{unicode-bidi:plaintext}</style></head>", 1)
    if code == "es":
        html = html.replace('href="/teachers"', 'href="/es/teachers"')
    html = html.replace('href="/word"', f'href="/{code}/word"').replace("__HW__", browse(code, lang["strip"]))
    tr = json.dumps(lang["modal"], ensure_ascii=False).replace("</", "<\\/")
    html = html.replace("__CREDIT__", credit(code))
    return html.replace('<script src="/d8/beta.js">', f"<script>window.PL_TR={tr}</script>\n<script src=\"/d8/beta.js\">", 1)


for code, lang in LANGS.items():
    (D / f"{code}.html").write_text(localize(code, lang))
