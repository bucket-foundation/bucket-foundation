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
CHIPS = ["water", "night", "fire", "one", "friend", "heart", "sun", "moon", "bread", "star"]
EN_STRIP = {"browse": "Browse words", "all": "See all {n} words", "hero": "See {word} in {n} languages"}
HERO_SLUG = "hundred"
ALT = f'<link rel="alternate" hreflang="en-US" href="{SITE}/">\n' + "".join(f'<link rel="alternate" hreflang="{v["hreflang"]}" href="{SITE}/{k}">\n' for k, v in LANGS.items()) + f'<link rel="alternate" hreflang="x-default" href="{SITE}/">\n'
SEL = '<select class="lsel" aria-label="Language" onchange="location.href=this.value" style="font:inherit;font-size:inherit;color:inherit;background:transparent;border:0;cursor:pointer;margin-left:12px">'


def chip(slug, code):
    w = WORDS[slug]
    form = next((f["word"] for f in w["forms"] if f["lang"] == code), w["en"])
    return form[:1].upper() + form[1:]


def strip(code, tr):
    base = "" if code == "en" else f"/{code}"
    chips = "".join(f'<a href="{base}/word/{s}">{escape(chip(s, code))}</a>' for s in CHIPS)
    rtl = ' dir="rtl"' if code in RTL else ""
    browse = escape(tr["browse"])
    return f'<nav class="ws" aria-label="{browse}"{rtl}><span class="wsl">{browse}</span><div class="wsc">{chips}</div><a class="wsa" href="{base}/word">{escape(tr["all"].format(n=len(WORDS)))}</a></nav>'


def hero(code, tr):
    base = "" if code == "en" else f"/{code}"
    w = WORDS[HERO_SLUG]
    form = next((f["word"] for f in w["forms"] if f["lang"] == code), w["en"])
    label = escape(tr["hero"].format(word=form, n=len(w["forms"])))
    rtl = ' dir="rtl"' if code in RTL else ""
    return f'<p class="hw"{rtl}><a href="{base}/word/{HERO_SLUG}">{label}</a></p>'


def picker(cur):
    opts = [("en", "/", "English")] + [(k, f"/{k}", v["name"]) for k, v in LANGS.items()]
    return SEL + "".join(f'<option value="{href}" lang="{k}"{" selected" if k == cur else ""}>{name}</option>' for k, href, name in opts) + "</select>"


FOOT = '<a href="/terms">Terms</a><a href="/support">Support</a>'
HEAD = '<a class="l" href="/privacy">Privacy</a>'
if out.count(FOOT) < 2 or out.count(HEAD) != 1:
    raise SystemExit("language picker anchors moved")
out = re.sub(r'<nav class="ws".*?</nav>', "__WS__", out, flags=re.S)
out = re.sub(r'<p class="hw">.*?</p>', "__HW__", out, flags=re.S)
if out.count("__WS__") != 2 or out.count("__HW__") != 2:
    raise SystemExit("word strip anchors moved")
out = out.replace(FOOT, FOOT + "__LANGSEL__").replace(HEAD, HEAD + "__LANGSEL__")
out = out.replace('<link rel="canonical"', ALT + '<link rel="canonical"', 1)
(D / "index.html").write_text(out.replace("__LANGSEL__", picker("en")).replace("__WS__", strip("en", EN_STRIP)).replace("__HW__", hero("en", EN_STRIP)))
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
        html = html.replace("</head>", "<style>small,.ws .wsl{letter-spacing:0!important;font-family:Nunito,sans-serif!important}</style></head>", 1)
    if code in LONG_CTA:
        html = html.replace("</head>", "<style>#app .band{min-height:clamp(150px,25dvh,260px);height:auto;padding-top:clamp(64px,11.5dvh,120px)}</style></head>", 1)
    if code in RTL:
        html = html.replace("</head>", "<style>h1,h2,p,small,b,span,a,.pill,.btn{unicode-bidi:plaintext}</style></head>", 1)
    html = html.replace('href="/word"', f'href="/{code}/word"').replace("__WS__", strip(code, lang["strip"])).replace("__HW__", hero(code, lang["strip"]))
    tr = json.dumps(lang["modal"], ensure_ascii=False).replace("</", "<\\/")
    return html.replace('<script src="/d8/beta.js">', f"<script>window.PL_TR={tr}</script>\n<script src=\"/d8/beta.js\">", 1)


for code, lang in LANGS.items():
    (D / f"{code}.html").write_text(localize(code, lang))
