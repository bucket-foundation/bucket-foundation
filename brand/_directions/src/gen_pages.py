import sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
import os
from paths import DIRECTIONS_DIR
OUT = DIRECTIONS_DIR + "/pages"

SK = {
 "d1": dict(name="Grid", fonts="family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Mono&family=IBM+Plex+Sans+Hebrew:wght@400;600&family=IBM+Plex+Sans+Devanagari:wght@400&family=Noto+Sans+SC:wght@400",
   disp="'IBM Plex Sans'", dw=300, body="'IBM Plex Sans','IBM Plex Sans Hebrew','IBM Plex Sans Devanagari','Noto Sans SC',sans-serif", mono="'IBM Plex Mono',monospace",
   bg="#FFFFFF", surf="#F4F4F4", text="#161616", muted="#525252", acc="#0F62FE", onacc="#FFFFFF", hl="#DA1E28", acct="#0F62FE", line="#E0E0E0", onhl="#FFFFFF",
   r="0px", rb="0px", ease="cubic-bezier(0.2,0,0.38,0.9)", hero="Every foundation, indexed.", cta="Open the canon", poh="One root. Six scripts. Indexed.",
   bar="#161616", ontext="#F4F4F4", barmuted="#C6C6C6"),
 "d2": dict(name="Kamon", fonts="family=Shippori+Mincho:wght@500;800&family=Zen+Kaku+Gothic+New:wght@400;700&family=Frank+Ruhl+Libre:wght@500;700&family=Noto+Serif:wght@400;700&family=Noto+Serif+Devanagari:wght@400&family=Noto+Serif+SC:wght@400",
   disp="'Shippori Mincho','Frank Ruhl Libre','Noto Serif',serif", dw=800, body="'Zen Kaku Gothic New','Frank Ruhl Libre','Noto Serif','Noto Serif Devanagari','Noto Serif SC',sans-serif", mono="ui-monospace,'SF Mono',Menlo,monospace",
   bg="#F4EFE4", surf="#FBF8F1", text="#1C1C1C", muted="#5A5148", acc="#1F3A5F", onacc="#F4EFE4", hl="#B8341B", acct="#1F3A5F", line="#D9CFBE", onhl="#FFFFFF",
   r="20px", rb="999px", ease="cubic-bezier(0.65,0,0.35,1)", hero="build the past.", cta="Begin a study", poh="One root, six crests.",
   bar="#FBF8F1", ontext="#1C1C1C", barmuted="#5A5148"),
 "d3": dict(name="Squiggle", fonts="family=Fredoka:wght@500;700&family=Nunito:wght@400;800&family=Rubik:wght@500;700&family=Noto+Sans:wght@400;800&family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans+SC:wght@400;700",
   disp="'Fredoka','Rubik','Noto Sans',sans-serif", dw=700, body="'Nunito','Rubik','Noto Sans','Noto Sans Devanagari','Noto Sans SC',sans-serif", mono="ui-monospace,Menlo,monospace",
   bg="#FFF8E7", surf="#FFFFFF", text="#2B2B2B", muted="#5E5A52", acc="#58CC02", onacc="#173600", hl="#FF4B91", acct="#2E7D00", line="#E5E0D2", onhl="#1A1A1A",
   r="16px", rb="16px", ease="cubic-bezier(0.34,1.56,0.64,1)", hero="Learn the words that built the world.", cta="Start a streak", poh="Six words for hundred. One streak.",
   bar="#FFFFFF", ontext="#2B2B2B", barmuted="#5E5A52"),
}

def lum(h):
    h = h.lstrip("#"); v = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    v = [c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4 for c in v]
    return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]
def cr(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x+0.05)/(y+0.05)

BASE = """*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:400 16px/24px var(--body);-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
h1,h2,h3,h4,p,ol,ul,figure{margin:0}ol,ul{list-style:none;padding:0}a{color:var(--acct)}img,svg,video{display:block;max-width:100%}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.disp{font-family:var(--disp);font-weight:var(--dw);letter-spacing:var(--ls)}
h1.disp{font-size:56px;line-height:64px}h2.disp{font-size:32px;line-height:40px}h3{font:600 20px/28px var(--body)}
.muted{color:var(--muted)}.kick{font:600 12px/16px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.small{font-size:14px;line-height:20px}
.stack{display:flex;flex-direction:column;gap:var(--s4)}.row{display:flex;flex-wrap:wrap;gap:var(--s3);align-items:center}.grow{flex:1;min-width:0}
.grid{display:grid;gap:var(--s4);grid-template-columns:repeat(var(--cols,3),minmax(0,1fr))}
.card{background:var(--surf);border:var(--bw) solid var(--line);border-radius:var(--r);padding:var(--s5);box-shadow:var(--lip-card);min-width:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);background:var(--acc);color:var(--onacc);border:0;border-radius:var(--rb);font:var(--bfw) 16px/24px var(--body);padding:var(--s3) var(--s5);min-height:48px;cursor:pointer;text-decoration:none;white-space:nowrap;box-shadow:var(--lip-btn);text-transform:var(--btt);letter-spacing:var(--bls);transition:background-color 120ms var(--ease),transform 80ms var(--ease),box-shadow 120ms}
.btn:hover{background:color-mix(in srgb,var(--acc) 86%,#000)}.btn:active{transform:translateY(var(--press))}.btn:focus-visible,.chip:focus-visible,.opt:focus-visible,a:focus-visible,.nav a:focus-visible{outline:3px solid var(--text);outline-offset:3px}
.btn:disabled,.btn.is-disabled{background:var(--surf);color:var(--muted);box-shadow:inset 0 0 0 1px var(--muted);cursor:not-allowed;transform:none}
.btn.ghost{background:transparent;color:var(--text);box-shadow:inset 0 0 0 2px var(--text)}.btn.ghost:hover{background:color-mix(in srgb,var(--text) 8%,transparent)}
.btn.hl{background:var(--hl);color:var(--onhl);box-shadow:var(--lip-hl)}.btn.sm{min-height:40px;padding:var(--s2) var(--s4);font-size:14px;line-height:20px}.btn.block{width:100%}
.inp{font:400 16px/24px var(--body);color:var(--text);background:var(--surf);border:1px solid var(--muted);border-radius:var(--ri);padding:var(--s3) var(--s4);min-height:48px;width:100%}
.inp:focus-visible,.inp.is-focus{outline:3px solid var(--acc);outline-offset:2px}.inp::placeholder{color:var(--muted);opacity:1}
label.f{display:flex;flex-direction:column;gap:var(--s2);font-weight:600;font-size:14px;line-height:20px}
.chip{display:inline-flex;align-items:center;gap:var(--s2);border:0;background:var(--surf);color:var(--text);box-shadow:inset 0 0 0 1px var(--muted);border-radius:var(--rb);padding:var(--s2) var(--s3);font:400 14px/20px var(--body);min-height:40px;cursor:pointer}
.chip[aria-pressed=true]{background:var(--acc);color:var(--onacc);box-shadow:none}
.tag{display:inline-block;font:600 12px/16px var(--body);padding:var(--s1) var(--s2);border-radius:var(--rt);background:var(--hl);color:var(--onhl);align-self:flex-start}
.tag.q{background:transparent;color:var(--muted);box-shadow:inset 0 0 0 1px var(--muted)}
.ic{width:24px;height:24px;flex:none}
.prog{height:8px;background:color-mix(in srgb,var(--muted) 22%,transparent);border-radius:var(--rt);overflow:hidden}.prog i{display:block;height:100%;background:var(--acc);border-radius:inherit}
.word{font-family:var(--disp);font-weight:var(--dw);font-size:48px;line-height:56px}
[dir=rtl]{text-align:right}
.pad{padding:var(--s8) var(--s6)}.wrap{max-width:1200px;margin:0 auto;width:100%}
.site{display:flex;align-items:center;gap:var(--s5);padding:var(--s4) var(--s6);border-bottom:1px solid var(--line)}.site nav{display:flex;gap:var(--s5);margin-left:auto;align-items:center}.site nav a{color:var(--text);text-decoration:none}
.brand{display:flex;align-items:center;gap:var(--s2);font:var(--dw) 24px/32px var(--disp);color:var(--text);text-decoration:none}.brand img{width:32px;height:32px;border-radius:var(--rg)}
.foot{border-top:1px solid var(--line);padding:var(--s7) var(--s6) var(--s6);background:var(--surf)}.foot .cols{display:grid;grid-template-columns:2fr repeat(4,minmax(0,1fr));gap:var(--s5)}.foot h4{font:600 14px/20px var(--body);margin-bottom:var(--s3)}.foot li a{color:var(--muted);text-decoration:none;font-size:14px;line-height:32px}.foot li a:hover{color:var(--text);text-decoration:underline}.foot .legal{margin-top:var(--s7);padding-top:var(--s4);border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:var(--s4);justify-content:space-between}
.shell{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh}
.side{background:var(--sidebg);border-right:1px solid var(--line);padding:var(--s4) var(--s3);display:flex;flex-direction:column;gap:var(--s5);position:sticky;top:0;height:100vh}
.nav{display:flex;flex-direction:column;gap:var(--s1)}.nav a{display:flex;align-items:center;gap:var(--s3);padding:var(--s2) var(--s3);min-height:48px;color:var(--text);text-decoration:none;border-radius:var(--rn);font-weight:var(--nfw)}
.nav a:hover{background:color-mix(in srgb,var(--text) 6%,transparent)}.nav a[aria-current]{background:var(--navon);color:var(--navontext);box-shadow:var(--navlip)}
.nav img{width:24px;height:24px}
.bar{display:flex;align-items:center;gap:var(--s4);padding:var(--s4) var(--s6);border-bottom:1px solid var(--line);background:var(--bg);min-height:72px}
.bar h1{font:var(--dw) 28px/36px var(--disp);letter-spacing:var(--ls)}
.content{padding:var(--s6);display:flex;flex-direction:column;gap:var(--s6);max-width:1120px;width:100%}
.stat b{display:block;font:var(--dw) 40px/48px var(--disp)}
.split{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:var(--s5)}
code,pre,.mono{font-family:var(--mono)}pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.term{background:#161616;color:#F4F4F4;border-radius:var(--r);padding:var(--s4) var(--s5);font:400 14px/20px var(--mono)}.term .p{color:#A6C8FF}.term .g{color:#42BE65}.term .d{color:#C6C6C6}
.opt{display:flex;align-items:center;gap:var(--s3);width:100%;text-align:left;background:var(--surf);border:2px solid var(--line);border-radius:var(--r);padding:var(--s4);font:400 18px/28px var(--body);color:var(--text);cursor:pointer;min-height:64px;box-shadow:var(--lip-card)}
.opt:hover{border-color:var(--muted)}.opt[aria-checked=true]{border-color:var(--acc);background:color-mix(in srgb,var(--acc) 10%,var(--surf))}
.opt.ok{border-color:var(--acct)}.opt .k{width:32px;height:32px;flex:none;display:grid;place-items:center;border:1px solid var(--muted);border-radius:var(--rt);font-size:14px;color:var(--muted)}
.ok-bar{background:color-mix(in srgb,var(--acc) 16%,var(--surf));border-radius:var(--r);padding:var(--s4) var(--s5);display:flex;flex-wrap:wrap;gap:var(--s4);align-items:center;border:1px solid var(--acct)}
.sw{position:relative;width:48px;height:28px;flex:none;border-radius:14px;background:var(--muted);border:0;cursor:pointer}.sw::after{content:"";position:absolute;top:4px;left:4px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform 160ms var(--ease)}.sw[aria-checked=true]{background:var(--acc)}.sw[aria-checked=true]::after{transform:translateX(20px)}.sw:focus-visible{outline:3px solid var(--text);outline-offset:3px}
.setrow{display:flex;align-items:center;gap:var(--s4);padding:var(--s4) 0;border-top:1px solid var(--line)}.setrow:first-of-type{border-top:0}
.code6{display:grid;grid-template-columns:repeat(6,minmax(0,56px));gap:var(--s2)}.code6 input{text-align:center;font:var(--dw) 28px/36px var(--disp);padding:var(--s2) 0;min-height:64px}
.steps{counter-reset:s;display:grid;gap:var(--s4);grid-template-columns:repeat(4,minmax(0,1fr))}.steps>li{counter-increment:s}.steps>li .n::before{content:counter(s)}
.n{display:grid;place-items:center;width:32px;height:32px;border-radius:var(--rt);background:var(--acc);color:var(--onacc);font-weight:700}
.phone{width:280px;height:560px;border-radius:44px;background:#161616;padding:12px;flex:none}.phone .scr{height:100%;border-radius:34px;overflow:hidden;position:relative;padding:48px 12px 20px;display:grid;grid-template-columns:repeat(4,56px);justify-content:space-between;gap:20px 0;align-content:start}
.app-i{display:flex;flex-direction:column;align-items:center;gap:4px;font:400 11px/16px var(--body);color:#fff}.app-i i,.app-i img{width:56px;height:56px;border-radius:13px;display:block}
.tl{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:var(--s2)}.tl figure{display:flex;flex-direction:column;gap:var(--s1)}.tl img{aspect-ratio:16/9;object-fit:cover;width:100%;border-radius:var(--rt);border:2px solid transparent;background:var(--line)}.tl .on img{border-color:var(--acc)}
.seg{display:inline-flex;background:var(--surf);border:1px solid var(--line);border-radius:var(--rb);padding:var(--s1)}.seg button{border:0;background:transparent;font:600 14px/20px var(--body);color:var(--text);padding:var(--s2) var(--s4);border-radius:var(--rb);min-height:40px;cursor:pointer}.seg button[aria-pressed=true]{background:var(--acc);color:var(--onacc)}.seg button:focus-visible{outline:3px solid var(--text);outline-offset:2px}
.callout{border-left:4px solid var(--acc);background:var(--surf);padding:var(--s4) var(--s5);border-radius:var(--rt)}.eq{background:var(--surf);border:1px solid var(--line);border-radius:var(--r);padding:var(--s4) var(--s5);overflow-x:auto}
.lean{background:#161616;color:#F4F4F4;border-radius:var(--r);padding:var(--s5);font:400 14px/22px var(--mono);overflow-x:auto}.lean .k{color:#A6C8FF}.lean .c{color:#C6C6C6}.lean .t{color:#FFB3B8}
.proof li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:var(--s3);padding:var(--s3) 0;border-top:1px solid var(--line)}
@media (max-width:720px){
.pad{padding:var(--s7) var(--s4)}h1.disp{font-size:40px;line-height:48px}h2.disp{font-size:28px;line-height:36px}
.site{padding:var(--s3) var(--s4)}.site nav a.hide{display:none}.site nav{gap:var(--s3)}
.grid{grid-template-columns:minmax(0,1fr)!important}.split{grid-template-columns:minmax(0,1fr)}.steps{grid-template-columns:minmax(0,1fr)}
.foot{padding:var(--s6) var(--s4)}.foot .cols{grid-template-columns:1fr 1fr}.foot .cols>div:first-child{grid-column:1/-1}
.shell{display:block;padding-bottom:80px}.side{position:fixed;top:auto;bottom:0;left:0;right:0;height:auto;z-index:5;padding:var(--s1) var(--s2);border-right:0;border-top:1px solid var(--line);background:var(--sidebg)}.side .brand,.side .sidex{display:none}
.nav{flex-direction:row;justify-content:space-around}.nav a{flex-direction:column;gap:0;font-size:11px;line-height:16px;padding:var(--s1);min-width:56px}.nav a.mx{display:none}
.bar{padding:var(--s3) var(--s4);min-height:64px}.bar h1{font-size:22px;line-height:28px}.bar .hide{display:none}.content{padding:var(--s4);gap:var(--s5)}.card{padding:var(--s4)}
.word{font-size:40px;line-height:48px}.tl{grid-template-columns:repeat(3,minmax(0,1fr))}.phone{width:100%;max-width:280px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
"""

SKIN = {
"d1": """:root{--ls:-0.01em;--bw:0px;--lip-card:none;--lip-btn:none;--lip-hl:none;--bfw:600;--btt:none;--bls:0;--press:1px;--ri:0;--rt:0;--rn:0;--rg:0;--nfw:400;--sidebg:#FFFFFF;--navon:#E8E8E8;--navontext:#161616;--navlip:inset 4px 0 0 #0F62FE}
.btn{padding:var(--s3) var(--s8) var(--s3) var(--s4);justify-content:flex-start}.btn.sm{padding:var(--s2) var(--s6) var(--s2) var(--s4)}.btn.block{justify-content:space-between}
.card{border-top:1px solid var(--line)}.inp{border:0;border-bottom:1px solid var(--muted);background:var(--surf)}
.side{border-right:1px solid var(--line)}.bar{background:#161616;color:#F4F4F4;border-bottom:0;min-height:48px;padding:var(--s2) var(--s6)}.bar h1{font-size:20px;line-height:28px;font-weight:400}.bar .muted{color:#C6C6C6}.bar .btn.ghost{color:#F4F4F4;box-shadow:inset 0 0 0 1px #C6C6C6}.bar .btn.ghost:focus-visible{outline-color:#F4F4F4}
.kick{letter-spacing:.32px;text-transform:none;font-weight:400}h1.disp{font-size:64px;line-height:72px}
""",
"d2": """:root{--ls:0.02em;--bw:1px;--lip-card:none;--lip-btn:none;--lip-hl:none;--bfw:700;--btt:none;--bls:0;--press:1px;--ri:12px;--rt:8px;--rn:10px;--rg:7px;--nfw:400;--sidebg:#FBF8F1;--navon:#1F3A5F;--navontext:#F4EFE4;--navlip:none}
.nav a[aria-current] img{filter:brightness(0) invert(.94)}.kick{letter-spacing:.16em}.side{align-items:stretch}.bar h1{font-size:34px;line-height:40px}
.seal{display:inline-grid;place-items:center;background:var(--hl);color:#fff;border-radius:50%;width:48px;height:48px;font:700 14px/1 var(--body)}
.center{text-align:center;align-items:center}
""",
"d3": """:root{--ls:0;--bw:2px;--lip-card:0 4px 0 #E5E0D2;--lip-btn:0 4px 0 #46A302;--lip-hl:0 4px 0 #D63A78;--bfw:800;--btt:uppercase;--bls:.04em;--press:4px;--ri:16px;--rt:8px;--rn:12px;--rg:8px;--nfw:800;--sidebg:#FFFFFF;--navon:#DDF4FF;--navontext:#2B2B2B;--navlip:inset 0 0 0 2px #84D8FF}
.btn:active{box-shadow:none}.btn.ghost{box-shadow:inset 0 0 0 2px #E5E0D2,0 4px 0 #E5E0D2;color:var(--text);background:var(--surf)}.btn.ghost:active{box-shadow:inset 0 0 0 2px #E5E0D2}
.inp{border:2px solid #E5E0D2;background:#F7F7F7}.inp:focus-visible{border-color:#84D8FF;outline:3px solid #2B2B2B}
.side{border-right:2px solid var(--line)}.bar{border-bottom:2px solid var(--line)}.opt{border-width:2px}.opt[aria-checked=true]{border-color:#84D8FF;background:#DDF4FF;box-shadow:0 4px 0 #84D8FF}
.tag{border-radius:8px}.pat{background-image:radial-gradient(#FF4B91 2px,transparent 2.5px),radial-gradient(#1CB0F6 2px,transparent 2.5px);background-size:32px 32px;background-position:0 0,16px 16px}
.prog{height:16px;border-radius:8px}.prog i{box-shadow:inset 0 -4px 0 rgba(0,0,0,.12)}
""",
}

NAV = [("home", "Learn", "app-learn"), ("cards", "Review", "app-review"), ("search", "Canon", "app-canon-search"), ("library", "Progress", "app-progress"), ("profile", "Languages", "app-language-picker"), ("settings", "Settings", "app-settings")]

CANON = [("shannon-1948", "Claude Shannon", "A Mathematical Theory of Communication", "1948", "Information", "H = −Σ pᵢ log pᵢ"),
 ("maxwell-1865", "James Clerk Maxwell", "A Dynamical Theory of the Electromagnetic Field", "1865", "Physics", "∇ · E = ρ / ε₀"),
 ("noether-1918", "Emmy Noether", "Invariante Variationsprobleme", "1918", "Mathematics", "symmetry ⇒ conservation"),
 ("boltzmann-1877", "Ludwig Boltzmann", "Über die Beziehung zwischen dem zweiten Hauptsatze", "1877", "Physics", "S = k log W"),
 ("landauer-1961", "Rolf Landauer", "Irreversibility and Heat Generation in the Computing Process", "1961", "Information", "E ≥ kT ln 2")]
WORDS = [("en", "ltr", "English", "hundred", "/ˈhʌn.drəd/", "Root. Old English hund, from Proto-Germanic *hundą."),
 ("fr", "ltr", "Français", "cent", "/sɑ̃/", "From Latin centum."),
 ("es", "ltr", "Español", "cien", "/θjen/", "From Latin centum, shortened from ciento."),
 ("he", "rtl", "עברית", "מאה", "/me.a/", "Semitic root, a cognate set of its own."),
 ("el", "ltr", "Ελληνικά", "εκατό", "/e.kaˈto/", "From Ancient Greek ἑκατόν, same PIE root."),
 ("ru", "ltr", "Русский", "сто", "/sto/", "From Proto-Slavic *sъto, same PIE root.")]

def head(d, title, extra=""):
    s = SK[d]
    v = f":root{{--bg:{s['bg']};--surf:{s['surf']};--text:{s['text']};--muted:{s['muted']};--acc:{s['acc']};--onacc:{s['onacc']};--hl:{s['hl']};--onhl:{s['onhl']};--acct:{s['acct']};--line:{s['line']};--r:{s['r']};--rb:{s['rb']};--disp:{s['disp']};--dw:{s['dw']};--body:{s['body']};--mono:{s['mono']};--ease:{s['ease']};--s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;--s7:48px;--s8:64px;--s9:96px}}"
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bkt {s["name"]} {title}</title><link rel="icon" href="../../icons/{d}-glyph.svg"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?{s["fonts"]}&display=swap">{extra}<style>{v}{BASE}{SKIN[d]}</style></head><body>'

def ic(d, n): return f'<img src="../../icons/{d}-{n}.svg" alt="" width="24" height="24">'
def brand(d, label="bkt", href="landing.html"): return f'<a class="brand" href="{href}"><img src="../../icons/{d}-glyph.svg" alt="" width="32" height="32">{label}</a>'

def site(d, poly=False):
    if poly:
        return f'<header class="site">{brand(d,"Polingual","polingual-landing.html")}<nav aria-label="Main"><a class="hide" href="#how">How it works</a><a class="hide" href="#langs">Languages</a><a href="signin.html">Sign in</a><a class="btn sm" href="polingual-flow.html">Try a word</a></nav></header>'
    return f'<header class="site">{brand(d)}<nav aria-label="Main"><a class="hide" href="app-canon-search.html">Canon</a><a class="hide" href="polingual-landing.html">Polingual</a><a class="hide" href="download.html">Download</a><a class="hide" href="signin.html">Sign in</a><a class="btn sm" href="signup.html">Join free</a></nav></header>'

def foot(d):
    cols = [("Product", ["Canon", "Polingual", "Research OS", "Download"]), ("Canon", ["Mathematics", "Physics", "Information", "Biophysics"]),
            ("Developers", ["feed402 spec", "llms.txt", "bkt CLI", "GitHub"]), ("Foundation", ["Manifesto", "Governance", "Protocol", "Contact"])]
    c = "".join(f'<div><h4>{h}</h4><ul>{"".join(f"<li><a href=#>{x}</a></li>" for x in l)}</ul></div>' for h, l in cols)
    return f'<footer class="foot"><div class="wrap"><div class="cols"><div class="stack">{brand(d)}<p class="muted small" style="max-width:36ch">Free to read, paid to cite. Each citation pays its author once over x402 on Base.</p></div>{c}</div><div class="legal small muted"><span>Bucket Foundation. MIT code, CC0 protocol.</span><span class="row" style="gap:var(--s4)"><a href="#" style="color:var(--muted)">Privacy</a><a href="#" style="color:var(--muted)">Terms</a><a href="#" style="color:var(--muted)">Status</a></span></div></div></footer>'

def shell(d, cur, title, body, actions=""):
    n = "".join(f'<a href="{p}.html"{" aria-current=page" if p==cur else ""}{" class=mx" if p=="app-language-picker" else ""}>{ic(d,i)}<span>{l}</span></a>' for i, l, p in NAV)
    return f'<div class="shell"><aside class="side">{brand(d)}<nav class="nav" aria-label="App">{n}</nav><div class="sidex card small" style="margin-top:auto"><b>23-day streak</b><p class="muted">Next review in 2 hours.</p></div></aside><div><header class="bar"><h1>{title}</h1><span class="grow"></span>{actions}</header><main class="content">{body}</main></div></div>'

def wcard(w, cls=""):
    l, dr, lang, word, ipa, note = w
    return f'<article class="card stack {cls}" lang="{l}" dir="{dr}" style="gap:var(--s2)"><span class="tag{" q" if l!="en" else ""}">{lang}</span><span class="word">{word}</span><span class="muted mono small" dir="ltr">{ipa}</span><p class="muted small">{note}</p></article>'

def centry(e, d, btn=True):
    slug, who, t, y, br, f = e
    b = f'<a class="btn sm" href="#">{ic(d,"cite") if d!="d2" else ""}Cite $0.01</a>' if btn else ""
    return f'<article class="card stack" style="gap:var(--s2)"><span class="kick">{br} · {y}</span><h3>{t}</h3><p class="muted small">{who}</p><p class="mono small">{f}</p><div class="row" style="margin-top:auto;padding-top:var(--s2)"><code class="small muted grow">{slug}</code>{b}</div></article>'

def end(): return "</body></html>"

def p_landing(d):
    s = SK[d]
    canon = "".join(centry(e, d) for e in CANON[:3])
    steps = "".join(f'<li class="card stack"><span class="n"></span><h3>{h}</h3><p class="muted">{t}</p></li>' for h, t in [("Read free", "Every entry is open: the primary text, the derivation, the context."), ("Cite it", "Press cite in the app, the CLI or an agent request."), ("Author is paid", "One payment settles over x402 on Base, about a cent."), ("Keep the receipt", "The receipt is a citeable envelope that never expires.")])
    words = "".join(wcard(w) for w in WORDS[:4])
    return head(d, "landing") + site(d) + f'''<main><section class="pad wrap split" style="align-items:center"><div class="stack" style="gap:var(--s5)"><span class="kick">Bucket Foundation · nonprofit</span><h1 class="disp">{s["hero"]}</h1><p class="muted" style="font-size:20px;line-height:28px;max-width:40ch">Bucket holds the foundations of every field: axioms, laws and primary derivations. Read free. When you cite one, the author is paid.</p><div class="row"><a class="btn" href="app-canon-search.html">{s["cta"]}</a><a class="btn ghost" href="download.html">Download bkt</a></div></div><figure><img src="../../img/{d}-hero.jpg" alt="Concept art for the {s["name"]} direction" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--r)"></figure></section>
<section class="pad wrap stack" style="gap:var(--s5)"><span class="kick">The canon</span><h2 class="disp">Five papers to start.</h2><div class="grid">{canon}</div><a href="app-canon-search.html">See all five, then the rest</a></section>
<section class="pad wrap stack" style="gap:var(--s5)"><span class="kick">How citing works</span><h2 class="disp">Paid once, cited forever.</h2><ol class="steps">{steps}</ol></section>
<section class="pad wrap stack" style="gap:var(--s5)"><span class="kick">Polingual</span><h2 class="disp">{s["poh"]}</h2><div class="grid" style="--cols:4">{words}</div><div class="row"><a class="btn" href="polingual-landing.html">Visit polingual.com</a></div></section></main>''' + foot(d) + end()

def p_poly(d):
    s = SK[d]
    words = "".join(wcard(w, "root" if w[0]=="en" else "") for w in WORDS)
    langs = "".join(f'<li class="chip" style="cursor:default">{x}</li>' for x in ["English", "Français", "Español", "עברית", "Ελληνικά", "Русский", "हिन्दी", "中文"])
    how = "".join(f'<li class="card stack"><span class="n"></span><h3>{h}</h3><p class="muted">{t}</p></li>' for h, t in [("Pick a script", "Latin, Hebrew, Greek, Cyrillic, Devanagari or Han."), ("Study one root", "See hundred beside cent, cien, מאה, εκατό and сто."), ("Reveal the link", "Each card shows the shared Proto-Indo-European root *ḱm̥tóm."), ("Keep the streak", "Five minutes a day. Reviews space themselves.")])
    return head(d, "Polingual") + site(d, True) + f'''<main><section class="pad wrap stack" style="gap:var(--s5)"><span class="kick">polingual.com · by Bucket</span><h1 class="disp" style="max-width:16ch">{s["poh"]}</h1><p class="muted" style="font-size:20px;line-height:28px;max-width:46ch">Polingual teaches the words underneath the languages. Learn one root, then watch it surface in six scripts.</p><div class="row"><a class="btn" href="polingual-flow.html">{s["cta"]}</a><a class="btn ghost" href="signin.html">I have an account</a></div></section>
<section class="pad wrap"><div class="grid">{words}</div></section>
<section id="how" class="pad wrap stack" style="gap:var(--s5)"><h2 class="disp">How it works</h2><ol class="steps">{how}</ol></section>
<section id="langs" class="pad wrap stack" style="gap:var(--s5)"><h2 class="disp">Languages</h2><ul class="row">{langs}</ul></section></main>''' + foot(d) + end()

def p_flow(d):
    picks = "".join(f'<button class="opt" role="radio" aria-checked="{str(x=="Español").lower()}"><span class="k">{k}</span>{x}</button>' for k, x in [("A", "Français"), ("B", "Español"), ("C", "Ελληνικά")])
    return head(d, "Polingual flow") + site(d, True) + f'''<main class="pad wrap stack" style="gap:var(--s6)"><h1 class="disp">Your first word</h1><ol class="grid" style="--cols:4">
<li class="card stack"><span class="kick">1 · Pick</span><h3>Which language?</h3><div class="stack" role="radiogroup" aria-label="Language" style="gap:var(--s2)">{picks}</div></li>
<li class="card stack"><span class="kick">2 · Study</span><span class="word">hundred</span><span class="muted mono small">/ˈhʌn.drəd/</span><p class="muted">Old English hund, Proto-Germanic *hundą.</p><a class="btn block" href="#">Reveal</a></li>
<li class="card stack" lang="es"><span class="kick">3 · Reveal</span><span class="word">cien</span><span class="muted mono small">/θjen/</span><p>Latin centum and English hundred share the root *ḱm̥tóm.</p><div class="row"><button class="btn ghost sm">Again</button><button class="btn sm">Got it</button></div></li>
<li class="card stack"><span class="kick">4 · Result</span><span class="stat"><b>5 of 6</b></span><p class="muted">You matched cent, cien, εκατό, сто and hundred. מאה comes back tomorrow.</p><div class="prog" role="progressbar" aria-valuenow="83" aria-valuemin="0" aria-valuemax="100" aria-label="Score"><i style="width:83%"></i></div><a class="btn block" href="signup.html">Save my streak</a></li></ol></main>''' + foot(d) + end()

def p_learn(d):
    units = "".join(f'<li class="card row"><span class="n">{i}</span><div class="grow"><h3>{t}</h3><p class="muted small">{sub}</p></div><div class="prog" style="width:120px" role="progressbar" aria-label="{t}" aria-valuenow="{p}" aria-valuemin="0" aria-valuemax="100"><i style="width:{p}%"></i></div></li>' for i, (t, sub, p) in enumerate([("Numbers", "hundred, cent, cien, מאה, εκατό, сто", 100), ("Canon words", "entropy, energy, field, symmetry", 60), ("Measure", "heat, work, bit, charge", 20), ("Change", "law, conservation, flow", 0)], 1))
    body = f'''<div class="split"><section class="card stack"><span class="kick">Continue</span><h2 class="disp">Canon words · Lesson 3</h2><p class="muted">entropy · énergie · energía · אנרגיה · ενέργεια · энергия</p><div class="prog" role="progressbar" aria-label="Lesson progress" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100"><i style="width:60%"></i></div><div class="row"><a class="btn" href="app-study-card.html">Continue lesson</a><a class="btn ghost" href="app-quiz.html">Quick quiz</a></div></section>
<section class="card stack"><span class="kick">Daily goal</span><span class="stat"><b>12 / 20 min</b></span><div class="prog"><i style="width:60%"></i></div><p class="muted small">8 minutes keeps your 23-day streak.</p></section></div>
<section class="stack"><h2 class="disp">Path</h2><ol class="stack" style="gap:var(--s3)">{units}</ol></section>
<section class="stack"><h2 class="disp">Canon entry of the day</h2><div class="grid" style="--cols:2">{centry(CANON[2], d)}{centry(CANON[0], d)}</div></section>'''
    return head(d, "learn") + shell(d, "app-learn", "Learn", body, '<a class="btn sm hide" href="app-review.html">14 due</a>') + end()

def p_picker(d):
    sys = [("Latin", "Français · Español", "cent · cien", "ltr", "fr", True), ("Hebrew", "עברית", "מאה", "rtl", "he", True), ("Greek", "Ελληνικά", "εκατό", "ltr", "el", False), ("Cyrillic", "Русский", "сто", "ltr", "ru", True), ("Devanagari", "हिन्दी", "सौ", "ltr", "hi", False), ("Han", "中文 · bǎi", "百", "ltr", "zh", False)]
    cards = "".join(f'<button class="opt" role="checkbox" aria-checked="{str(on).lower()}" style="flex-direction:column;align-items:flex-start;gap:var(--s2);min-height:200px"><span class="kick">{n}</span><span class="word" lang="{l}" dir="{dr}">{w}</span><span class="muted small" lang="{l}">{lang}</span><span class="small" style="margin-top:auto">{"Studying" if on else "Add"}</span></button>' for n, lang, w, dr, l, on in sys)
    body = f'<label class="f">Filter scripts<input class="inp" type="search" placeholder="Search a language or script" style="max-width:480px"></label><p class="muted">Pick the writing systems to study. Each shows the word for hundred.</p><div class="grid">{cards}</div><div class="row"><a class="btn" href="app-placement.html">Continue with 3 scripts</a><span class="muted small">You can change this in Settings.</span></div>'
    return head(d, "language picker") + shell(d, "app-language-picker", "Languages", body) + end()

def p_study(d):
    tr = "".join(f'<li class="setrow" lang="{w[0]}"><span class="kick" style="width:96px">{w[2]}</span><span class="grow" dir="{w[1]}" style="font:var(--dw) 24px/32px var(--disp)">{w[3]}</span><span class="muted mono small">{w[4]}</span><button class="btn ghost sm" aria-label="Play {w[3]}">{ic(d,"listen")}</button></li>' for w in WORDS[1:])
    body = f'''<div class="row"><div class="prog grow" role="progressbar" aria-label="Session" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"><i style="width:40%"></i></div><span class="muted small">4 of 10</span></div>
<div class="split"><article class="card stack" style="gap:var(--s4);padding:var(--s7)"><span class="tag">English · root</span><span class="word" style="font-size:72px;line-height:80px">hundred</span><span class="muted mono">/ˈhʌn.drəd/</span><p>Old English hund, Proto-Germanic *hundą, Proto-Indo-European *ḱm̥tóm. The same root gives Latin centum and Greek ἑκατόν.</p><div class="row" style="margin-top:var(--s4)"><button class="btn ghost">Again</button><button class="btn ghost">Hard</button><button class="btn">Good</button><button class="btn ghost">Easy</button></div></article>
<section class="card"><h3>In six scripts</h3><ul>{tr}</ul></section></div>'''
    return head(d, "study card") + shell(d, "app-review", "Study", body, '<a class="btn ghost sm" href="app-learn.html">End session</a>') + end()

def p_review(d):
    q = "".join(f'<li class="setrow" lang="{w[0]}"><span class="grow" dir="{w[1]}" style="font-weight:700">{w[3]}</span><span class="muted small">{w[2]}</span><span class="tag q">{due}</span></li>' for w, due in zip(WORDS[1:], ["now", "now", "in 2 h", "tomorrow", "in 3 d"]))
    body = f'''<div class="grid" style="--cols:4"><div class="card stat"><span class="muted small">Due now</span><b>14</b></div><div class="card stat"><span class="muted small">Reviewed today</span><b>36</b></div><div class="card stat"><span class="muted small">Accuracy</span><b>91%</b></div><div class="card stat"><span class="muted small">Streak</span><b>23 d</b></div></div>
<div class="split"><article class="card stack center" lang="ru" style="padding:var(--s7)"><span class="kick">Русский</span><span class="word" style="font-size:72px;line-height:80px">сто</span><span class="muted mono">/sto/</span><p lang="en">hundred · Proto-Slavic *sъto</p><div class="row"><button class="btn ghost">Again · 1 m</button><button class="btn ghost">Hard · 6 m</button><button class="btn">Good · 2 d</button><button class="btn ghost">Easy · 5 d</button></div></article><section class="card"><h3>Queue</h3><ul>{q}</ul></section></div>'''
    return head(d, "review") + shell(d, "app-review", "Review", body) + end()

def p_quiz(d):
    o = [("A", "сто", "ru", False), ("B", "εκατό", "el", True), ("C", "cien", "es", False), ("D", "cent", "fr", False)]
    opts = "".join(f'<button class="opt{" ok" if ok else ""}" role="radio" aria-checked="{str(ok).lower()}" lang="{l}"><span class="k">{k}</span><span class="grow">{w}</span>{"<span class=tag>Correct</span>" if ok else ""}</button>' for k, w, l, ok in o)
    body = f'''<div class="row"><div class="prog grow" role="progressbar" aria-label="Quiz" aria-valuenow="70" aria-valuemin="0" aria-valuemax="100"><i style="width:70%"></i></div><span class="muted small">7 of 10</span></div>
<section class="stack" style="max-width:720px;gap:var(--s5)"><span class="kick">Multiple choice</span><h2 class="disp">Which word means hundred in Greek?</h2><div class="stack" role="radiogroup" aria-label="Answers" style="gap:var(--s3)">{opts}</div>
<div class="ok-bar"><div class="grow"><b>Correct.</b> <span lang="el">εκατό</span> comes from Ancient Greek <span lang="grc">ἑκατόν</span>.</div><a class="btn" href="#">Continue</a></div></section>'''
    return head(d, "quiz") + shell(d, "app-review", "Quiz", body, '<span class="muted small hide">+10 XP</span>') + end()

def p_place(d):
    lv = "".join(f'<li class="card stack" style="gap:var(--s1)"><span class="kick">{a}</span><b>{b}</b><span class="muted small">{c}</span></li>' for a, b, c in [("Level 1", "First words", "numbers, family, body"), ("Level 2", "Canon words", "energy, field, law"), ("Level 3", "Reading", "abstracts in the original"), ("Level 4", "Primary text", "Noether in German")])
    body = f'''<section class="card stack" style="max-width:720px;gap:var(--s5)"><div class="row"><span class="kick grow">Placement · Español</span><span class="muted small">Question 4 of 12</span></div><div class="prog"><i style="width:33%"></i></div><h2 class="disp">Type the Spanish word for hundred.</h2><label class="f">Your answer<input class="inp is-focus" lang="es" value="cien" autocomplete="off"></label><div class="row"><button class="btn">Check</button><button class="btn ghost">I don’t know</button></div></section>
<section class="stack"><h3>Where you might land</h3><ol class="grid" style="--cols:4">{lv}</ol></section>'''
    return head(d, "placement") + shell(d, "app-learn", "Placement", body) + end()

def p_progress(d):
    v = [12, 20, 18, 0, 22, 25, 14, 20, 30, 16, 20, 24, 19, 12]
    bars = "".join(f'<rect x="{i*40+8}" y="{160-x*5}" width="24" height="{max(x*5,2)}" fill="{SK[d]["acc"]}" rx="{0 if d=="d1" else 4}"/>' for i, x in enumerate(v))
    lab = "".join(f'<text x="{i*40+20}" y="182" text-anchor="middle" font-size="12" fill="{SK[d]["muted"]}">{i+5}</text>' for i in range(0, 14, 2))
    langs = "".join(f'<li class="setrow"><span style="width:120px" lang="{l}">{n}</span><div class="prog grow"><i style="width:{p}%"></i></div><span class="muted small" style="width:48px;text-align:right">{p}%</span></li>' for n, l, p in [("Español", "es", 64), ("Русский", "ru", 38), ("עברית", "he", 22)])
    read = "".join(f'<li class="setrow"><span class="kick" style="width:48px">{e[3]}</span><span class="grow">{e[2]}</span><span class="muted small">{e[1]}</span></li>' for e in CANON)
    body = f'''<div class="grid" style="--cols:4"><div class="card stat"><span class="muted small">Streak</span><b>23 days</b></div><div class="card stat"><span class="muted small">Words known</span><b>412</b></div><div class="card stat"><span class="muted small">Canon read</span><b>5</b></div><div class="card stat"><span class="muted small">Accuracy</span><b>91%</b></div></div>
<section class="card stack"><h3>Minutes per day: 5 to 18 October</h3><svg viewBox="0 0 560 190" role="img" aria-label="Minutes studied per day, average 18" style="width:100%;height:auto"><line x1="0" y1="160" x2="560" y2="160" stroke="{SK[d]["line"]}"/><line x1="0" y1="60" x2="560" y2="60" stroke="{SK[d]["line"]}" stroke-dasharray="4 4"/><text x="556" y="54" text-anchor="end" font-size="12" fill="{SK[d]["muted"]}">goal 20 min</text>{bars}{lab}</svg></section>
<div class="grid" style="--cols:2"><section class="card"><h3>Languages</h3><ul>{langs}</ul></section><section class="card"><h3>Canon read</h3><ul>{read}</ul></section></div>'''
    return head(d, "progress") + shell(d, "app-progress", "Progress", body) + end()

def p_search(d):
    res = "".join(centry(e, d) for e in CANON)
    body = f'''<form class="row" role="search"><label class="sr" for="q">Search the canon</label><input id="q" class="inp grow" type="search" value="entropy" style="min-width:0"><button class="btn">Search</button></form><div class="row"><button class="chip" aria-pressed="true">All</button><button class="chip" aria-pressed="false">Physics</button><button class="chip" aria-pressed="false">Information</button><button class="chip" aria-pressed="false">Mathematics</button></div><p class="muted small">5 entries. Reading is free; each cite pays the author once.</p><div class="grid">{res}</div><div class="callout row"><span class="grow">The full search design has advisor, source and globe modes.</span><a class="btn ghost sm" href="../../screens/{d}-search.html">Open full search</a></div>'''
    return head(d, "canon search") + shell(d, "app-canon-search", "Canon", body) + end()

def p_settings(d):
    def sw(t, s, on): return f'<div class="setrow"><div class="grow"><b>{t}</b><p class="muted small">{s}</p></div><button class="sw" role="switch" aria-checked="{str(on).lower()}" aria-label="{t}"></button></div>'
    body = f'''<div class="split"><div class="stack" style="gap:var(--s5)"><section class="card stack"><h3>Profile</h3><div class="grid" style="--cols:2"><label class="f">Name<input class="inp" value="Emmy Noether"></label><label class="f">Email<input class="inp" type="email" value="emmy@bucket.foundation"></label></div></section>
<section class="card stack"><h3>Daily goal</h3><div class="row" role="radiogroup" aria-label="Daily goal"><button class="chip" aria-pressed="false">10 min</button><button class="chip" aria-pressed="true">20 min</button><button class="chip" aria-pressed="false">30 min</button></div></section>
<section class="card"><h3>Notifications</h3>{sw("Review reminder", "One nudge at 19:00 when cards are due.", True)}{sw("Streak at risk", "Tell me at 21:00 if I have not studied.", True)}{sw("New canon entries", "A weekly email with new foundations.", False)}</section></div>
<div class="stack" style="gap:var(--s5)"><section class="card stack"><h3>Citation wallet</h3><p class="muted small">Base mainnet · USDC</p><code class="mono">0x4f2C…9a1E</code><label class="f">Monthly cap<input class="inp" value="$5.00"></label><p class="muted small">This month: 7 cites, $0.07.</p></section><section class="card stack"><h3>Languages</h3><p class="muted">Español, Русский, עברית</p><a class="btn ghost sm" href="app-language-picker.html">Change</a></section><button class="btn ghost">Sign out</button></div></div>'''
    return head(d, "settings") + shell(d, "app-settings", "Settings", body) + end()

def authwrap(d, t, inner):
    return head(d, t) + f'<main class="pad" style="min-height:100vh;display:grid;place-items:center"><div class="card stack" style="width:100%;max-width:440px;gap:var(--s5);padding:var(--s6)">{brand(d)}{inner}</div></main>' + end()

def p_signin(d):
    return authwrap(d, "sign in", '<h1 class="disp" style="font-size:32px;line-height:40px">Sign in</h1><label class="f">Email<input class="inp is-focus" type="email" value="emmy@bucket.foundation" autocomplete="email"></label><a class="btn block" href="signin-code.html">Email me a code</a><button class="btn ghost block">Use a passkey</button><p class="muted small">New to Bucket? <a href="signup.html">Create an account</a></p>')

def p_signup(d):
    ch = "".join(f'<button type="button" class="chip" aria-pressed="{str(on).lower()}" lang="{l}">{x}</button>' for x, l, on in [("Español", "es", True), ("Русский", "ru", True), ("עברית", "he", False), ("Ελληνικά", "el", False)])
    return authwrap(d, "sign up", f'<h1 class="disp" style="font-size:32px;line-height:40px">Create your account</h1><label class="f">Name<input class="inp" value="Emmy Noether" autocomplete="name"></label><label class="f">Email<input class="inp" type="email" placeholder="you@university.edu" autocomplete="email"></label><fieldset style="border:0;padding:0;margin:0" class="stack"><legend class="small" style="font-weight:600;margin-bottom:var(--s2)">Languages to study</legend><div class="row">{ch}</div></fieldset><label class="row small"><input type="checkbox" checked style="width:20px;height:20px;accent-color:var(--acc)"> I agree to the Terms and the CC0 protocol.</label><a class="btn block" href="signin-code.html">Create account</a><p class="muted small">Have one? <a href="signin.html">Sign in</a></p>')

def p_code(d):
    cells = "".join(f'<input class="inp{" is-focus" if i==4 else ""}" inputmode="numeric" maxlength="1" aria-label="Digit {i+1}" value="{c}">' for i, c in enumerate("4829  "))
    return authwrap(d, "sign in code", f'<h1 class="disp" style="font-size:32px;line-height:40px">Check your email</h1><p class="muted">We sent a 6-digit code to <b style="color:var(--text)">emmy@bucket.foundation</b>. It expires in 10 minutes.</p><div class="code6">{cells}</div><button class="btn block" disabled>Verify</button><p class="muted small">No email? Resend in 0:42.</p>')

def p_email(d):
    s = SK[d]; r = s["r"]; rb = s["rb"]
    btn = f'<a href="#" style="display:inline-block;background:{s["acc"]};color:{s["onacc"]};font-weight:700;text-decoration:none;padding:12px 24px;border-radius:{rb}">Sign in to bkt</a>'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bkt {s["name"]} sign-in email</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?{s["fonts"]}&display=swap"><style>:root{{--bg:{s["bg"]}}}body{{margin:0;background:var(--bg)}}a:focus-visible{{outline:3px solid {s["text"]};outline-offset:3px}}</style></head><body style="margin:0;background:{s["bg"]};font-family:{s["body"]};color:{s["text"]}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{s["bg"]}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:{s["surf"]};border:1px solid {s["line"]};border-radius:{r}">
<tr><td style="padding:24px 32px;border-bottom:1px solid {s["line"]}"><img src="../../icons/{d}-glyph.svg" width="32" height="32" alt="bkt" style="vertical-align:middle;border-radius:{"0" if d=="d1" else "8px"}"> <span style="font:{s["dw"]} 20px/32px {s["disp"]};vertical-align:middle;margin-left:8px">bkt</span></td></tr>
<tr><td style="padding:32px"><h1 style="margin:0 0 16px;font:{s["dw"]} 28px/36px {s["disp"]}">Your sign-in code</h1><p style="margin:0 0 24px;font-size:16px;line-height:24px;color:{s["muted"]}">Enter this code in bkt to sign in as emmy@bucket.foundation. It expires in 10 minutes.</p>
<p style="margin:0 0 24px;font:700 40px/48px {s["mono"]};letter-spacing:8px;background:{s["bg"]};padding:16px 24px;border-radius:{"0" if d=="d1" else "12px"}">482 913</p>{btn}
<p style="margin:24px 0 0;font-size:14px;line-height:20px;color:{s["muted"]}">If you did not ask for this, ignore it. Nobody can sign in without the code.</p></td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid {s["line"]};font-size:12px;line-height:16px;color:{s["muted"]}">Bucket Foundation · free to read, paid to cite · <a href="#" style="color:{s["muted"]}">Email settings</a></td></tr></table></td></tr></table></body></html>'''

def p_onb(d):
    steps = [("Pick your scripts", '<div class="row"><button class="chip" aria-pressed="true">Latin</button><button class="chip" aria-pressed="true" lang="he">עברית</button><button class="chip" aria-pressed="false" lang="el">Ελληνικά</button><button class="chip" aria-pressed="true" lang="ru">Кириллица</button></div>'),
             ("Set a daily goal", '<div class="row"><button class="chip" aria-pressed="false">10 min</button><button class="chip" aria-pressed="true">20 min</button><button class="chip" aria-pressed="false">30 min</button></div>'),
             ("Find your level", '<p class="muted">Twelve questions, about four minutes.</p><a class="btn ghost sm" href="app-placement.html">Take placement</a>'),
             ("Add a citation wallet", '<p class="muted">Optional. Cites cost about a cent each and go to the author.</p><button class="btn ghost sm">Connect wallet</button>')]
    li = "".join(f'<li class="card stack"><div class="row"><span class="n"></span><h3 class="grow">{h}</h3>{"<span class=tag>Done</span>" if i<2 else ""}</div>{b}</li>' for i, (h, b) in enumerate(steps))
    return head(d, "onboarding") + f'<header class="site">{brand(d)}<nav><span class="muted small">Step 3 of 4</span></nav></header><main class="pad wrap stack" style="gap:var(--s6)"><h1 class="disp">Welcome to bkt.</h1><div class="prog" style="max-width:480px"><i style="width:75%"></i></div><ol class="steps">{li}</ol><div class="row"><a class="btn" href="app-learn.html">Start learning</a><a href="app-learn.html">Skip for now</a></div></main>' + end()

def p_dl(d):
    pl = [("macOS", "Universal, macOS 13 or later", ".dmg · 48 MB"), ("Windows", "Windows 10 and 11, x64 and Arm", ".msi · 52 MB"), ("Linux", "AppImage, .deb and .rpm", "x64 · 50 MB"), ("iOS", "iPhone and iPad, iOS 17", "App Store"), ("Android", "Android 10 or later", "Google Play"), ("CLI", "bkt for any terminal", "brew, npm or curl")]
    c = "".join(f'<li class="card stack"><h3>{a}</h3><p class="muted">{b}</p><p class="small muted mono">{x}</p><a class="btn sm" href="#" style="align-self:flex-start;margin-top:auto">Download for {a}</a></li>' for a, b, x in pl)
    return head(d, "download") + site(d) + f'''<main class="pad wrap stack" style="gap:var(--s6)"><span class="kick">bkt 0.9.0 · 14 October 2026</span><h1 class="disp">Download bkt</h1><ul class="grid">{c}</ul><section class="stack"><h2 class="disp">From the terminal</h2><pre class="term"><span class="p">$</span> curl -fsSL https://bucket.foundation/install.sh | sh
<span class="p">$</span> bkt cite noether-1918
<span class="g">✓</span> Paid $0.01 to the Noether estate fund over x402 on Base
<span class="d">  receipt  bkt://r/noether-1918/7c1e</span></pre></section></main>''' + foot(d) + end()

def p_logo(d):
    s = SK[d]
    others = "".join(f'<span class="app-i"><i style="background:{c}"></i>{n}</span>' for c, n in [("#3A3A3C", "Clock"), ("#5E5CE6", "Notes"), ("#30B0C7", "Weather"), ("#8E8E93", "Files"), ("#FF9F0A", "Books"), ("#34C759", "Maps"), ("#636366", "Camera")])
    return head(d, "logo in context") + site(d) + f'''<main class="pad wrap stack" style="gap:var(--s6)"><h1 class="disp">The mark in use</h1><div class="grid" style="--cols:2">
<section class="card stack center" style="align-items:center"><h3>Home screen</h3><div class="phone"><div class="scr" style="background:linear-gradient(160deg,{s["acc"]},#161616)"><span class="app-i"><img src="../../icons/{d}-glyph.svg" alt="">bkt</span>{others}</div></div></section>
<div class="stack" style="gap:var(--s4)"><section class="card stack"><h3>Browser tab</h3><div style="background:#DADCE0;border-radius:8px 8px 0 0;padding:8px 8px 0"><div class="row" style="background:#fff;border-radius:8px 8px 0 0;padding:8px 12px;gap:8px;max-width:260px;color:#202124;font-size:13px;line-height:16px"><img src="../../icons/{d}-glyph.svg" alt="" width="16" height="16">Noether 1918 · bkt</div></div><div style="background:#fff;border:1px solid #DADCE0;padding:8px 12px;font:13px/16px var(--mono);color:#202124">bucket.foundation/canon/noether-1918</div></section>
<section class="card stack"><h3>CLI prompt</h3><pre class="term"><span class="p">$</span> bkt cite noether-1918
<span class="g">✓</span> Invariante Variationsprobleme, 1918
<span class="d">  paid $0.01 · receipt bkt://r/7c1e</span></pre></section>
<section class="card stack"><h3>Tote and signage</h3><div class="row" style="gap:var(--s4)"><img src="../../3d/{d}-mark.png" alt="3D render of the {s["name"]} mark" style="width:160px;height:160px;object-fit:cover;border-radius:var(--r);background:var(--bg)"><div style="width:120px;height:150px;background:{s["bg"]};border:2px solid {s["text"]};border-radius:0 0 12px 12px;display:grid;place-items:center;position:relative"><img src="../../icons/{d}-glyph.svg" alt="bkt tote bag" width="64" height="64"></div></div></section></div></div></main>''' + foot(d) + end()

def names_svgs(d):
    s = SK[d]; a, t, h, bg = s["acc"], s["text"], s["hl"], s["bg"]
    if d == "d1":
        sym = f'<rect width="100" height="100" fill="{t}"/><circle cx="62" cy="38" r="40" fill="none" stroke="{bg}" stroke-width="3"/><circle cx="62" cy="38" r="26" fill="none" stroke="{a}" stroke-width="10"/><circle cx="62" cy="38" r="12" fill="none" stroke="{bg}" stroke-width="3"/><rect x="10" y="78" width="12" height="12" fill="{h}"/>'
        why = ["Plex Light lowercase, flush left, the way Muller-Brockmann set Musica Viva.", "The full word in one weight. Reads like a spine label on a reference shelf.", "Concentric rings off-centre on black, after the 1958 Musica Viva posters. No letter needed."]
    elif d == "d2":
        sym = f'<circle cx="50" cy="50" r="46" fill="{a}"/><circle cx="50" cy="50" r="40" fill="none" stroke="{bg}" stroke-width="1.5"/><g fill="{bg}"><rect x="36" y="20" width="8" height="60" transform="rotate(45 50 50)"/><rect x="56" y="20" width="8" height="60" transform="rotate(45 50 50)"/><rect x="36" y="20" width="8" height="60" transform="rotate(-45 50 50)"/><rect x="56" y="20" width="8" height="60" transform="rotate(-45 50 50)"/></g>'
        why = ["Mincho lowercase with wide tracking, written as a scroll title.", "Bucket in Mincho, the way a shop name sits on a noren curtain.", "Igeta, the well-frame crest from the Matsuya crest book. A well is where the bucket goes."]
    else:
        sym = f'<rect width="100" height="100" rx="24" fill="#FFC800"/><path d="M26 40h48l-7 42H33Z" fill="{s["acct"]}"/><path d="M28 38q22-34 44 0" fill="none" stroke="{h}" stroke-width="6" stroke-linecap="round"/><path d="M34 60q5-6 10 0t10 0t10 0" fill="none" stroke="#FFF8E7" stroke-width="5" stroke-linecap="round"/><circle cx="80" cy="20" r="6" fill="#1CB0F6"/>'
        why = ["Fredoka bold lowercase, chunky and bouncy like a Duolingo lesson title.", "Bucket with a Memphis squiggle under it, after Sottsass laminates.", "A pail with a squiggle handle on yellow. Shapes only, no letter."]
    word = lambda txt, sz: f'<text x="0" y="{int(sz*0.8)}" font-family="{s["disp"].replace(chr(39),"")}" font-weight="{s["dw"]}" font-size="{sz}" fill="{t}" letter-spacing="{"2" if d=="d2" else "-1"}">{txt}</text>'
    deco = f'<path d="M4 76q10-10 20 0t20 0t20 0t20 0" stroke="{h}" stroke-width="5" fill="none" stroke-linecap="round"/>' if d == "d3" else (f'<rect x="0" y="74" width="40" height="4" fill="{a}"/>' if d == "d1" else f'<circle cx="270" cy="22" r="8" fill="{h}"/>')
    return [("bkt", f'<svg viewBox="0 0 200 80" role="img" aria-label="bkt wordmark">{word("bkt",72)}</svg>', why[0]),
            ("Bucket", f'<svg viewBox="0 0 300 84" role="img" aria-label="Bucket wordmark">{word("Bucket",64)}{deco}</svg>', why[1]),
            ("Symbol", f'<svg viewBox="0 0 100 100" role="img" aria-label="Symbol mark">{sym}</svg>', why[2])]

def p_names(d):
    rows = "".join(f'<li class="card stack"><span class="kick">{n}</span><div style="height:160px;display:flex;align-items:center">{svg.replace("<svg ", "<svg style=height:120px;width:auto ")}</div><div class="row" style="gap:var(--s4)"><span style="width:32px;height:32px;display:block">{svg.replace("<svg ", "<svg width=32 height=32 ")}</span><span class="muted small">at 32 px</span></div><p class="muted">{w}</p></li>' for n, svg, w in names_svgs(d))
    return head(d, "names") + site(d) + f'<main class="pad wrap stack" style="gap:var(--s6)"><span class="kick">{SK[d]["name"]} · names and marks</span><h1 class="disp">What to call it</h1><ul class="grid">{rows}</ul><section class="card stack"><h3>Current glyph</h3><div class="row"><img src="../../icons/{d}-glyph.svg" alt="bkt glyph" width="96" height="96"><img src="../../icons/{d}-glyph.svg" alt="" width="32" height="32"><img src="../../icons/{d}-glyph.svg" alt="" width="16" height="16"></div></section></main>' + foot(d) + end()

KATEX = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:\'$$\',right:\'$$\',display:true},{left:\'\\\\(\',right:\'\\\\)\',display:false}]})"></script>'

def p_math(d):
    s = SK[d]
    pts = " ".join(f"{20+i*4},{180-160*(-(p*__import__('math').log2(p))-((1-p)*__import__('math').log2(1-p)) if 0<p<1 else 0):.1f}" for i in range(0, 101) for p in [i/100])
    fig = f'<svg viewBox="0 0 440 210" role="img" aria-label="Binary entropy H(p) peaks at one bit when p is one half" style="width:100%;height:auto"><line x1="20" y1="180" x2="420" y2="180" stroke="{s["muted"]}"/><line x1="20" y1="20" x2="20" y2="180" stroke="{s["muted"]}"/><line x1="220" y1="20" x2="220" y2="180" stroke="{s["line"]}" stroke-dasharray="4 4"/><polyline points="{pts}" fill="none" stroke="{s["acc"]}" stroke-width="4"/><circle cx="220" cy="20" r="6" fill="{s["hl"]}"/><text x="228" y="32" font-size="14" fill="{s["text"]}">1 bit at p = ½</text><text x="20" y="200" font-size="12" fill="{s["muted"]}">0</text><text x="412" y="200" font-size="12" fill="{s["muted"]}">1</text><text x="200" y="200" font-size="12" fill="{s["muted"]}">p</text></svg>'
    steps = [("Require continuity, growth in n for equal outcomes, and additivity over successive choices.", ""), ("For n equal outcomes these force", r"$$H\left(\tfrac1n,\dots,\tfrac1n\right)=K\log n$$"), ("Split rational probabilities into equal parts and apply additivity:", r"$$H(p_1,\dots,p_n)=-K\sum_{i=1}^{n}p_i\log p_i$$"), ("Choose \\(K=1\\) and base 2 to measure in bits.", "")]
    st = "".join(f'<li><span class="n">{i+1}</span><div class="stack" style="gap:var(--s2)"><p>{a}</p>{b}</div></li>' for i, (a, b) in enumerate(steps))
    lean = '''<span class="k">import</span> Mathlib.Analysis.SpecialFunctions.Log.Basic

<span class="c">-- each term of Shannon entropy is nonnegative on [0, 1]</span>
<span class="k">theorem</span> entropy_term_nonneg {p : <span class="t">ℝ</span>} (h0 : 0 ≤ p) (h1 : p ≤ 1) :
    0 ≤ -(p * Real.log p) := <span class="k">by</span>
  <span class="k">have</span> hlog : Real.log p ≤ 0 := Real.log_nonpos h0 h1
  <span class="k">have</span> : p * Real.log p ≤ 0 := mul_nonpos_of_nonneg_of_nonpos h0 hlog
  linarith'''
    body = f'''<article class="pad wrap stack" style="gap:var(--s6);max-width:880px"><span class="kick">Information · 1948 · shannon-1948</span><h1 class="disp">A Mathematical Theory of Communication</h1><p class="muted">Claude E. Shannon, Bell System Technical Journal 27, 379 to 423.</p>
<div class="eq">$$H(p)=-\\sum_{{i=1}}^{{n}}p_i\\log_2 p_i$$</div><div class="callout"><b>Definition.</b> \\(H\\) is the average number of bits needed to name an outcome drawn from \\(p\\).</div>
<section class="stack"><h2 class="disp">Derivation</h2><ol class="proof">{st}</ol></section>
<figure class="card stack">{fig}<figcaption class="muted small">Binary entropy \\(H(p)=-p\\log_2p-(1-p)\\log_2(1-p)\\).</figcaption></figure>
<section class="stack"><h2 class="disp">Related entries</h2><div class="eq"><p class="kick">Maxwell 1865 · Gauss’s law</p>$$\\nabla\\cdot\\mathbf{{E}}=\\frac{{\\rho}}{{\\varepsilon_0}}$$</div><div class="callout"><b>Noether 1918.</b> Every differentiable symmetry of the action \\(S=\\int L\\,dt\\) has a conserved current: if \\(L\\) is invariant under \\(t\\mapsto t+\\epsilon\\), then \\(E=\\sum_i\\dot q_i\\,\\frac{{\\partial L}}{{\\partial \\dot q_i}}-L\\) is conserved.</div></section>
<section class="stack"><h2 class="disp">Proof in Lean 4</h2><pre class="lean">{lean}</pre></section><div class="row"><a class="btn" href="#">Cite $0.01</a><a class="btn ghost" href="app-canon-search.html">Back to canon</a></div></article>'''
    return head(d, "math", KATEX) + site(d) + "<main>" + body + "</main>" + foot(d) + end()

def p_video(d):
    fr = "".join(f'<figure class="{"on" if i==3 else ""}"><img src="../../video/{d}-frame-{i}.jpg" alt="Scene {i}"><figcaption class="small muted">{i} · {t}</figcaption></figure>' for i, t in enumerate(["Title", "1948", "Bits", "H(p)", "Peak", "Cite"], 1))
    body = f'''<div class="split"><div class="stack" style="gap:var(--s5)"><section class="card stack"><div class="row"><h3 class="grow">Preview</h3><div class="seg" role="group" aria-label="Aspect"><button aria-pressed="true">16:9</button><button aria-pressed="false">9:16</button></div></div><video src="../../video/{d}-16x9.mp4" poster="../../video/{d}-frame-1.jpg" controls muted playsinline style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--r);background:#161616"></video></section>
<section class="card stack"><h3>Scenes</h3><div class="tl">{fr}</div></section></div>
<div class="stack" style="gap:var(--s5)"><section class="card stack"><h3>Source entry</h3><label class="f">Canon entry<select class="inp">{"".join(f"<option{' selected' if e[0]=='shannon-1948' else ''}>{e[1]} · {e[3]}</option>" for e in CANON)}</select></label></section>
<section class="card stack"><h3>Script</h3><label class="f">Narration, 58 seconds<textarea class="inp" rows="7">In 1948 Claude Shannon asked how many yes-or-no questions it takes to name a message. His answer, H equals minus the sum of p log p, peaks at one bit for a fair coin. Every file you send still obeys it.</textarea></label></section>
<section class="card stack"><h3>Render</h3><div class="row"><button class="btn">Render video</button><button class="btn" disabled>Rendering 64%</button></div><div class="prog" role="progressbar" aria-label="Render" aria-valuenow="64" aria-valuemin="0" aria-valuemax="100"><i style="width:64%"></i></div><p class="muted small">1920 × 1080 · about 40 seconds left. Done renders cite the entry automatically.</p></section></div></div>'''
    return head(d, "video tool") + shell(d, "app-canon-search", "Make a video", body) + end()

PAGES = dict(landing=p_landing, **{"polingual-landing": p_poly, "polingual-flow": p_flow, "app-learn": p_learn, "app-language-picker": p_picker, "app-study-card": p_study, "app-review": p_review, "app-quiz": p_quiz, "app-placement": p_place, "app-progress": p_progress, "app-canon-search": p_search, "app-settings": p_settings, "signin": p_signin, "signup": p_signup, "signin-code": p_code, "email-signin": p_email, "onboarding": p_onb, "download": p_dl, "logo-in-context": p_logo, "names": p_names, "math": p_math, "app-video-tool": p_video})

for d in SK:
    os.makedirs(f"{OUT}/{d}/thumbs", exist_ok=True)
    for n, f in PAGES.items():
        open(f"{OUT}/{d}/{n}.html", "w").write(__import__("made_d34").inject(d, __import__("made12").enforce(d, f(d), 2), "../.."))
    s = SK[d]
    pairs = [("text/bg", s["text"], s["bg"]), ("text/surf", s["text"], s["surf"]), ("muted/bg", s["muted"], s["bg"]), ("muted/surf", s["muted"], s["surf"]), ("onacc/acc", s["onacc"], s["acc"]), ("acct/bg", s["acct"], s["bg"]), ("acct/surf", s["acct"], s["surf"]), ("onhl/hl", s["onhl"], s["hl"]), ("navon", {"d1": "#161616", "d2": "#F4EFE4", "d3": "#2B2B2B"}[d], {"d1": "#E8E8E8", "d2": "#1F3A5F", "d3": "#DDF4FF"}[d]), ("term", "#C6C6C6", "#161616"), ("ok-bar text", s["text"], "#E0F2D0" if d == "d3" else s["surf"])]
    print(d, " ".join(f"{k}={cr(a,b):.2f}" for k, a, b in pairs))
