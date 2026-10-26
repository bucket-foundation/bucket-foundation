import re
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "public" / "d8"


def styles(html):
    return "\n".join(re.findall(r"<style>(.*?)</style>", html, re.S))


def body(html):
    b = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    return re.sub(r"<script[^>]*>.*?</script>", "", b, flags=re.S)


def split_rules(css):
    out, depth, start = [], 0, 0
    for i, ch in enumerate(css):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                out.append(css[start:i + 1].strip())
                start = i + 1
    return [r for r in out if r]


def prefix(css, scope):
    res = []
    for rule in split_rules(css):
        head, inner = rule.split("{", 1)
        head = head.strip()
        inner = inner[:-1]
        if head.startswith("@keyframes") or head.startswith("@font-face"):
            res.append(rule)
        elif head.startswith("@media") or head.startswith("@supports"):
            res.append(head + "{" + prefix(inner, scope) + "}")
        else:
            sels = []
            for s in head.split(","):
                s = s.strip()
                s = re.sub(r"^(html|body|:root)\b", "", s).strip()
                sels.append(f"{scope} {s}".strip() if s else scope)
            res.append(",".join(sels) + "{" + inner + "}")
    return "\n".join(res)


slide = (D / "slide.html").read_text()
mobile = (D / "mobile.html").read_text()
landing = (D / "landing.html").read_text()

head = re.search(r"<head>(.*?)<style>", landing, re.S).group(1)
head = re.sub(r"<script>const plM.*?</script>", "", head, flags=re.S)
head = re.sub(r"<script>if\(innerWidth.*?</script>", "", head, flags=re.S)
head = re.sub(r'<link href="https://fonts[^>]*>', "", head)
head = re.sub(r'<link rel="stylesheet" href="tiles.css">', "", head)
fonts = re.search(r'<link href="https://fonts[^>]*>', slide).group(0)
fonts = fonts.replace("family=Fredoka:wght@500;700", "family=Fredoka:wght@500;600;700")

hd = re.search(r'<header class="hd">.*?</header>', landing, re.S).group(0)
ft = re.search(r'<footer class="ft">.*?</footer>', landing, re.S).group(0)
landing_css = styles(landing)
keep = [r for r in split_rules(landing_css) if re.match(r"\s*(\.hd|\.ft|\.ftrow|\.fl2|\.wrap|\.brand|\.mark|nav|\.btn|\.si|\.sr|@media \(max-height|@media \(min-width:2000)", r)]
shell_css = prefix("\n".join(keep), "#dk")

dk_css = prefix(styles(slide), "#dk .stage")
mb_css = prefix(styles(mobile), "#mb")

skins = re.search(r'<script>\(\(\)=>\{const S=\["#5B1A4A".*?</script>', slide, re.S).group(0)

out = f"""<!doctype html>
<html lang="en"><head>{head.strip()}
{fonts}
<link rel="stylesheet" href="/d8/tiles.css">
<style>
*{{box-sizing:border-box;margin:0}}
html,body{{height:100%;overflow:hidden;background:#F6EEDC}}
#dk,#mb{{height:100vh;height:100dvh;transition:opacity .35s ease}}
#mb{{display:none}}
#dk{{display:flex;flex-direction:column;font-family:Nunito,sans-serif;color:#231F20;--bg:#F6EEDC;--ink:#231F20;--pur:#5B1A4A;--lip:#3A0F2F;--ochre:#E9A23B;--cta:#D9381E;--cta-lip:#8E2312;--muted:#5d5650;--line:#E3D6B8;--btn-r:12px}}
#dk .hero{{flex:1 1 auto;min-height:0;position:relative;overflow:hidden;background:linear-gradient(90deg,#F6EEDC 50%,#5B1A4A 50%)}}
#dk .stage{{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}}
#dk .stage .brand{{visibility:hidden}}
#dk .stage .l{{top:calc(20px + var(--ex,0px))}}
#dk .stage .wedge,#dk .stage .tile{{height:100%!important}}
#dk .stage .r{{top:calc(120px + var(--ex,0px))!important}}
#dk .stage .col{{top:var(--ex,0px)!important;bottom:auto!important;height:1080px}}
#dk .stage .s{{height:100%!important}}
{shell_css}
{dk_css}
{mb_css}
@media (max-width:759px),(max-aspect-ratio:5/4){{#dk{{display:none}}#mb{{display:block}}}}
</style></head><body>
<div id="dk">
{hd}
<main class="hero" id="hero"><div class="stage" id="stage">{body(slide)}</div></main>
{ft}
</div>
<div id="mb">{body(mobile)}</div>
<script src="/d8/tiles.js"></script>
<script src="/d8/beta.js"></script>
<script src="/d8/share.js"></script>
{skins.replace('document.querySelectorAll(".mho.face")', 'document.querySelectorAll(".mho.face")')}
<script>(()=>{{const f=()=>document.querySelectorAll(".wd-art").forEach(a=>{{const b=a.firstElementChild;if(!a.clientWidth)return;b.style.setProperty("--k",Math.min(a.clientWidth/520,a.clientHeight/1060))}});f();addEventListener("resize",f);setTimeout(f,300)}})()</script>
<script>(()=>{{const mq=matchMedia("(min-width:680px)");let last=null;const art=()=>document.querySelector("#mb .art")||document.querySelector(".pg .art");const snap=()=>{{const a=art();if(a&&a.offsetParent)last=a.getBoundingClientRect()}};snap();mq.addEventListener("change",()=>{{const a=art();if(!a||!last)return snap();const n=a.getBoundingClientRect();if(!n.width)return snap();const dx=last.left-n.left,dy=last.top-n.top,sx=last.width/n.width,sy=last.height/n.height;a.animate([{{transformOrigin:"0 0",transform:`translate(${{dx}}px,${{dy}}px) scale(${{sx}},${{sy}})`}},{{transformOrigin:"0 0",transform:"none"}}],{{duration:650,easing:"cubic-bezier(.2,.8,.2,1)"}});snap()}});addEventListener("resize",()=>{{clearTimeout(window.plS);window.plS=setTimeout(snap,120)}})}})()</script>
<script>const fit=()=>{{const w=hero.clientWidth,h=hero.clientHeight;if(!w)return;const k=w/1920;const H=Math.max(1080,h/k);stage.style.height=H+"px";stage.style.setProperty("--ex",((H-1080)/2)+"px");const k2=Math.min(k,h/1080);stage.style.transform=`translate(${{(w-1920*k2)/2}}px,${{(h-H*k2)/2}}px) scale(${{k2}})`}};fit();addEventListener("resize",fit);matchMedia("(max-width:759px),(max-aspect-ratio:5/4)").addEventListener("change",fit)</script>
</body></html>
"""
out = out.replace('src="mark-pl.svg"', 'src="/d8/mark-pl.svg"').replace('href="/d8/mark.svg"', 'href="/d8/mark-pl.svg"')
ALT = '<link rel="alternate" hreflang="en-US" href="https://www.polingual.com/">\n<link rel="alternate" hreflang="es-US" href="https://www.polingual.com/es">\n<link rel="alternate" hreflang="x-default" href="https://www.polingual.com/">\n'
out = out.replace('<link rel="canonical"', ALT + '<link rel="canonical"', 1)
(D / "index.html").write_text(out)

ES = [
    ('<html lang="en">', '<html lang="es">'),
    ("Polingual: language learning for multilingual learners", "Polingual: tu tercer idioma con el español y el inglés"),
    ("Polingual teaches one word across many languages and scripts. Hear every word said, see its roots, and keep a daily streak. For iPhone and iPad.", "Para quienes hablan español e inglés en Estados Unidos. Polingual enseña cada palabra en todos tus idiomas a la vez, con audio y raíces. Para iPhone y iPad."),
    (", with word tiles in French, Hebrew, Greek, Arabic, Hindi and Chinese", ", con palabras en francés, hebreo, griego, árabe, hindi y chino"),
    ("Polingual word tiles in six scripts", "Palabras de Polingual en seis escrituras"),
    ('<link rel="canonical" href="https://www.polingual.com/">', '<link rel="canonical" href="https://www.polingual.com/es">'),
    ('<meta property="og:url" content="https://www.polingual.com/">', '<meta property="og:url" content="https://www.polingual.com/es">'),
    ('content="en_US"', 'content="es_US"'),
    ("Language learning<br>for <em>multilingual</em><br>learners.", "Ya hablas español<br>e inglés. Suma tu<br><em>tercer</em> idioma."),
    ("Language learning for <em>multilingual</em> learners.", "Ya hablas español e inglés. Suma tu <em>tercer</em> idioma."),
    ("Join the beta on TestFlight", "Únete a la beta en TestFlight"),
    (">Join the beta<", ">Únete a la beta<"),
    (">day streak<", ">días de racha<"),
    ("After 100 days, expect to know 280 words across 4 languages, and remember 95% of them.", "Después de 100 días, espera conocer 280 palabras en 4 idiomas y recordar el 95 % de ellas."),
    ('aria-label="100 day streak"', 'aria-label="100 días de racha"'),
    (">Support<", ">Ayuda<"),
    (">Privacy<", ">Privacidad<"),
    (">Terms<", ">Términos<"),
    (">Share<", ">Compartir<"),
    ("for iPhone and iPad<", "para iPhone y iPad<"),
    (">Word data: <", ">Datos de palabras: <"),
]
es = out
for a, b in ES:
    if a not in es:
        raise SystemExit(f"es: missing {a!r}")
    es = es.replace(a, b)
(D / "es.html").write_text(es)
