import re

D5_HERO = ('<figure class="d5-hero"><svg data-girih="field" aria-hidden="true" preserveAspectRatio="xMidYMid slice"></svg>'
           '<div class="arch"><img src="{p}licensed/d5/iznik-tile-panel.jpg" alt="Iznik tile panel with tulips and saz leaves, Ottoman, second half of the 16th century" width="600" height="597"></div>'
           '<figcaption class="credit">Tile Panel, Iznik, 16th century. <a href="https://www.metmuseum.org/art/collection/search/447013">The Met</a>, CC0.</figcaption></figure>')

D6_HERO = ('<figure class="d6-hero"><img class="still" src="{p}3d/d6-object.png" alt="Blender render of a cube, a cone and a sphere" width="2048" height="2048">'
           '<img class="ref" src="{p}licensed/d6/kandinsky-composition-8.jpg" alt="Composition VIII by Wassily Kandinsky, 1923" width="1280" height="896">'
           '<svg data-prim role="img" aria-label="Circle, square and triangle set on the 8px module, traced from Composition VIII"></svg>'
           '<figcaption class="credit">Composition VIII, Wassily Kandinsky, 1923. <a href="https://commons.wikimedia.org/wiki/File:Wassily_Kandinsky_Composition_VIII.jpg">Wikimedia Commons</a>, public domain. Render and trace: bkt.</figcaption></figure>')

D5_AUTH = ('<figure style="margin:0;align-self:flex-end;width:200px"><img class="arch-img" src="{p}licensed/d5/astrolabe-1654.jpg" alt="Planispheric astrolabe by Muhammad Zaman, 1654" width="468" height="625">'
           '<figcaption class="credit" style="margin-top:var(--s2)">Astrolabe, Muhammad Zaman, 1654. <a href="https://www.metmuseum.org/art/collection/search/451699">The Met</a>, CC0.</figcaption></figure>')


NAV = [("home", "Learn", "app-learn.html"), ("cards", "Study", "app-study-card.html"), ("listen", "Review", "app-review.html"), ("search", "Canon", "app-canon-search.html"), ("library", "Languages", "app-language-picker.html"), ("cite", "Progress", "app-progress.html"), ("settings", "Settings", "app-settings.html")]
SR = 'style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"'


def fix_email(i, html):
    html = html.replace(f"http://127.0.0.1:8777/_directions/pages/{i}/", "").replace("http://127.0.0.1:8777/_directions/", "../../")
    html = re.sub(r'(<body[^>]*>)', r'\1<main>', html, 1).replace("</body>", "</main></body>", 1)
    html = html.replace('>Your sign-in code</td>', '><h1 style="margin:0;font:inherit;color:inherit">Your sign-in code</h1></td>', 1)
    return html


def menukey(html):
    m = re.search(r'<header class="top">.*?<nav aria-label="Main">(.*?)</nav>', html, re.S)
    if not m:
        return html
    key = f'<details class="menukey"><summary>Menu</summary><nav aria-label="Menu">{m.group(1)}</nav></details>'
    end = html.index("</header>", m.start())
    return html[:end] + key + html[end:]


def bnav(i, html, prefix):
    m = re.search(r'<nav class="bnav" aria-label="App">.*?</nav>', html, re.S)
    if not m:
        return html
    cur = re.search(r'<a class="ni" href="([^"]+)" aria-current', html)
    cur = cur.group(1) if cur else ""
    items = "".join(f'<a href="{h}"{" aria-current=page" if h == cur else ""}><img src="{prefix}icons/{i}-{k}.svg" alt="" width="24" height="24">{n}</a>' for k, n, h in NAV)
    return html[:m.start()] + f'<nav class="bnav" aria-label="App">{items}</nav>' + html[m.end():]


def landmarks(page, html):
    if page in ("landing", "polingual-landing") and "<main" not in html:
        e = html.index("</header>") + len("</header>")
        html = html[:e] + "<main>" + html[e:]
        html = html.replace('<footer class="foot">', '</main><footer class="foot">', 1)
    if page == "onboarding":
        html = re.sub(r'<h2 class="h3" id="h1">(.*?)</h2>', r'<h1 class="h3" id="h1">\1</h1>', html, 1)
        html = html.replace('aria-pressed="true" lang="he"', 'aria-pressed="false" lang="he"')
    if page == "math":
        html = re.sub(r'<h1 class="h2">Entropy of a source</h1>', '<h2 class="h2">Entropy of a source</h2>', html)
    if page.startswith("search") and "<h1" not in html:
        html = html.replace('<main class="app">', f'<main class="app"><h1 {SR}>Search the canon</h1>', 1)
    html = html.replace('dir="rtl" style="text-align:right"', 'dir="rtl" style="text-align:left"')
    return html


def post(i, page, html, prefix="../../"):
    if i not in ("d5", "d6"):
        return html
    if page == "email-signin":
        return fix_email(i, html)
    html = landmarks(page, menukey(bnav(i, html, prefix)))
    html = re.sub(r'<figure style="margin:0"><img src="\.\./\.\./img/' + i + r'-hero\.jpg"[^>]*></figure>',
                  (D5_HERO if i == "d5" else D6_HERO).format(p=prefix), html)
    if i == "d5" and page in ("signin", "signup", "signin-code"):
        html = re.sub(r'<img src="\.\./\.\./3d/d5-mark\.png"[^>]*>', D5_AUTH.format(p=prefix), html)
    tag = f'<link rel="stylesheet" href="{prefix}made/{i}.css"><script defer src="{prefix}made/{i}.js"></script>'
    return html.replace("</head>", tag + "</head>", 1)
