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
#dk .stage .l{{top:20px}}
{shell_css}
{dk_css}
{mb_css}
@media (max-width:759px),(max-aspect-ratio:20/21){{#dk{{display:none}}#mb{{display:block}}}}
</style></head><body>
<div id="dk">
{hd}
<main class="hero" id="hero"><div class="stage" id="stage">{body(slide)}</div></main>
{ft}
</div>
<div id="mb">{body(mobile)}</div>
<script src="/d8/tiles.js"></script>
{skins.replace('document.querySelectorAll(".mho.face")', 'document.querySelectorAll(".mho.face")')}
<script>(()=>{{const f=()=>document.querySelectorAll(".wd-art").forEach(a=>{{const b=a.firstElementChild;if(!a.clientWidth)return;b.style.setProperty("--k",Math.min(a.clientWidth/520,a.clientHeight/1060))}});f();addEventListener("resize",f);setTimeout(f,300)}})()</script>
<script>const fit=()=>{{const w=hero.clientWidth,h=hero.clientHeight;if(!w)return;const k=Math.min(w/1920,h/1080);stage.style.transform=`translate(${{(w-1920*k)/2}}px,${{(h-1080*k)/2}}px) scale(${{k}})`}};fit();addEventListener("resize",fit);matchMedia("(max-width:759px),(max-aspect-ratio:20/21)").addEventListener("change",fit)</script>
</body></html>
"""
out = out.replace('src="mark-pl.svg"', 'src="/d8/mark-pl.svg"').replace('href="/d8/mark.svg"', 'href="/d8/mark-pl.svg"')
(D / "index.html").write_text(out)
