import json
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
JOINED = {"ar", "fa", "hi", "ta", "th"}
ALT = f'<link rel="alternate" hreflang="en-US" href="{SITE}/">\n' + "".join(f'<link rel="alternate" hreflang="{v["hreflang"]}" href="{SITE}/{k}">\n' for k, v in LANGS.items()) + f'<link rel="alternate" hreflang="x-default" href="{SITE}/">\n'
SEL = '<select class="lsel" aria-label="Language" onchange="location.href=this.value" style="font:inherit;font-size:inherit;color:inherit;background:transparent;border:0;cursor:pointer;margin-left:12px">'


def picker(cur):
    opts = [("en", "/", "English")] + [(k, f"/{k}", v["name"]) for k, v in LANGS.items()]
    return SEL + "".join(f'<option value="{href}" lang="{k}"{" selected" if k == cur else ""}>{name}</option>' for k, href, name in opts) + "</select>"


FOOT = '<a href="/terms">Terms</a><a href="/support">Support</a>'
HEAD = '<a class="l" href="/privacy">Privacy</a>'
if out.count(FOOT) < 2 or out.count(HEAD) != 1:
    raise SystemExit("language picker anchors moved")
out = out.replace(FOOT, FOOT + "__LANGSEL__").replace(HEAD, HEAD + "__LANGSEL__")
out = out.replace('<link rel="canonical"', ALT + '<link rel="canonical"', 1)
(D / "index.html").write_text(out.replace("__LANGSEL__", picker("en")))
(D.parent.parent / "src" / "lib" / "site-langs.json").write_text(json.dumps(list(LANGS)) + "\n")


def localize(code, lang):
    missing = [k for k in KEYS["page"] if k not in lang["page"]] + [k for k in KEYS["modal"] if k not in lang["modal"]]
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
        html = html.replace("</head>", "<style>small{letter-spacing:0!important}</style></head>", 1)
    if code in RTL:
        html = html.replace("</head>", "<style>h1,h2,p,small,b,span,a,.pill,.btn{unicode-bidi:plaintext}</style></head>", 1)
    tr = json.dumps(lang["modal"], ensure_ascii=False).replace("</", "<\\/")
    return html.replace('<script src="/d8/beta.js">', f"<script>window.PL_TR={tr}</script>\n<script src=\"/d8/beta.js\">", 1)


for code, lang in LANGS.items():
    (D / f"{code}.html").write_text(localize(code, lang))
