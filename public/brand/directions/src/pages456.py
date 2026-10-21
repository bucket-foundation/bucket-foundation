import os, re

from paths import DIRECTIONS_DIR
ROOT = DIRECTIONS_DIR + "/pages"

def lum(h):
    h = h.lstrip("#")
    out = []
    for i in (0, 2, 4):
        v = int(h[i:i+2], 16) / 255
        out.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]

def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)

D = {
 "d4": dict(name="Wedge", system="Material Design 3", movement="Soviet constructivism",
   fonts="family=Oswald:wght@500;700&family=Roboto+Flex:opsz,wght@8..144,400;8..144,600&family=Heebo:wght@500;800",
   disp="'Oswald'", body="'Roboto Flex'", mono="'Roboto Flex'", he="'Heebo'",
   c=dict(bg="#141414", surf="#222222", text="#EFE6D2", muted="#B5AC9A", acc="#E3242B", onacc="#FFFFFF", hl="#EFE6D2", line="#5A554C", link="#EFE6D2", ok="#EFE6D2"),
   r="0px", bw="0px", case="none", hero="Build the past", cta="Join the build", kicker="Bucket · No. 1"),
 "d5": dict(name="Girih", system="Microsoft Fluent 2", movement="Islamic geometric tiling",
   fonts="family=Reem+Kufi:wght@500;700&family=Noto+Sans:wght@400;600&family=Noto+Sans+Hebrew:wght@400;600",
   disp="'Reem Kufi'", body="'Noto Sans'", mono="'Noto Sans'", he="'Noto Sans Hebrew'",
   c=dict(bg="#0B2A5B", surf="#123873", text="#F5F7FA", muted="#C3CEE2", acc="#3FC1C9", onacc="#062027", hl="#F2C14E", line="#2C5AA0", link="#3FC1C9", ok="#3FC1C9"),
   r="8px", bw="1px", case="none", hero="Few axioms. Every pattern.", cta="Enter the canon", kicker="The canon"),
 "d6": dict(name="Primitive", system="Teenage Engineering", movement="Bauhaus",
   fonts="family=Jost:wght@400;700&family=Space+Mono:wght@400;700&family=Heebo:wght@500;700",
   disp="'Jost'", body="'Jost'", mono="'Space Mono'", he="'Heebo'",
   c=dict(bg="#D9D6CF", surf="#EDEBE6", text="#111111", muted="#3F3D39", acc="#FF5F00", onacc="#111111", hl="#1D4ED8", line="#111111", link="#1D4ED8", ok="#1D4ED8"),
   r="4px", bw="2px", case="none", hero="build the past.", cta="Create your account", kicker="BKT-1 · Canon instrument"),
}

def check(i):
    c = D[i]["c"]
    T = [("text", "bg"), ("muted", "bg"), ("text", "surf"), ("muted", "surf"), ("onacc", "acc"), ("link", "bg"), ("link", "surf"), ("ok", "surf")]
    if i == "d5": T += [("hl", "bg"), ("hl", "surf")]
    res = []
    for f, b in T:
        r = cr(c[f], c[b]); assert r >= 4.5, (i, f, b, r); res.append(f"{f}/{b} {r:.2f}")
    NT = {"d4": [("acc", "bg")], "d5": [("acc", "bg")], "d6": [("line", "bg"), ("line", "acc")], "d7": [("acc", "bg"), ("hl", "bg")]}[i]
    for f, b in NT:
        r = cr(c[f], c[b]); assert r >= 3 or f == "line", (i, f, b, r); res.append(f"{f}/{b} {r:.2f}")
    return res

BASE = """:root{--bg:%bg%;--surf:%surf%;--text:%text%;--muted:%muted%;--acc:%acc%;--onacc:%onacc%;--hl:%hl%;--line:%line%;--link:%link%;--ok:%ok%;--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:64px;--s9:96px;--r:%r%;--bw:%bw%;--disp:%disp%,'Noto Sans','Noto Sans Devanagari','Noto Sans SC',sans-serif;--body:%body%,'Noto Sans','Noto Sans Devanagari','Noto Sans SC',sans-serif;--mono:%mono%,ui-monospace,monospace;--he:%he%,'Noto Sans Hebrew',sans-serif;--case:%case%;--t1:12px;--l1:16px;--t2:14px;--l2:20px;--t3:16px;--l3:24px;--t4:20px;--l4:28px;--t5:32px;--l5:40px;--t6:48px;--l6:56px;--t7:72px;--l7:76px;--t8:120px;--ease:%ease%}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:400 var(--t3)/var(--l3) var(--body);-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--link);text-underline-offset:3px}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--acc);outline-offset:3px}
img{display:block;max-width:100%;height:auto}h1,h2,h3,p{margin:0}h1,h2,h3{font-family:var(--disp);font-weight:700;text-transform:var(--case)}
.h1{font-size:var(--t7);line-height:var(--l7)}.h2{font-size:var(--t5);line-height:var(--l5)}.h3{font-size:var(--t4);line-height:var(--l4)}
.muted{color:var(--muted)}.sm{font-size:var(--t2);line-height:var(--l2)}.xs{font-size:var(--t1);line-height:var(--l1)}
.lab{font:600 var(--t1)/var(--l1) var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.he{font-family:var(--he)}.wrap{max-width:1200px;margin:0 auto;padding:0 var(--s6)}
.stack>*+*{margin-top:var(--s4)}.row{display:flex;gap:var(--s4);align-items:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);min-height:48px;padding:var(--s3) var(--s5);background:var(--acc);color:var(--onacc);border:0;border-radius:var(--r);font:600 var(--t3)/var(--l3) var(--body);text-decoration:none;cursor:pointer;transition:background-color 120ms var(--ease),transform 80ms var(--ease)}
.btn:hover{background:color-mix(in srgb,var(--acc) 86%,#000)}.btn:active{transform:translateY(1px)}.btn:focus-visible{outline:3px solid var(--text);outline-offset:3px}.btn:disabled{background:var(--surf);color:var(--muted);box-shadow:inset 0 0 0 1px var(--muted);cursor:not-allowed}
.btn.ghost{background:transparent;color:var(--text);box-shadow:inset 0 0 0 2px var(--text)}.btn.ghost:hover{background:color-mix(in srgb,var(--text) 10%,transparent)}.btn.block{width:100%}
.inp{width:100%;min-height:48px;padding:var(--s3) var(--s4);font:400 var(--t3)/var(--l3) var(--body);color:var(--text);background:var(--surf);border:1px solid var(--muted);border-radius:var(--r)}.inp:focus-visible{outline:3px solid var(--acc);outline-offset:2px}
label.f{display:block}label.f>span{display:block;margin-bottom:var(--s2);font-size:var(--t2);line-height:var(--l2);color:var(--muted)}
.card{background:var(--surf);border-radius:var(--r);padding:var(--s5);border:var(--bw) solid var(--line)}
.chip{display:inline-flex;align-items:center;gap:var(--s1);min-height:32px;padding:var(--s1) var(--s3);border-radius:var(--r);border:1px solid var(--muted);font-size:var(--t2);line-height:var(--l2);color:var(--text);background:transparent}
.chip[aria-pressed=true]{background:var(--acc);color:var(--onacc);border-color:var(--acc)}
.grid{display:grid;gap:var(--s4)}.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}.g5{grid-template-columns:repeat(5,minmax(0,1fr))}.g6{grid-template-columns:repeat(6,minmax(0,1fr))}
.bar{height:8px;background:color-mix(in srgb,var(--muted) 30%,transparent);border-radius:var(--r)}.bar i{display:block;height:100%;background:var(--acc);border-radius:var(--r)}
.word{font:700 var(--t6)/var(--l6) var(--disp);text-transform:var(--case)}.nc,[lang=ru],[lang=el]{text-transform:none!important}
.eq{font:600 var(--t4)/var(--l4) var(--mono)}
.top{display:flex;justify-content:space-between;align-items:center;gap:var(--s4);padding:var(--s4) var(--s6);border-bottom:1px solid var(--line)}
.brand{display:inline-flex;align-items:center;gap:var(--s2);font:700 var(--t4)/var(--l4) var(--disp);color:var(--text);text-decoration:none}.brand img{width:32px;height:32px}
.top nav{display:flex;gap:var(--s5)}.top nav a{color:var(--text);text-decoration:none;min-height:48px;display:inline-flex;align-items:center}.top nav a[aria-current]{text-decoration:underline;text-decoration-color:var(--acc);text-decoration-thickness:3px;text-underline-offset:8px}
.foot{border-top:1px solid var(--line);padding:var(--s7) 0 var(--s6);margin-top:var(--s8)}.foot h3{font-size:var(--t2);line-height:var(--l2);margin-bottom:var(--s3)}.foot ul{list-style:none;padding:0;margin:0}.foot li{min-height:32px;display:flex;align-items:center}.foot a{color:var(--muted);text-decoration:none}.foot a:hover{color:var(--text);text-decoration:underline}
.shell{display:grid;grid-template-columns:var(--navw) minmax(0,1fr);min-height:100vh}.side{border-right:1px solid var(--line);padding:var(--s4) var(--s3);display:flex;flex-direction:column;gap:var(--s1);position:sticky;top:0;height:100vh}
.side a.ni{display:flex;align-items:center;gap:var(--s3);min-height:48px;padding:var(--s2) var(--s3);border-radius:var(--r);color:var(--text);text-decoration:none;font-size:var(--t2);line-height:var(--l2)}.side a.ni img{width:24px;height:24px;flex:none}.side a.ni:hover{background:color-mix(in srgb,var(--text) 8%,transparent)}
.side .brand{padding:var(--s2) var(--s3) var(--s4)}
.main{padding:var(--s6) var(--s7) var(--s8);min-width:0}.apphead{display:flex;justify-content:space-between;align-items:flex-end;gap:var(--s4);margin-bottom:var(--s6);flex-wrap:wrap}
.opt{display:flex;align-items:center;gap:var(--s3);width:100%;min-height:56px;padding:var(--s3) var(--s4);background:var(--surf);color:var(--text);border:1px solid var(--line);border-radius:var(--r);font:400 var(--t3)/var(--l3) var(--body);text-align:left;cursor:pointer}.opt:hover{border-color:var(--text)}.opt[aria-checked=true]{border:2px solid var(--acc);padding:calc(var(--s3) - 1px) calc(var(--s4) - 1px)}
.key{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:1px solid var(--muted);border-radius:var(--r);font:600 var(--t1)/1 var(--mono);color:var(--muted);flex:none}
.tog{position:relative;width:48px;height:28px;border-radius:14px;background:color-mix(in srgb,var(--muted) 45%,var(--bg));border:0;flex:none;cursor:pointer}.tog::after{content:"";position:absolute;left:4px;top:4px;width:20px;height:20px;border-radius:50%;background:var(--text);transition:left 120ms var(--ease)}.tog[aria-checked=true]{background:var(--acc)}.tog[aria-checked=true]::after{left:24px;background:var(--onacc)}
.setrow{display:flex;justify-content:space-between;align-items:center;gap:var(--s4);padding:var(--s4) 0;border-bottom:1px solid var(--line)}
.code{display:flex;gap:var(--s2)}.code input{width:56px;height:64px;text-align:center;font:700 var(--t5)/1 var(--mono);color:var(--text);background:var(--surf);border:1px solid var(--muted);border-radius:var(--r)}.code input:focus-visible{outline:3px solid var(--acc);outline-offset:2px}
.auth{min-height:100vh;display:grid;grid-template-columns:1fr 1fr}.auth .art{background:var(--surf);display:flex;flex-direction:column;justify-content:space-between;padding:var(--s7);gap:var(--s6);overflow:hidden}.auth .form{display:flex;flex-direction:column;justify-content:center;padding:var(--s7);max-width:520px;width:100%;margin:0 auto}
.term{background:#0D0D0D;color:#E6E6E6;font:400 var(--t2)/var(--l3) 'Space Mono',ui-monospace,monospace;padding:var(--s5);border-radius:var(--r);overflow-x:auto}.term .p{color:#9BE29B}.term .d{color:#B3B3B3}
.steps{counter-reset:s}.step{position:relative}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.bnav{display:none}
@media (max-width:720px){.wrap{padding:0 var(--s4)}.top{padding:var(--s3) var(--s4)}.top nav{display:none}.h1{font-size:var(--t6);line-height:var(--l6)}.h2{font-size:var(--t4);line-height:var(--l4)}.word{font-size:var(--t5);line-height:var(--l5)}
.g2,.g3,.g4{grid-template-columns:minmax(0,1fr)}.g5,.g6{grid-template-columns:repeat(2,minmax(0,1fr))}.shell{grid-template-columns:minmax(0,1fr)}.side{display:none}.main{padding:var(--s5) var(--s4) calc(var(--s9) + var(--s4))}
.bnav{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:0;right:0;bottom:0;background:var(--surf);border-top:1px solid var(--line);z-index:5}.bnav a{display:flex;flex-direction:column;align-items:center;gap:var(--s1);min-height:64px;justify-content:center;color:var(--text);text-decoration:none;font-size:var(--t1);line-height:var(--l1)}.bnav a img{width:24px;height:24px}.bnav a[aria-current]{box-shadow:inset 0 3px 0 var(--acc)}
.auth{grid-template-columns:minmax(0,1fr);grid-template-rows:auto 1fr}.auth .form{justify-content:flex-start}.auth .art{padding:var(--s3) var(--s4)}.auth .art>.stack,.auth .art>img{display:none}.auth .form{padding:var(--s6) var(--s4)}.code{gap:var(--s1)}.code input{width:calc((100vw - 2*var(--s4) - 5*var(--s1))/6);height:56px;font-size:var(--t4)}.main{padding-top:var(--s5)}}

.root-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.root-grid .word{font-size:clamp(28px,3vw,40px);line-height:1.25;white-space:nowrap;overflow-wrap:normal}
.study-face{padding:clamp(24px,4vw,48px) clamp(20px,3vw,32px)}
.study-face .word{font-size:clamp(40px,5vw,64px);line-height:1.15;white-space:nowrap;overflow-wrap:normal}
@media(max-width:900px){.root-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.root-grid{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
"""

DIR_CSS = {
"d4": """:root{--navw:96px}.side{align-items:center;padding:var(--s4) var(--s2)}.side .brand span{display:none}.side .brand{padding:var(--s2) 0 var(--s5)}.side a.ni{flex-direction:column;gap:var(--s1);width:80px;padding:var(--s1) 0;font:500 var(--t1)/var(--l1) var(--body);text-align:center;border-radius:0}.side a.ni img{width:56px;height:32px;padding:var(--s1) var(--s4);box-sizing:border-box;object-fit:contain}.side a.ni[aria-current] img{background:var(--acc);clip-path:polygon(0 0,100% 0,100% 70%,80% 100%,0 100%)}
.card{border:0;border-left:12px solid var(--acc);clip-path:polygon(0 0,100% 0,100% calc(100% - 24px),calc(100% - 24px) 100%,0 100%)}.btn{text-transform:none;letter-spacing:0}.h1{font-size:var(--t8);line-height:.88;letter-spacing:.01em}.wedge{position:absolute;right:-12%;top:0;width:44%;height:100%;background:var(--acc);transform:skewX(-30deg);z-index:0;pointer-events:none}.lab{letter-spacing:.14em}.apphead h1{font-size:var(--t6);line-height:var(--l6)}
@media (max-width:720px){.h1{font-size:var(--t7);line-height:var(--l7)}.wedge{width:30%;right:-20%}}""",
"d5": """:root{--navw:248px}.side{background:color-mix(in srgb,var(--surf) 70%,var(--bg))}.side a.ni[aria-current]{background:var(--surf);position:relative}.side a.ni[aria-current]::after{content:"";position:absolute;right:var(--s3);width:12px;height:12px;background:var(--acc);clip-path:polygon(50% 0,62% 31%,93% 22%,78% 50%,93% 78%,62% 69%,50% 100%,38% 69%,7% 78%,22% 50%,7% 22%,38% 31%)}
body{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%232C5AA0' stroke-width='1' opacity='.35'%3E%3Cpath d='M48 8 60 36 88 48 60 60 48 88 36 60 8 48 36 36Z'/%3E%3Cpath d='M20 20h56v56H20Z' transform='rotate(45 48 48)'/%3E%3C/g%3E%3C/svg%3E")}.card{box-shadow:0 2px 4px rgba(0,0,0,.18),0 8px 16px rgba(0,0,0,.14)}.star{display:inline-block;width:16px;height:16px;background:var(--hl);clip-path:polygon(50% 0,62% 31%,93% 22%,78% 50%,93% 78%,62% 69%,50% 100%,38% 69%,7% 78%,22% 50%,7% 22%,38% 31%);vertical-align:-2px}.h1{word-spacing:.12em}
.main,.top,.foot,.auth .form{background:transparent}""",
"d6": """:root{--navw:224px}.lab,.btn,.chip,.key{font-family:var(--mono)}.btn{border-radius:999px;border:2px solid #111;text-transform:uppercase;font-size:var(--t1);letter-spacing:.08em}.btn.ghost{box-shadow:none;border-color:#111}.btn:focus-visible{outline-color:var(--hl)}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline-color:var(--hl)}.inp:focus-visible,.code input:focus-visible{outline-color:var(--hl)}.inp,.code input{border:2px solid #111}.chip{border:2px solid #111;text-transform:uppercase;font-size:var(--t1)}.chip[aria-pressed=true]{color:#111}.opt{border:2px solid #111}.opt[aria-checked=true]{border:2px solid #111;box-shadow:inset 0 0 0 2px var(--acc)}
.knob{display:inline-block;width:16px;height:16px;border-radius:50%;background:var(--acc);border:2px solid #111;flex:none}.btn .knob{background:var(--surf)}.side{background:var(--surf);border-right:2px solid #111}.side a.ni{border:2px solid transparent;font-family:var(--mono);text-transform:uppercase;font-size:var(--t1);letter-spacing:.06em}.side a.ni[aria-current]{border-color:#111;background:var(--acc)}.top{border-bottom:2px solid #111}.foot{border-top:2px solid #111}.bar{border:2px solid #111;height:12px;border-radius:0}.bar i{border-radius:0}.tog{border:2px solid #111;background:var(--bg)}.tog::after{top:2px;left:2px;background:#111}.tog[aria-checked=true]::after{left:22px;background:#111}.h1{letter-spacing:-.02em}.setrow{border-bottom:2px solid #111}"""}

D["d7"] = dict(name="Euclid", system="Wikimedia Codex", movement="Classical Greek red-figure, stoichedon and Byrne's Euclid",
   fonts="family=GFS+Didot&family=Gentium+Book+Plus:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Mono",
   disp="'GFS Didot'", body="'Gentium Book Plus'", mono="'Noto Sans Mono'", he="'Noto Sans Hebrew'",
   c=dict(bg="#F3EEE3", surf="#FBF8F1", text="#1A1714", muted="#5B5148", acc="#A6442A", onacc="#FFFFFF", hl="#1E4F94", line="#D8CDBB", link="#1E4F94", ok="#1E4F94"),
   r="2px", bw="1px", case="none", hero="Every proof, in order.", cta="Begin the Elements", kicker="Στοιχεῖα · Elements")
DIR_CSS["d7"] = """:root{--navw:232px}.side{background:var(--surf);border-right:1px solid var(--line)}.side a.ni[aria-current]{background:#EADFCB;box-shadow:inset 3px 0 0 var(--acc)}.card{border:1px solid var(--line);background:var(--surf)}.h1{font-weight:400;letter-spacing:.04em}.lab{letter-spacing:.12em}.main,.top,.foot,.auth .form{background:transparent}"""
PAGES = ["landing", "polingual-landing", "polingual-flow", "app-learn", "app-language-picker", "app-study-card", "app-review", "app-quiz", "app-placement", "app-progress", "app-canon-search", "app-settings", "signin", "signup", "signin-code", "email-signin", "onboarding", "download", "logo-in-context", "names"]

CANON = [
 ("shannon-1948", "Claude Shannon", "1948", "A Mathematical Theory of Communication", "Bell System Technical Journal 27", "H = −Σ pᵢ log₂ pᵢ", "Information", "Information is measured in bits. A source's entropy is the floor on how far its messages can be compressed."),
 ("maxwell-1865", "James Clerk Maxwell", "1865", "A Dynamical Theory of the Electromagnetic Field", "Philosophical Transactions of the Royal Society 155", "∇ × B = μ₀J + μ₀ε₀ ∂E/∂t", "Physics", "Electric and magnetic fields form one field. Its waves travel at the speed of light, so light is electromagnetic."),
 ("noether-1918", "Emmy Noether", "1918", "Invariante Variationsprobleme", "Nachrichten der Gesellschaft der Wissenschaften zu Göttingen", "∂L/∂q̇ · δq = const", "Mathematics", "Every continuous symmetry of a physical action has a conserved quantity. Time symmetry gives energy."),
 ("boltzmann-1877", "Ludwig Boltzmann", "1877", "Über die Beziehung zwischen dem zweiten Hauptsatze der mechanischen Wärmetheorie und der Wahrscheinlichkeitsrechnung", "Wiener Berichte 76", "S = k log W", "Physics", "Entropy counts the microstates behind a macrostate. The second law becomes a statement about probability."),
 ("landauer-1961", "Rolf Landauer", "1961", "Irreversibility and Heat Generation in the Computing Process", "IBM Journal of Research and Development 5", "E ≥ kT ln 2", "Information", "Erasing one bit dissipates at least kT ln 2 of heat. Information is physical."),
]

WORDS = [
 ("English", "hundred", "/ˈhʌndrəd/", "Latin", "en", "ltr"),
 ("French", "cent", "/sɑ̃/", "Latin", "fr", "ltr"),
 ("Spanish", "cien", "/θjen/", "Latin", "es", "ltr"),
 ("Hebrew", "מאה", "/meˈa/", "Hebrew", "he", "rtl"),
 ("Greek", "εκατό", "/e.kaˈto/", "Greek", "el", "ltr"),
 ("Russian", "сто", "/sto/", "Cyrillic", "ru", "ltr"),
]

SCRIPTS = [("Latin", "Aa", "hundred · cent · cien", "en"), ("Hebrew", "אב", "מאה", "he"), ("Greek", "Αα", "εκατό", "el"), ("Cyrillic", "Аа", "сто", "ru"), ("Devanagari", "अ", "सौ", "hi"), ("Han", "百", "百", "zh")]

def w(lang, word, cls=""):
    d = ' dir="rtl"' if lang == "he" else ""
    hc = " he" if lang == "he" else ""
    return f'<span lang="{lang}"{d} class="{cls}{hc}">{word}</span>'

def head(i, title, extra=""):
    d = D[i]
    css = BASE
    for k, v in d["c"].items(): css = css.replace(f"%{k}%", v)
    for k in ("r", "bw", "disp", "body", "mono", "he", "case"): css = css.replace(f"%{k}%", d[k])
    css = css.replace("%ease%", {"d4": "cubic-bezier(0.2,0,0,1)", "d5": "cubic-bezier(0,0,0,1)", "d6": "steps(4,end)", "d7": "cubic-bezier(0.4,0,0.2,1)"}[i])
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title>
<link rel="icon" href="../../icons/{i}-brand-16.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{d["fonts"]}&family=Noto+Sans:wght@400;600&family=Noto+Sans+Hebrew:wght@400;600&family=Noto+Sans+Devanagari:wght@400;600&family=Noto+Sans+SC:wght@400;600&display=swap">
<style>{css}{DIR_CSS[i]}{extra}</style></head>'''

def brand(i, label=True):
    return f'<a class="brand" href="landing.html"><img src="../../icons/{i}-brand.svg" alt="" width="32" height="32"><span>bkt</span></a>'

def topbar(i, cur=""):
    items = [("Canon", "app-canon-search.html"), ("Polingual", "polingual-landing.html"), ("Download", "download.html"), ("Sign in", "signin.html")]
    nav = "".join(f'<a href="{h}"{" aria-current=page" if n == cur else ""}>{n}</a>' for n, h in items)
    return f'<header class="top">{brand(i)}<nav aria-label="Main">{nav}</nav><a class="btn" href="signup.html">{D[i]["cta"] if i != "d6" else "<span class=knob></span>" + D[i]["cta"]}</a></header>'

def footer(i):
    cols = [("Canon", [("Search", "app-canon-search.html"), ("Mathematics", "#"), ("Physics", "#"), ("Information", "#")]),
            ("Polingual", [("polingual.com", "polingual-landing.html"), ("How it works", "polingual-flow.html"), ("Placement test", "app-placement.html"), ("Writing systems", "app-language-picker.html")]),
            ("Build", [("Download", "download.html"), ("CLI bkt", "download.html#cli"), ("feed402 spec", "#"), ("llms.txt", "#")]),
            ("Foundation", [("Manifesto", "#"), ("Governance", "#"), ("Protocol", "#"), ("Names and marks", "names.html")])]
    c = "".join(f'<div><h3>{h}</h3><ul>{"".join(f"<li><a href={x[1]}>{x[0]}</a></li>" for x in l)}</ul></div>' for h, l in cols)
    return f'''<footer class="foot"><div class="wrap"><div class="grid g5"><div class="stack">{brand(i)}<p class="sm muted">Foundations of every field. Read free. Cite once, pay the author.</p></div>{c}</div>
<div class="row sm muted" style="justify-content:space-between;margin-top:var(--s7)"><span>bucket.foundation · MIT code · CC0 protocol</span><span>Citation fees settle over x402 on Base</span></div></div></footer>'''

NAV = [("home", "Learn", "app-learn.html"), ("cards", "Study", "app-study-card.html"), ("listen", "Review", "app-review.html"), ("search", "Canon", "app-canon-search.html"), ("library", "Languages", "app-language-picker.html"), ("cite", "Progress", "app-progress.html"), ("settings", "Settings", "app-settings.html")]
BNAV = ["home", "cards", "search", "cite", "settings"]

def shell(i, cur, title, sub, body, actions=""):
    side = "".join(f'<a class="ni" href="{h}"{" aria-current=page" if k == cur else ""}><img src="../../icons/{i}-{k}.svg" alt="" width="24" height="24"><span>{n}</span></a>' for k, n, h in NAV)
    prof = f'<a class="ni" href="app-settings.html" style="margin-top:auto"><img src="../../icons/{i}-profile.svg" alt="" width="24" height="24"><span>Ada R.</span></a>'
    bn = "".join(f'<a href="{h}"{" aria-current=page" if k == cur else ""}><img src="../../icons/{i}-{k}.svg" alt="" width="24" height="24">{n}</a>' for k, n, h in NAV if k in BNAV)
    return f'''<body><div class="shell"><nav class="side" aria-label="App">{brand(i)}{side}{prof}</nav><main class="main"><div class="apphead"><div><p class="lab">{sub}</p><h1 class="h2">{title}</h1></div>{actions}</div>{body}</main></div><nav class="bnav" aria-label="App">{bn}</nav></body></html>'''

def canon_card(i, e, full=False):
    slug, who, yr, t, venue, eq, br, gist = e
    return f'''<article class="card stack"><div class="row" style="justify-content:space-between"><span class="lab">{br} · {yr}</span><span class="lab">{slug}</span></div><h3 class="h3">{who}</h3><p class="sm"><i lang="{"de" if slug in ("noether-1918","boltzmann-1877") else "en"}">{t}</i></p>{f'<p class="eq">{eq}</p>' if full else ""}<p class="sm muted">{gist}</p>{f'<p class="xs muted">{venue}</p><div class="row"><a class="btn" href="#">Cite</a><a class="btn ghost" href="#">Read</a></div>' if full else ""}</article>'''

def pg_landing(i):
    d = D[i]
    cards = "".join(canon_card(i, e) for e in CANON[:4])
    tree = "".join(f'<div class="card"><p class="lab">{x[0]}</p><p class="h3" style="margin-top:var(--s2)">{w(x[4], x[1])}</p><p class="sm muted">{x[2]}</p></div>' for x in WORDS)
    return head(i, f"bkt {d['name']} landing") + f'''<body>{topbar(i, "Canon")}<section style="position:relative;overflow:hidden"><div class="{"wedge" if i == "d4" else ""}" aria-hidden="true"></div><div class="wrap grid g2" style="position:relative;padding-top:var(--s8);padding-bottom:var(--s8);align-items:center;gap:var(--s7)">
<div class="stack"><p class="lab">{d["kicker"]}</p><h1 class="h1">{d["hero"]}</h1><p class="muted" style="font-size:var(--t4);line-height:var(--l4);max-width:44ch">Bucket holds the foundations of every field: axioms, laws and primary derivations. Read free. When you cite one, the author is paid.</p><div class="row" style="margin-top:var(--s5)"><a class="btn" href="signup.html">{"<span class=knob></span>" if i == "d6" else ""}{d["cta"]}</a><a class="btn ghost" href="app-canon-search.html">Search the canon</a></div></div>
<figure style="margin:0"><img src="../../img/{i}-hero.jpg" alt="Concept art for {d["name"]}, after {d["movement"]}" width="768" height="1024" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--r);{"border:2px solid #111" if i == "d6" else ""}"></figure></div></section>
<section class="wrap" style="padding-top:var(--s7)"><div class="row" style="justify-content:space-between;margin-bottom:var(--s5)"><h2 class="h2">From the canon</h2><a href="app-canon-search.html">All entries</a></div><div class="grid g4">{cards}</div></section>
<section class="wrap" style="padding-top:var(--s8)"><div class="grid g2" style="gap:var(--s7);align-items:start"><div class="stack"><p class="lab">Polingual</p><h2 class="h2">Words and their roots</h2><p class="muted">Learn a word once and follow it across languages. Polingual is the language school inside Bucket.</p><a class="btn ghost" href="polingual-landing.html">Visit polingual.com</a></div><div class="grid g3">{tree}</div></div></section>
<section class="wrap" style="padding-top:var(--s8)"><div class="grid g4">{"".join(f'<div class="stack"><p class="h2">{a}</p><p class="sm muted">{b}</p></div>' for a, b in [("Read free", "Every entry is open to read, with the primary source linked."), ("Cite once", "A citation pays its author one time over x402."), ("Agents welcome", "AI agents find the canon through /llms.txt and the feed402 spec."), ("No exit", "A nonprofit foundation. No equity and no investors.")])}</div></section>
{footer(i)}</body></html>'''

def pg_polingual_landing(i):
    d = D[i]
    cog = "".join(f'<div class="card stack"><p class="lab">{x[0]} · {x[3]}</p><p class="word">{w(x[4], x[1])}</p><p class="sm muted">{x[2]}</p></div>' for x in WORDS)
    top = f'<header class="top"><a class="brand" href="polingual-landing.html"><img src="../../icons/{i}-brand.svg" alt="" width="32" height="32"><span>polingual</span></a><nav aria-label="Main"><a href="polingual-flow.html">How it works</a><a href="app-language-picker.html">Languages</a><a href="landing.html">Bucket</a></nav><a class="btn" href="app-placement.html">{"<span class=knob></span>" if i == "d6" else ""}Take the placement</a></header>'
    return head(i, f"Polingual {d['name']}") + f'''<body>{top}<section class="wrap grid g2" style="padding-top:var(--s8);gap:var(--s7);align-items:center"><div class="stack"><p class="lab">polingual.com</p><h1 class="h1">{"Hundred, six ways" if i != "d6" else "hundred, six ways."}</h1><p class="muted" style="font-size:var(--t4);line-height:var(--l4)">Polingual teaches words by their roots. Start with English <b lang="en">hundred</b>, then meet {w("fr","cent")}, {w("es","cien")}, {w("he","מאה")}, {w("el","εκατό")} and {w("ru","сто")}.</p><div class="row"><a class="btn" href="app-placement.html">Find your level</a><a class="btn ghost" href="polingual-flow.html">See a lesson</a></div></div>
<img src="../../3d/{i}-object.png" alt="The {d["name"]} mark as a 3D object" width="2048" height="2048" style="width:100%;max-width:520px;justify-self:center"></section>
<section class="wrap" style="padding-top:var(--s8)"><h2 class="h2" style="margin-bottom:var(--s5)">The root family</h2><div class="grid root-grid">{cog}</div><p class="sm muted" style="margin-top:var(--s4)">English hundred, French cent, Spanish cien, Greek εκατό and Russian сто share the Indo-European root <i>ḱm̥tóm</i>. Hebrew מאה is a translation from the Semitic family. <a href="https://lrc.la.utexas.edu/eieol/grkol/0">Greek and English cognates</a>.</p></section>
<section class="wrap" style="padding-top:var(--s8)"><div class="grid g4">{"".join(f'<div class="card stack"><p class="lab">Step {n}</p><h3 class="h3">{a}</h3><p class="sm muted">{b}</p></div>' for n, (a, b) in enumerate([("Pick a language", "Six writing systems, right to left included."), ("Study", "One card a day per root, with sound and script."), ("Reveal", "Flip to see the cognates and the shared root."), ("Result", "Spaced review sets when the card comes back.")], 1))}</div></section>
{footer(i)}</body></html>'''

def pg_polingual_flow(i):
    d = D[i]
    pick = "".join(f'<button class="opt" role="radio" aria-checked="{"true" if x[0] == "Hebrew" else "false"}"><span class="key">{n}</span><span>{x[0]}</span><span class="muted" style="margin-left:auto">{w(x[4], x[1])}</span></button>' for n, x in enumerate(WORDS[1:], 1))
    return head(i, f"Polingual flow {d['name']}") + f'''<body>{topbar(i, "Polingual")}<main class="wrap" style="padding-top:var(--s7)"><p class="lab">Polingual lesson · root hundred</p><h1 class="h2" style="margin:var(--s2) 0 var(--s6)">Four steps from pick to result</h1><ol class="grid g4" style="list-style:none;padding:0;margin:0">
<li class="card stack" aria-label="Step 1"><p class="lab">1 · Pick a language</p><div class="stack" role="radiogroup" aria-label="Language" style="--s4:var(--s2)">{pick}</div></li>
<li class="card stack" aria-label="Step 2"><p class="lab">2 · Study</p><p class="sm muted">English root</p><p class="word" lang="en">hundred</p><p class="sm muted">/ˈhʌndrəd/ · the number 100</p><p class="sm">Now in Hebrew, written right to left.</p><p class="word he" lang="he" dir="rtl" style="text-align:right">מאה</p><button class="btn block">Reveal</button></li>
<li class="card stack" aria-label="Step 3"><p class="lab">3 · Reveal</p><p class="word he" lang="he" dir="rtl" style="text-align:right">מאה</p><p class="sm">me’ah, /meˈa/</p><ul class="sm" style="padding-left:var(--s4);margin:0"><li>{w("fr","cent")} French</li><li>{w("es","cien")} Spanish</li><li>{w("el","εκατό")} Greek</li><li>{w("ru","сто")} Russian</li></ul><div class="grid g2"><button class="btn ghost">Missed it</button><button class="btn">Got it</button></div></li>
<li class="card stack" aria-label="Step 4"><p class="lab">4 · Result</p><p class="h1" style="font-size:var(--t7);line-height:var(--l7)">6/6</p><p>The word <b>hundred</b> learned in six languages.</p><div class="bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" aria-label="Lesson"><i style="width:100%"></i></div><p class="sm muted">Next review in 3 days. Streak: 12 days.</p><a class="btn block" href="app-learn.html">Continue</a></li></ol></main>{footer(i)}</body></html>'''

def pg_app_learn(i):
    body = f'''<div class="grid g3" style="align-items:start"><section class="card stack" style="grid-column:span 2"><p class="lab">Continue · root hundred</p><p class="word" lang="en">hundred</p><div class="row">{"".join(f'<span class="chip">{w(x[4], x[1])}</span>' for x in WORDS[1:])}</div><div class="bar" aria-label="Lesson progress 4 of 6" role="progressbar" aria-valuenow="4" aria-valuemin="0" aria-valuemax="6"><i style="width:66%"></i></div><div class="row"><a class="btn" href="app-study-card.html">Resume lesson</a><span class="sm muted">4 of 6 cards</span></div></section>
<section class="card stack"><p class="lab">Today</p><p class="h1" style="font-size:var(--t7);line-height:var(--l7)">12</p><p class="sm">day streak</p><p class="sm muted">18 cards due for review</p><a class="btn ghost block" href="app-review.html">Review now</a></section></div>
<h2 class="h3" style="margin:var(--s7) 0 var(--s4)">Canon of the day</h2><div class="grid g2">{canon_card(i, CANON[2], True)}{canon_card(i, CANON[0], True)}</div>'''
    return head(i, "bkt learn") + shell(i, "home", "Good morning, Ada", "Learn", body, '<a class="btn" href="app-quiz.html">Daily quiz</a>')

def pg_app_language_picker(i):
    body = '<div class="grid g3">' + "".join(f'''<button class="opt" role="radio" aria-checked="{"true" if s[0] == "Hebrew" else "false"}" style="flex-direction:column;align-items:flex-start;gap:var(--s3);padding:var(--s5);min-height:200px"><span class="lab">{s[0]}{" · right to left" if s[0] == "Hebrew" else ""}</span><span lang="{s[3]}" {"dir=rtl" if s[3] == "he" else ""} class="{"he" if s[3] == "he" else ""}" style="font:700 var(--t7)/var(--l7) {"var(--he)" if s[3] == "he" else "var(--disp)"}">{s[1]}</span><span class="sm muted" lang="{s[3]}">{s[2]}</span></button>''' for s in SCRIPTS) + '</div><div class="row" style="margin-top:var(--s6);justify-content:flex-end"><a class="btn ghost" href="app-learn.html">Back</a><a class="btn" href="app-study-card.html">Start with Hebrew</a></div>'
    return head(i, "bkt languages") + shell(i, "library", "Choose a writing system", "Languages", f'<div role="radiogroup" aria-label="Writing system">{body}</div>')

def pg_app_study_card(i):
    body = f'''<div style="max-width:720px;margin:0 auto" class="stack"><div class="row" style="justify-content:space-between"><span class="lab">Card 4 of 6 · Greek</span><span class="sm muted">Space to reveal</span></div><div class="bar" role="progressbar" aria-label="Lesson" aria-valuenow="4" aria-valuemin="0" aria-valuemax="6"><i style="width:66%"></i></div>
<article class="card study-face" style="text-align:center;min-height:360px;display:flex;flex-direction:column;justify-content:center;gap:var(--s4)"><p class="lab">English root</p><p class="word" lang="en">hundred</p><p class="muted">/ˈhʌndrəd/</p><hr style="width:64px;border:0;border-top:2px solid var(--acc);margin:var(--s2) auto"><p class="lab">Greek</p><p class="word" lang="el">εκατό</p><p class="muted">ekató, /e.kaˈto/</p></article>
<div class="grid g4"><button class="btn ghost">Again</button><button class="btn ghost">Hard</button><button class="btn">Good</button><button class="btn ghost">Easy</button></div><p class="xs muted" style="text-align:center">Again in 1 min · Hard in 6 min · Good in 3 days · Easy in 8 days</p></div>'''
    return head(i, "bkt study card") + shell(i, "cards", "Study", "Root hundred", body)

def pg_app_review(i):
    rows = [("en", "hundred", "English", "Today"), ("fr", "cent", "French", "Today"), ("es", "cien", "Spanish", "Today"), ("he", "מאה", "Hebrew", "Tomorrow"), ("el", "εκατό", "Greek", "In 3 days"), ("ru", "сто", "Russian", "In 8 days")]
    lst = "".join(f'<li class="setrow"><div class="row"><span class="word" style="font-size:var(--t5);line-height:var(--l5);min-width:6ch">{w(a, b)}</span><span class="sm muted">{c}</span></div><span class="chip">{dd}</span></li>' for a, b, c, dd in rows)
    body = f'''<div class="grid g3" style="align-items:start"><section class="card" style="grid-column:span 2"><ul style="list-style:none;padding:0;margin:0">{lst}</ul></section><aside class="card stack"><p class="lab">Due now</p><p class="h1" style="font-size:var(--t7);line-height:var(--l7)">18</p><p class="sm muted">About 6 minutes</p><a class="btn block" href="app-study-card.html">Start review</a><p class="lab" style="margin-top:var(--s5)">Retention · 30 days</p><p class="h2">91%</p></aside></div>'''
    return head(i, "bkt review") + shell(i, "listen", "Review queue", "Spaced review", body)

def pg_app_quiz(i):
    opts = [("сто", "ru", False), ("εκατό", "el", True), ("cien", "es", False), ("מאה", "he", False)]
    o = "".join(f'<button class="opt" role="radio" aria-checked="{str(c).lower()}"><span class="key">{n}</span>{w(l, t, "h3 nc")}{f"<span class=lab style=margin-left:auto;color:var(--ok)>Correct</span>" if c else ""}</button>' for n, (t, l, c) in enumerate(opts, 1))
    body = f'''<div style="max-width:640px;margin:0 auto" class="stack"><div class="row" style="justify-content:space-between"><span class="lab">Question 3 of 10</span><span class="lab">Score 2</span></div><div class="bar" role="progressbar" aria-label="Quiz" aria-valuenow="3" aria-valuemin="0" aria-valuemax="10"><i style="width:30%"></i></div><h2 class="h2" style="margin-top:var(--s6)">Which word means <span lang="en">hundred</span> in Greek?</h2><div class="stack" role="radiogroup" aria-label="Answers" style="margin-top:var(--s5)">{o}</div><div class="card sm">εκατό shares its role with Latin centum. The Greek form comes from <i>hekatón</i>, “one hundred”.</div><div class="row" style="justify-content:flex-end"><button class="btn">Next question</button></div></div>'''
    return head(i, "bkt quiz") + shell(i, "home", "Daily quiz", "Quiz", body)

def pg_app_placement(i):
    opts = ["ten", "one hundred", "one thousand", "a table"]
    o = "".join(f'<button class="opt" role="radio" aria-checked="{"true" if t == "one hundred" else "false"}"><span class="key">{n}</span>{t}</button>' for n, t in enumerate(opts, 1))
    body = f'''<div style="max-width:640px;margin:0 auto" class="stack"><p class="lab">Placement · Russian · 4 of 12</p><div class="bar" role="progressbar" aria-label="Placement" aria-valuenow="4" aria-valuemin="0" aria-valuemax="12"><i style="width:33%"></i></div><p class="muted" style="margin-top:var(--s6)">What does this word mean?</p><p class="word" lang="ru" style="font-size:var(--t7);line-height:var(--l7)">сто</p><p class="muted">sto, /sto/</p><div class="stack" role="radiogroup" aria-label="Answers">{o}</div><div class="row" style="justify-content:space-between"><button class="btn ghost">I don’t know</button><button class="btn">Check</button></div><p class="xs muted">Twelve questions set your starting level. You can retake it any time.</p></div>'''
    return head(i, "bkt placement") + shell(i, "library", "Find your level", "Placement test", body)

def pg_app_progress(i):
    days = [("Mon", 12), ("Tue", 18), ("Wed", 9), ("Thu", 22), ("Fri", 16), ("Sat", 25), ("Sun", 14)]
    mx = 25
    bars = "".join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:var(--s2);flex:1"><span class="xs muted">{v}</span><div style="width:100%;max-width:40px;height:{v * 160 // mx}px;background:var(--acc);border-radius:var(--r) var(--r) 0 0"></div><span class="xs">{dn}</span></div>' for dn, v in days)
    langs = [("English", 42, 50), ("French", 31, 50), ("Spanish", 28, 50), ("Hebrew", 17, 50), ("Greek", 14, 50), ("Russian", 11, 50)]
    lb = "".join(f'<div class="stack" style="--s4:var(--s2)"><div class="row" style="justify-content:space-between"><span class="sm">{a}</span><span class="sm muted">{b} roots</span></div><div class="bar" role="progressbar" aria-label="{a}" aria-valuenow="{b}" aria-valuemin="0" aria-valuemax="{c}"><i style="width:{b * 100 // c}%"></i></div></div>' for a, b, c in langs)
    stats = "".join(f'<div class="card"><p class="lab">{a}</p><p class="h2" style="margin-top:var(--s2)">{b}</p></div>' for a, b in [("Streak", "12 days"), ("Roots learned", "143"), ("Canon entries read", "5"), ("Citations made", "2")])
    body = f'''<div class="grid g4">{stats}</div><div class="grid g2" style="margin-top:var(--s5);align-items:start"><section class="card stack"><p class="lab">Cards reviewed this week · 116 total</p><div style="display:flex;align-items:flex-end;gap:var(--s3);height:220px" role="img" aria-label="Cards reviewed per day: Mon 12, Tue 18, Wed 9, Thu 22, Fri 16, Sat 25, Sun 14">{bars}</div></section><section class="card stack"><p class="lab">Roots by language</p>{lb}</section></div>
<section class="card" style="margin-top:var(--s5)"><p class="lab" style="margin-bottom:var(--s3)">Canon read</p><div class="row">{"".join(f'<span class="chip">{e[1].split()[-1]} {e[2]}</span>' for e in CANON)}</div></section>'''
    return head(i, "bkt progress") + shell(i, "cite", "Progress", "Last 7 days", body)

def pg_app_canon_search(i):
    res = "".join(canon_card(i, e, True) for e in CANON)
    body = f'''<form role="search" class="row" style="flex-wrap:nowrap" onsubmit="return false"><label class="sr" for="q">Search the canon</label><input class="inp" id="q" type="search" value="entropy" autocomplete="off"><button class="btn" type="submit">Search</button></form><div class="row" style="margin:var(--s4) 0 var(--s5)"><button class="chip" aria-pressed="true">All</button><button class="chip" aria-pressed="false">Mathematics</button><button class="chip" aria-pressed="false">Physics</button><button class="chip" aria-pressed="false">Information</button></div><p class="sm muted" style="margin-bottom:var(--s4)">5 foundations</p><div class="grid g2">{res}</div>'''
    return head(i, "bkt canon search") + shell(i, "search", "Search the canon", "Canon", body, f'<a class="btn ghost" href="../../screens/{i}-search.html">Open full search design</a>')

def pg_app_settings(i):
    tg = lambda n, on: f'<div class="setrow"><span id="t{__import__("zlib").crc32(n.encode()) % 9999}">{n}</span><button class="tog" role="switch" aria-checked="{"true" if on else "false"}" aria-labelledby="t{__import__("zlib").crc32(n.encode()) % 9999}"></button></div>'
    body = f'''<div class="grid g2" style="align-items:start"><section class="card stack"><p class="lab">Profile</p><label class="f"><span>Name</span><input class="inp" value="Ada Rivera"></label><label class="f"><span>Email</span><input class="inp" type="email" value="ada@bucket.foundation"></label><label class="f"><span>Daily goal</span><select class="inp"><option>10 cards</option><option selected>20 cards</option><option>40 cards</option></select></label><button class="btn">Save changes</button></section>
<section class="card"><p class="lab">Learning</p>{tg("Show romanization under Hebrew, Greek and Cyrillic", True)}{tg("Play audio on reveal", True)}{tg("Daily reminder at 8:00", False)}{tg("Reduce motion", False)}<p class="lab" style="margin-top:var(--s5)">Citations</p><div class="setrow"><div><p>Base wallet</p><p class="sm muted" style="font-family:var(--mono)">0x7a3f…c41e</p></div><button class="btn ghost">Change</button></div><div class="setrow" style="border:0"><span>Delete account</span><button class="btn ghost">Delete</button></div></section></div>'''
    return head(i, "bkt settings") + shell(i, "settings", "Settings", "Account", body)

def auth(i, title, inner):
    d = D[i]
    return head(i, title) + f'''<body><div class="auth"><aside class="art">{brand(i)}<div class="stack"><p class="lab">{d["kicker"]}</p><p class="h1" style="font-size:var(--t7);line-height:var(--l7)">{d["hero"]}</p><p class="muted">Noether 1918: every continuous symmetry has a conserved quantity.</p></div><img src="../../icons/{i}-brand.svg" alt="Bucket primary mark" width="200" height="200" style="width:160px;align-self:flex-end"></aside><main class="form stack">{inner}</main></div></body></html>'''

def pg_signin(i):
    return auth(i, "bkt sign in", '''<h1 class="h2">Sign in</h1><p class="muted">We email you a 6-digit code. No password.</p><label class="f"><span>Email</span><input class="inp" type="email" value="ada@bucket.foundation" autocomplete="email"></label><a class="btn block" href="signin-code.html">Email me a code</a><div class="row" style="justify-content:center"><span class="sm muted">or</span></div><button class="btn ghost block">Sign in with a passkey</button><button class="btn ghost block">Connect a Base wallet</button><p class="sm muted">New to Bucket? <a href="signup.html">Create an account</a></p>''')

def pg_signup(i):
    return auth(i, "bkt sign up", '''<h1 class="h2">Create your account</h1><p class="muted">Free to read. Free to learn.</p><label class="f"><span>Name</span><input class="inp" value="Ada Rivera" autocomplete="name"></label><label class="f"><span>Email</span><input class="inp" type="email" value="ada@bucket.foundation" autocomplete="email"></label><label class="row sm" style="flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" checked style="width:20px;height:20px;margin:var(--s1) 0 0;accent-color:var(--acc)"><span>Send me the canon entry of the week</span></label><a class="btn block" href="signin-code.html">Create account</a><p class="xs muted">By continuing you accept the Terms and the Privacy Policy.</p><p class="sm muted">Already have an account? <a href="signin.html">Sign in</a></p>''')

def pg_signin_code(i):
    digits = "482913"
    boxes = "".join(f'<input inputmode="numeric" maxlength="1" value="{c}" aria-label="Digit {n}">' for n, c in enumerate(digits[:4], 1)) + '<input inputmode="numeric" maxlength="1" aria-label="Digit 5"><input inputmode="numeric" maxlength="1" aria-label="Digit 6">'
    return auth(i, "bkt code", f'''<h1 class="h2">Check your email</h1><p class="muted">We sent a 6-digit code to <b>ada@bucket.foundation</b>. It expires in 10 minutes.</p><div class="code" role="group" aria-label="Sign-in code">{boxes}</div><button class="btn block" disabled>Verify</button><p class="sm muted">No email? <a href="#">Send a new code</a> in 0:42 · <a href="signin.html">Use another email</a></p>''')

def pg_email(i):
    d = D[i]; c = d["c"]
    font = d["body"].strip("'")
    fam = f"{d['body']},Arial,sans-serif"
    btnr = {"d4": "0", "d5": "4px", "d6": "999px", "d7": "2px"}[i]
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bkt sign-in email</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?{d["fonts"]}&display=swap"><style>@media (max-width:620px){{.c{{width:100%!important}}.p{{padding:24px 16px!important}}.n{{font-size:36px!important;letter-spacing:6px!important}}}}a:focus-visible{{outline:3px solid {c["acc"]};outline-offset:3px}}</style></head>
<body style="margin:0;padding:0;background:{c["bg"]}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{c["bg"]}"><tr><td align="center" style="padding:32px 8px">
<table role="presentation" class="c" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:{c["surf"]};border-radius:{d["r"]};{"border:2px solid #111;" if i == "d6" else ""}{"border-left:12px solid " + c["acc"] + ";" if i == "d4" else ""}">
<tr><td class="p" style="padding:32px 48px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:8px"><img src="http://127.0.0.1:8777/_directions/icons/{i}-brand.svg" width="32" height="32" alt="bkt" style="display:block"></td><td style="font:700 20px/28px {d["disp"]},Arial,sans-serif;color:{c["text"]}">bkt</td></tr></table></td></tr>
<tr><td class="p" style="padding:32px 48px 0;font:700 32px/40px {d["disp"]},Arial,sans-serif;color:{c["text"]};{"text-transform:uppercase;" if i == "d4" else ""}">Your sign-in code</td></tr>
<tr><td class="p" style="padding:16px 48px 0;font:400 16px/24px {fam};color:{c["muted"]}">Enter this code in Bucket to sign in as ada@bucket.foundation. It expires in 10 minutes.</td></tr>
<tr><td class="p" style="padding:32px 48px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" class="n" style="background:{c["bg"]};border-radius:{d["r"]};padding:24px;font:700 48px/56px 'Space Mono',ui-monospace,monospace;letter-spacing:12px;color:{c["text"]}">482 913</td></tr></table></td></tr>
<tr><td class="p" style="padding:0 48px 32px"><a href="http://127.0.0.1:8777/_directions/pages/{i}/signin-code.html" style="display:inline-block;background:{c["acc"]};color:{c["onacc"]};font:600 16px/24px {fam};text-decoration:none;padding:12px 24px;border-radius:{btnr};{"border:2px solid #111;" if i == "d6" else ""}">Open Bucket</a></td></tr>
<tr><td class="p" style="padding:24px 48px;border-top:1px solid {c["line"]};font:400 14px/20px {fam};color:{c["muted"]}">If you did not ask for this code, ignore this email. Nobody can sign in without it.<br><br>Bucket Foundation · bucket.foundation</td></tr></table></td></tr></table></body></html>'''

def pg_onboarding(i):
    steps = [
     ("Welcome", "Bucket holds the foundations of every field. Polingual teaches the words that carry them.", '<a class="btn" href="#s2">Start</a>'),
     ("Pick a writing system", "You can add more later.", '<div class="grid g3">' + "".join(f'<button class="chip" aria-pressed="{"true" if s[0] in ("Latin", "Hebrew") else "false"}" lang="{s[3]}">{s[0]} {s[1]}</button>' for s in SCRIPTS) + '</div>'),
     ("Set a daily goal", "Twenty cards takes about six minutes.", '<div role="radiogroup" aria-label="Daily goal" class="stack" style="--s4:var(--s2)">' + "".join(f'<button class="opt" role="radio" aria-checked="{"true" if g == "20 cards" else "false"}">{g}<span class="sm muted" style="margin-left:auto">{t}</span></button>' for g, t in [("10 cards", "3 min"), ("20 cards", "6 min"), ("40 cards", "12 min")]) + '</div>'),
     ("Follow a branch", "Your first canon entries come from the branches you pick.", '<div class="row">' + "".join(f'<button class="chip" aria-pressed="{"true" if b in ("Information", "Physics") else "false"}">{b}</button>' for b in ["Mathematics", "Physics", "Chemistry", "Information", "Biophysics", "Cosmology", "Mind"]) + '</div><a class="btn" href="app-learn.html" style="margin-top:var(--s5)">Finish</a>'),
    ]
    s = "".join(f'<section id="s{n}" class="card stack" aria-labelledby="h{n}"><div class="row"><span class="key" style="width:32px;height:32px">{n}</span><span class="lab">Step {n} of 4</span></div><h2 class="h3" id="h{n}">{a}</h2><p class="muted">{b}</p>{c}</section>' for n, (a, b, c) in enumerate(steps, 1))
    return head(i, "bkt onboarding") + f'''<body><header class="top">{brand(i)}<a href="app-learn.html">Skip</a></header><main class="wrap" style="max-width:880px;padding-top:var(--s7);padding-bottom:var(--s8)"><div class="bar" role="progressbar" aria-label="Setup" aria-valuenow="2" aria-valuemin="0" aria-valuemax="4" style="margin-bottom:var(--s6)"><i style="width:50%"></i></div><div class="stack" style="--s4:var(--s5)">{s}</div></main></body></html>'''

def pg_download(i):
    plats = [("macOS", "Apple silicon and Intel · macOS 13 or later", "Download .dmg"), ("Windows", "Windows 10 and 11 · x64 and ARM", "Download .msi"), ("Linux", "AppImage, .deb and .rpm", "Download AppImage"), ("iOS", "iPhone and iPad · iOS 16 or later", "App Store"), ("Android", "Android 10 or later", "Google Play")]
    cards = "".join(f'<article class="card stack"><p class="lab">{a}</p><h2 class="h3">bkt for {a}</h2><p class="sm muted">{b}</p><a class="btn ghost" href="#">{c}</a></article>' for a, b, c in plats)
    return head(i, "bkt download") + f'''<body>{topbar(i, "Download")}<main class="wrap" style="padding-top:var(--s8)"><div class="grid g2" style="align-items:center;gap:var(--s7)"><div class="stack"><p class="lab">Version 0.9.2 · 18 October 2026</p><h1 class="h1">{"Get bkt" if i != "d6" else "get bkt."}</h1><p class="muted" style="font-size:var(--t4);line-height:var(--l4)">The canon and Polingual on every device, with offline reading and sync.</p><a class="btn" href="#">Download for macOS</a></div><img src="../../3d/{i}-mark.png" alt="The bkt mark in 3D" width="2048" height="2048" style="width:100%;max-width:440px;justify-self:center"></div>
<div class="grid g3" style="margin-top:var(--s8)">{cards}<article class="card stack" id="cli"><p class="lab">CLI</p><h2 class="h3">bkt in your terminal</h2><pre class="term" style="margin:0"><span class="p">$</span> curl -fsSL https://bucket.foundation/install.sh | sh
<span class="p">$</span> bkt search entropy</pre><a class="btn ghost" href="#">CLI docs</a></article></div></main>{footer(i)}</body></html>'''

def pg_logo(i):
    d = D[i]; c = d["c"]
    apps = [("#3B6EA5", "Mail"), ("#4E8F5A", "Maps"), ("#7A5BA6", "Podcasts"), ("#A0703A", "Books"), ("#8E3B46", "Music"), ("#3E7F84", "Notes"), ("#555F6B", "Clock")]
    grid = "".join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:var(--s1)"><span style="width:56px;height:56px;border-radius:14px;background:{col}" aria-hidden="true"></span><span style="font-size:11px;line-height:var(--l1);color:#fff">{n}</span></div>' for col, n in apps[:3]) + f'<div style="display:flex;flex-direction:column;align-items:center;gap:var(--s1)"><img src="../../icons/{i}-brand.svg" alt="bkt app icon" width="56" height="56" style="border-radius:14px;background:{c['bg']};padding:6px;box-shadow:0 0 0 1px rgba(255,255,255,.5)"><span style="font-size:11px;line-height:var(--l1);color:#fff;font-weight:600">bkt</span></div>' + "".join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:var(--s1)"><span style="width:56px;height:56px;border-radius:14px;background:{col}" aria-hidden="true"></span><span style="font-size:11px;line-height:var(--l1);color:#fff">{n}</span></div>' for col, n in apps[3:])
    phone = f'''<div style="width:300px;height:600px;border-radius:44px;background:#0A0A0A;padding:12px;margin:0 auto"><div style="height:100%;border-radius:34px;background:linear-gradient(160deg,#2A2F3A,#12151B);padding:var(--s7) var(--s5);display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s5) var(--s3);align-content:start">{grid}</div></div>'''
    tab = f'''<div style="background:#DEE1E6;border-radius:var(--s2) var(--s2) 0 0;padding:var(--s2) var(--s2) 0;color:#1F1F1F"><div style="display:flex;gap:var(--s1)"><div style="background:#fff;border-radius:var(--s2) var(--s2) 0 0;padding:var(--s2) var(--s3);display:flex;gap:var(--s2);align-items:center;font:400 13px/16px Arial,sans-serif;min-width:0;max-width:240px"><img src="../../icons/{i}-brand-16.svg" width="16" height="16" alt=""><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Noether 1918 · bkt</span></div><div style="padding:var(--s2) var(--s3);font:400 13px/16px Arial,sans-serif;color:#3C4043;white-space:nowrap;overflow:hidden">Inbox</div></div></div><div style="background:#fff;padding:var(--s2) var(--s3);font:400 13px/16px Arial,sans-serif;color:#3C4043;border-bottom:1px solid #DADCE0">bucket.foundation/canon/noether-1918</div>'''
    term = f'''<pre class="term" style="margin:0"><span class="p">$</span> bkt cite noether-1918
<span class="d">Emmy Noether, Invariante Variationsprobleme</span>
<span class="d">Nachr. Ges. Wiss. Göttingen, 1918</span>
paid author share over x402 on Base · receipt 0x9e1c…07ab
<span class="p">$</span> </pre>'''
    merch = f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s4)"><div style="background:#E9E4D8;border-radius:var(--r);padding:var(--s6) var(--s4);display:flex;flex-direction:column;align-items:center;gap:var(--s3);color:#1A1A1A"><div style="width:140px;height:160px;background:#F4EFE3;border:2px solid #CFC7B5;border-radius:0 0 var(--s2) var(--s2);display:flex;align-items:center;justify-content:center;position:relative"><span style="position:absolute;top:-28px;width:72px;height:40px;border:6px solid #CFC7B5;border-bottom:0;border-radius:36px 36px 0 0"></span><img src="../../icons/{i}-brand.svg" width="80" height="80" alt="bkt mark on a tote bag" style="background:{c['bg']};padding:8px;border-radius:2px"></div><span class="sm">Tote bag</span></div><div style="background:{c["surf"]};border:var(--bw) solid var(--line);border-radius:var(--r);padding:var(--s5);display:flex;flex-direction:column;justify-content:space-between;gap:var(--s4)"><img src="../../icons/{i}-brand.svg" width="64" height="64" alt=""><div><p class="h3">Reading room</p><p class="sm muted">Bucket Foundation · Floor 2 →</p></div><span class="sm muted">Wayfinding sign</span></div></div>'''
    return head(i, f"bkt {d['name']} logo in context") + f'''<body>{topbar(i)}<main class="wrap" style="padding-top:var(--s7);padding-bottom:var(--s8)"><p class="lab">Mark in use</p><h1 class="h2" style="margin:var(--s2) 0 var(--s6)">The Bucket mark in context</h1><div class="grid g2" style="align-items:start;gap:var(--s6)"><section class="stack"><p class="lab">Phone home screen</p>{phone}</section><div class="stack" style="--s4:var(--s6)"><section class="stack"><p class="lab">Browser tab · 16px favicon</p><div>{tab}</div></section><section class="stack"><p class="lab">CLI prompt</p>{term}</section><section class="stack"><p class="lab">Merch and signage</p>{merch}</section></div></div></main></body></html>'''

def mark_svgs(i):
    c = D[i]["c"]; disp = D[i]["disp"]
    if i == "d4":
        bkt = f'<svg viewBox="0 0 200 100" role="img" aria-label="BKT wordmark"><rect width="200" height="100" fill="{c["bg"]}"/><path d="M110 100 200 40V100Z" fill="{c["acc"]}"/><text x="16" y="80" font-family="Oswald" font-weight="700" font-size="76" fill="{c["text"]}" transform="rotate(-4 16 80)">BKT</text></svg>'
        word = f'<svg viewBox="0 0 320 100" role="img" aria-label="Bucket wordmark"><rect width="320" height="100" fill="{c["bg"]}"/><rect x="0" y="70" width="320" height="10" fill="{c["acc"]}" transform="rotate(-6 0 70)"/><text x="12" y="66" font-family="Oswald" font-weight="700" font-size="64" letter-spacing="2" fill="{c["text"]}">BUCKET</text></svg>'
        sym = f'<svg viewBox="0 0 100 100" role="img" aria-label="Wedge and circle symbol"><rect width="100" height="100" fill="{c["bg"]}"/><path d="M8 92 92 30V92Z" fill="{c["acc"]}"/><circle cx="40" cy="44" r="24" fill="{c["text"]}"/></svg>'
        n = ("BKT tilted 4 degrees", "Three letters on the 30 degree axis, cut by the red wedge from Lissitzky's 1919 poster.", "BUCKET in Oswald caps", "Rodchenko's Lengiz poster stacks the name and shouts it. A red bar underlines on the diagonal.", "Wedge and circle", "Beat the Whites with the Red Wedge reduced to two shapes: the wedge cuts, the circle holds.")
    elif i == "d5":
        star = " ".join(f"{50 + (34 if k % 2 == 0 else 22) * __import__('math').cos(__import__('math').pi * k / 8 - __import__('math').pi / 2):.1f},{50 + (34 if k % 2 == 0 else 22) * __import__('math').sin(__import__('math').pi * k / 8 - __import__('math').pi / 2):.1f}" for k in range(16))
        bkt = f'<svg viewBox="0 0 200 100" role="img" aria-label="bkt wordmark"><rect width="200" height="100" rx="12" fill="{c["surf"]}"/><text x="20" y="74" font-family="Reem Kufi" font-weight="700" font-size="72" fill="{c["text"]}">bkt</text><polygon points="{star}" transform="translate(146 30) scale(.3)" fill="{c["acc"]}"/></svg>'
        word = f'<svg viewBox="0 0 320 100" role="img" aria-label="Bucket wordmark"><rect width="320" height="100" rx="12" fill="{c["surf"]}"/><text x="20" y="70" font-family="Reem Kufi" font-weight="700" font-size="60" fill="{c["text"]}">Bucket</text><rect x="20" y="82" width="200" height="4" rx="2" fill="{c["hl"]}"/></svg>'
        sym = f'<svg viewBox="0 0 100 100" role="img" aria-label="Eight-point star symbol"><rect width="100" height="100" rx="18" fill="{c["surf"]}"/><rect x="22" y="22" width="56" height="56" fill="none" stroke="{c["acc"]}" stroke-width="4"/><rect x="22" y="22" width="56" height="56" fill="none" stroke="{c["acc"]}" stroke-width="4" transform="rotate(45 50 50)"/><polygon points="{star}" transform="translate(50 50) scale(.5) translate(-50 -50)" fill="{c["hl"]}"/></svg>'
        n = ("bkt with a star", "Reem Kufi follows square Kufic, the script set in Alhambra tile. The star marks the counter.", "Bucket over a gold rule", "One word, one rule, the way a girih band carries an inscription.", "Khatam star", "Two squares rotated 45 degrees make the eight-point khatam, built with compass and straightedge.")
    elif i == "d7":
        import re as _re
        mho = open(ROOT.replace("/pages", "") + "/logos/d7-mho.svg").read()
        mho = _re.sub(r'<svg[^>]*>', '<svg viewBox="0 0 100 100" x="16" y="10" width="80" height="80">', mho, count=1)
        key = "M14 86V14H86V86H28V28H72V72H42"
        mono = f'<svg viewBox="0 0 100 100" role="img" aria-label="Greek-key monogram, a meander spiral closing on the letter b"><rect width="100" height="100" rx="2" fill="{c["surf"]}"/><path d="{key}" fill="none" stroke="{c["acc"]}" stroke-width="6" stroke-linejoin="miter"/><text x="50" y="62" text-anchor="middle" font-family="GFS Didot" font-size="22" fill="{c["text"]}">b</text></svg>'
        cells = "".join(f'<rect x="{20 + k * 56}" y="18" width="56" height="64" fill="none" stroke="{c["acc"]}" stroke-opacity=".4"/><text x="{48 + k * 56}" y="68" text-anchor="middle" font-family="GFS Didot" font-size="48" fill="{c["text"]}">{ch}</text>' for k, ch in enumerate("bkt"))
        bkt = f'<svg viewBox="0 0 208 100" role="img" aria-label="bkt set stoichedon in GFS Didot"><rect width="208" height="100" rx="2" fill="{c["surf"]}"/>{cells}</svg>'
        word = f'<svg viewBox="0 0 320 100" role="img" aria-label="Mho lockup with bkt"><rect width="320" height="100" rx="2" fill="{c["surf"]}"/>{mho}<text x="116" y="66" font-family="GFS Didot" font-size="44" fill="{c["text"]}">bkt</text><text x="200" y="66" font-family="GFS Neohellenic,GFS Didot" font-size="26" fill="{c["muted"]}">Στοιχεῖα</text></svg>'
        tri = f'<svg viewBox="0 0 100 100" role="img" aria-label="Byrne triangle symbol: black base, yellow and red sides"><rect width="100" height="100" rx="2" fill="{c["surf"]}"/><path d="M50 18L84 78H16Z" fill="#E3A21A" fill-opacity=".2"/><path d="M16 78H84" stroke="#1A1714" stroke-width="6"/><path d="M16 78L50 18" stroke="#E3A21A" stroke-width="6"/><path d="M84 78L50 18" stroke="#D9472B" stroke-width="6"/></svg>'
        n = ("Greek-key monogram", "A meander spiral, the border on Attic vases, closes on a lowercase b.", "bkt, stoichedon", "Three letters in equal cells, the way Athenian decrees such as IG I³ 48 were cut.", "℧ lockup", "The mho mark beside the name and Στοιχεῖα, set in GFS Didot and GFS Neohellenic.", "Byrne triangle", "Elements I.1 as Oliver Byrne colored it in 1847: black base, yellow and red sides.")
        return [("Monogram", mono, n[0], n[1]), ("bkt", bkt, n[2], n[3]), ("Lockup", word, n[4], n[5]), ("Symbol", tri, n[6], n[7])]
    else:
        bkt = f'<svg viewBox="0 0 200 100" role="img" aria-label="bkt wordmark"><rect width="200" height="100" rx="8" fill="{c["surf"]}"/><g transform="translate(24 20) scale(1)"><rect x="0" y="0" width="10" height="60" fill="#111"/><circle cx="26" cy="44" r="16" fill="#111"/><circle cx="26" cy="44" r="6" fill="{c["surf"]}"/><rect x="52" y="0" width="10" height="60" fill="#111"/><path d="M62 38 84 16H96L68 44Z" fill="#E1251B"/><path d="M70 36 96 60H82L62 42Z" fill="#111"/><rect x="104" y="6" width="10" height="54" fill="#111"/><rect x="94" y="20" width="30" height="10" fill="#111"/><circle cx="140" cy="54" r="6" fill="{c["acc"]}"/></g></svg>'
        word = f'<svg viewBox="0 0 320 100" role="img" aria-label="bucket wordmark"><rect width="320" height="100" rx="8" fill="{c["surf"]}"/><text x="20" y="68" font-family="Jost" font-weight="700" font-size="60" fill="#111">bucket</text><circle cx="276" cy="56" r="12" fill="{c["acc"]}" stroke="#111" stroke-width="2"/></svg>'
        sym = f'<svg viewBox="0 0 100 100" role="img" aria-label="Circle square triangle symbol"><rect width="100" height="100" rx="14" fill="{c["surf"]}"/><path d="M28 18 46 50H10Z" fill="#F2C400"/><rect x="54" y="18" width="32" height="32" fill="#E1251B"/><circle cx="50" cy="72" r="16" fill="#1D4ED8"/></svg>'
        n = ("bkt from primitives", "Bayer's 1925 universal alphabet: lowercase only, built from bars and circles. A triangle forms the k.", "bucket in Jost", "Jost follows Futura, the Bauhaus-era geometric sans. The orange knob is the play key.", "Kandinsky's three", "The 1923 questionnaire: yellow triangle, red square, blue circle. No letter, all instrument.")
    return [("bkt", bkt, n[0], n[1]), ("Bucket", word, n[2], n[3]), ("Symbol", sym, n[4], n[5])]

def pg_names(i):
    d = D[i]
    items = "".join(f'''<article class="card stack"><p class="lab">{k}</p><h2 class="h3">{t}</h2><div style="max-width:420px">{s.replace("<svg ", '<svg width="100%" ', 1)}</div><div class="row" style="align-items:center"><div style="height:32px;display:flex">{s.replace("<svg ", '<svg height="32" ', 1)}</div><span class="sm muted">at 32px</span></div><p class="sm muted">{p}</p></article>''' for k, s, t, p in mark_svgs(i))
    return head(i, f"bkt {d['name']} names") + f'''<body>{topbar(i)}<main class="wrap" style="padding-top:var(--s7);padding-bottom:var(--s8)"><p class="lab">{d["movement"]} · {d["system"]}</p><h1 class="h2" style="margin:var(--s2) 0 var(--s3)">Identity roles</h1><p class="muted" style="max-width:60ch;margin-bottom:var(--s6)">℧ identifies Bucket. Wordmarks name the product, and secondary symbols support campaign artwork.</p><section class="card stack" style="margin-bottom:var(--s6)"><h2 class="h3">Primary mark · ℧</h2><div class="row"><img src="../../icons/{i}-brand.svg" alt="Bucket primary mark" width="96" height="96"><img src="../../icons/{i}-brand.svg" alt="" width="32" height="32"><img src="../../icons/{i}-brand-16.svg" alt="" width="16" height="16"></div></section><div class="grid g3" style="align-items:start">{items}</div><section class="card stack" style="margin-top:var(--s6)"><h2 class="h3">Secondary monogram</h2><p class="muted">The earlier b glyph remains an illustration study.</p><img src="../../icons/{i}-glyph.svg" alt="Secondary b monogram" width="64" height="64"></section></main>{footer(i)}</body></html>'''

KATEX = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:\'$$\',right:\'$$\',display:true},{left:\'\\\\(\',right:\'\\\\)\',display:false}]})"></script>'

def pg_math(i):
    d = D[i]
    ex = ".eqb{background:var(--surf);border:var(--bw) solid var(--line);border-left:4px solid var(--acc);border-radius:var(--r);padding:var(--s4) var(--s5);overflow-x:auto}.call{border:1px solid var(--acc);border-radius:var(--r);padding:var(--s4) var(--s5)}.pf{counter-reset:p;list-style:none;padding:0;margin:0}.pf li{counter-increment:p;display:flex;gap:var(--s3);padding:var(--s3) 0;border-bottom:1px solid var(--line)}.pf li::before{content:counter(p);font:600 var(--t1)/var(--l3) var(--mono);color:var(--muted);min-width:24px}.lean{background:#0D0D0D;color:#E6E6E6;font:400 var(--t2)/var(--l3) 'Space Mono',ui-monospace,monospace;padding:var(--s5);border-radius:var(--r);overflow-x:auto;margin:0}.lean .k{color:#FFB86B}.lean .c{color:#B3B3B3}.katex{font-size:1.1em}.art{max-width:760px}"
    pts = " ".join(f"{20 + k * 4},{140 - (0 if k in (0, 100) else -120 * ((k/100) * __import__('math').log2(k/100) + (1-k/100) * __import__('math').log2(1-k/100)))*1:.1f}" for k in range(0, 101, 2))
    fig = f'''<svg viewBox="0 0 440 180" width="100%" role="img" aria-label="Binary entropy H(p) peaks at 1 bit when p equals one half"><g stroke="var(--muted)" stroke-width="1"><line x1="20" y1="140" x2="420" y2="140"/><line x1="20" y1="10" x2="20" y2="140"/><line x1="220" y1="20" x2="220" y2="140" stroke-dasharray="4 4"/></g><polyline points="{pts}" fill="none" stroke="var(--acc)" stroke-width="3"/><circle cx="220" cy="20" r="5" fill="var(--text)"/><g fill="var(--muted)" font-size="12" font-family="sans-serif"><text x="14" y="158">0</text><text x="212" y="158">½</text><text x="410" y="158">1</text><text x="228" y="72" fill="var(--text)">1 bit</text><text x="380" y="132">p</text><text x="26" y="20">H(p)</text></g></svg>'''
    body = f'''<article class="art stack" style="--s4:var(--s5)"><p class="lab">Information · 1948 · shannon-1948</p><h1 class="h2">Entropy of a source</h1><p class="muted">Claude Shannon, <i>A Mathematical Theory of Communication</i>, Bell System Technical Journal 27.</p>
<div class="eqb">$$H(p) = -\\sum_{{i=1}}^{{n}} p_i \\log_2 p_i$$</div>
<h2 class="h3">Derivation</h2><ol class="pf"><li><span>Ask for a measure \\(H\\) that is continuous in each \\(p_i\\).</span></li><li><span>For equal outcomes \\(p_i = 1/n\\), \\(H\\) grows with \\(n\\): \\(H = \\log_2 n\\).</span></li><li><span>Splitting a choice into stages adds: \\(H(p_1,p_2,p_3) = H(p_1,1-p_1) + (1-p_1)\\,H\\!\\left(\\tfrac{{p_2}}{{1-p_1}},\\tfrac{{p_3}}{{1-p_1}}\\right)\\).</span></li><li><span>The three conditions force \\(H = -K\\sum_i p_i\\log p_i\\). Base 2 and \\(K=1\\) give bits.</span></li></ol>
<figure style="margin:0" class="card"><figcaption class="lab" style="margin-bottom:var(--s3)">Figure 1 · binary entropy</figcaption>{fig}</figure>
<div class="call"><p class="lab">Maxwell 1865 · Ampère-Maxwell law</p>$$\\nabla \\times \\mathbf{{B}} = \\mu_0 \\mathbf{{J}} + \\mu_0 \\varepsilon_0 \\frac{{\\partial \\mathbf{{E}}}}{{\\partial t}}$$</div>
<div class="call"><p class="lab">Noether 1918 · theorem</p><p>If the action \\(S = \\int L(q,\\dot q,t)\\,dt\\) is invariant under \\(q \\mapsto q + \\epsilon\\,\\delta q\\), then</p>$$Q = \\frac{{\\partial L}}{{\\partial \\dot q}}\\,\\delta q, \\qquad \\frac{{dQ}}{{dt}} = 0.$$</div>
<h2 class="h3">Lean 4 proof</h2><pre class="lean"><span class="k">import</span> Mathlib.Analysis.SpecialFunctions.Log.Basic

<span class="k">theorem</span> negMulLog_nonneg' {{x : ℝ}} (h0 : 0 ≤ x) (h1 : x ≤ 1) :
    0 ≤ -(x * Real.log x) := <span class="k">by</span>
  <span class="k">have</span> hlog : Real.log x ≤ 0 := Real.log_nonpos h0 h1
  nlinarith [mul_nonpos_of_nonneg_of_nonpos h0 hlog]</pre><p class="sm muted">Each term \\(-p_i \\log p_i\\) is nonnegative on \\([0,1]\\), so \\(H(p) \\ge 0\\).</p><div class="row"><a class="btn" href="#">Cite shannon-1948</a><a class="btn ghost" href="app-canon-search.html">Back to canon</a></div></article>'''
    return head(i, "bkt canon math", ex).replace("</head>", KATEX + "</head>") + shell(i, "search", "Shannon 1948", "Canon entry", body)

def pg_video(i):
    ex = ".tl{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:var(--s2)}.tl button{padding:0;border:2px solid transparent;border-radius:var(--r);background:var(--surf);color:var(--text);cursor:pointer;text-align:left}.tl button[aria-current=true]{border-color:var(--acc)}.tl img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--r) var(--r) 0 0}.tl span{display:block;padding:var(--s1) var(--s2);font-size:var(--t1);line-height:var(--l1)}.pv{width:100%;aspect-ratio:16/9;background:#000;border-radius:var(--r);object-fit:cover}.pv.v{aspect-ratio:9/16;max-height:520px;width:auto;margin:0 auto;display:block}@media (max-width:720px){.tl{grid-template-columns:repeat(3,minmax(0,1fr))}}"
    scenes = ["Title: Shannon 1948", "A source emits symbols", "Equal odds: log₂ n", "Split the choice", "H(p) = −Σ p log p", "Cite and pay the author"]
    tl = "".join(f'<button aria-current="{"true" if n == 2 else "false"}"><img src="../../video/{i}-frame-{n}.jpg" alt="" width="320" height="180"><span>{n} · {s}</span></button>' for n, s in enumerate(scenes, 1))
    srcs = "".join(f'<button class="opt" role="radio" aria-checked="{"true" if e[0] == "shannon-1948" else "false"}"><span>{e[1]} {e[2]}</span><span class="lab" style="margin-left:auto">{e[6]}</span></button>' for e in CANON)
    body = f'''<div class="grid g3" style="align-items:start"><section class="stack"><p class="lab">1 · Source entry</p><div class="stack" role="radiogroup" aria-label="Source entry" style="--s4:var(--s2)">{srcs}</div><p class="lab" style="margin-top:var(--s5)">2 · Script</p><textarea class="inp" rows="7" aria-label="Script">In 1948 Claude Shannon asked how to measure information. With n equal outcomes the answer is log₂ n bits. Split a choice into stages and the measures add. Only one formula passes all three tests: H equals minus the sum of p log p.</textarea><p class="xs muted">48 words · about 22 seconds</p></section>
<section class="stack" style="grid-column:span 2"><div class="row" style="justify-content:space-between"><p class="lab">3 · Preview</p><div class="row" role="radiogroup" aria-label="Aspect ratio"><button class="chip" aria-pressed="true">16:9</button><button class="chip" aria-pressed="false">9:16</button></div></div><video class="pv" src="../../video/{i}-16x9.mp4" poster="../../video/{i}-frame-1.jpg" controls muted playsinline aria-label="Video preview"></video><p class="lab">Scene timeline · 6 frames</p><div class="tl">{tl}</div>
<div class="row" style="justify-content:flex-end;margin-top:var(--s4)"><button class="btn ghost">Save draft</button><button class="btn" disabled>Rendering 64%</button><button class="btn">Render video</button></div><div class="bar" role="progressbar" aria-label="Render" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"><i style="width:64%"></i></div><p class="xs muted">States: ready, rendering with progress, done with download.</p></section></div>'''
    return head(i, "bkt video tool", ex) + shell(i, "listen", "Make a video", "Video tool", body)

PAGES += ["math", "app-video-tool"]

FN = {"math": pg_math, "app-video-tool": pg_video, "landing": pg_landing, "polingual-landing": pg_polingual_landing, "polingual-flow": pg_polingual_flow, "app-learn": pg_app_learn, "app-language-picker": pg_app_language_picker, "app-study-card": pg_app_study_card, "app-review": pg_app_review, "app-quiz": pg_app_quiz, "app-placement": pg_app_placement, "app-progress": pg_app_progress, "app-canon-search": pg_app_canon_search, "app-settings": pg_app_settings, "signin": pg_signin, "signup": pg_signup, "signin-code": pg_signin_code, "email-signin": pg_email, "onboarding": pg_onboarding, "download": pg_download, "logo-in-context": pg_logo, "names": pg_names}

for i in ("d4", "d5", "d6", "d7"):
    print(i, check(i))
    os.makedirs(f"{ROOT}/{i}/thumbs", exist_ok=True)
    for p in PAGES:
        html = FN[p](i)
        assert "—" not in html and "–" not in html, (i, p)
        html = __import__("made56").post(i, p, html)
        open(f"{ROOT}/{i}/{p}.html", "w").write(__import__("made_d34").inject(i, html, "../.."))
