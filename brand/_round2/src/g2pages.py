import os,sys,math,html
HERE=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,HERE)
import g2marks as M,g2tokens as T,g2data as DATA
R2=os.path.dirname(HERE)
SCREENS=os.path.join(R2,"screens")
ASSETS=os.path.join(R2,"assets","grid2")
E=html.escape
FONTS=("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+Hebrew:wght@400;600"
       "&family=IBM+Plex+Sans+Devanagari:wght@400;600&family=IBM+Plex+Sans+Arabic:wght@400;600&family=IBM+Plex+Sans+Thai:wght@400&family=IBM+Plex+Sans+KR:wght@400"
       "&family=Noto+Sans+SC:wght@400&family=Noto+Sans+JP:wght@400&family=Noto+Sans+Tamil:wght@400&family=Fredoka:wght@600;700&family=Nunito:wght@400;800&display=swap")
KATEX="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/"
STACK="'IBM Plex Sans','IBM Plex Sans Hebrew','IBM Plex Sans Arabic','IBM Plex Sans Devanagari','IBM Plex Sans Thai','IBM Plex Sans KR','Noto Sans JP','Noto Sans SC','Noto Sans Tamil',sans-serif"
YOUNG="'Fredoka','Nunito','IBM Plex Sans Hebrew','IBM Plex Sans Arabic','IBM Plex Sans Devanagari','Noto Sans JP','Noto Sans SC',sans-serif"
CSS=T.css_vars()+"""
:root{--body:"""+STACK+""";--mono:'IBM Plex Mono',ui-monospace,monospace;--young:"""+YOUNG+""";--ease:cubic-bezier(0.2,0,0.38,0.9);--step:steps(4,end)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 16px/24px var(--body);-webkit-font-smoothing:antialiased;overflow-x:hidden;min-height:100vh}
body[data-texture=girih]{background-image:url(marks/girih.svg);background-size:64px 64px}
h1,h2,h3,h4,p,ol,ul,figure,blockquote{margin:0}ol,ul{list-style:none;padding:0}a{color:var(--acc)}svg,img{display:block;max-width:100%}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.d1{font:300 56px/64px var(--body);letter-spacing:-.02em}.d2{font:300 40px/48px var(--body);letter-spacing:-.01em}.h3{font:600 20px/28px var(--body)}
.kick{font:600 12px/16px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.mono{font-family:var(--mono)}.muted{color:var(--muted)}.small{font-size:14px;line-height:20px}
.wrap{max-width:1312px;margin:0 auto;padding:0 var(--s7);width:100%}
.g16{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));column-gap:var(--s5)}
.stack{display:flex;flex-direction:column;gap:var(--s4)}.row{display:flex;flex-wrap:wrap;gap:var(--s3);align-items:center}.grow{flex:1;min-width:0}
.rule{border-top:2px solid var(--text)}.hair{border-top:1px solid var(--line)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);min-height:48px;padding:var(--s3) var(--s5);background:var(--acc);color:var(--onacc);font:600 16px/24px var(--body);border:0;border-radius:0;text-decoration:none;cursor:pointer;white-space:nowrap;transition:background 110ms var(--ease)}
.btn:hover{background:#0043C2}.btn.ghost{background:transparent;color:var(--text);box-shadow:inset 0 0 0 2px var(--text)}.btn.ink{background:var(--ink);color:var(--onink)}
.btn.sm{min-height:40px;padding:var(--s2) var(--s4);font-size:14px;line-height:20px}.btn.block{width:100%}
a:focus-visible,.btn:focus-visible,.chip:focus-visible,.opt:focus-visible,input:focus-visible,button:focus-visible{outline:3px solid var(--text);outline-offset:3px}
.chip{display:inline-flex;align-items:center;gap:var(--s2);min-height:40px;padding:var(--s2) var(--s3);background:var(--surf);color:var(--text);border:0;box-shadow:inset 0 0 0 1px var(--muted);font:400 14px/20px var(--body);cursor:pointer}
.chip[aria-pressed=true]{background:var(--ink);color:var(--onink);box-shadow:none}
.inp{width:100%;min-height:48px;padding:var(--s3) var(--s4);font:400 16px/24px var(--body);color:var(--text);background:var(--surf);border:0;border-bottom:2px solid var(--text);border-radius:0}
.inp::placeholder{color:var(--muted);opacity:1}
label.f{display:flex;flex-direction:column;gap:var(--s2);font:600 14px/20px var(--body)}
.card{background:var(--surf);padding:var(--s5);min-width:0}
.sq{display:inline-block;width:16px;height:16px;background:var(--red);flex:none}.sq.k{background:var(--knob);border-radius:50%}.sq.y{background:var(--yel)}.sq.b{background:var(--pblue)}
.tri{width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid var(--yel);flex:none}
.prog{height:8px;background:var(--surf2)}.prog i{display:block;height:100%;background:var(--ink)}
.site{display:flex;align-items:center;gap:var(--s5);padding:var(--s4) var(--s7);border-bottom:2px solid var(--text);background:var(--bg)}
.brand{display:flex;align-items:center;gap:var(--s3);font:600 20px/28px var(--body);color:var(--text);text-decoration:none}.brand svg{width:40px;height:40px}
.site nav{display:flex;gap:var(--s5);margin-left:auto;align-items:center}.site nav a{color:var(--text);text-decoration:none;font-size:14px;line-height:20px}.site nav a.btn{color:var(--onacc)}
.foot{background:var(--ink);color:var(--onink);padding:var(--s9) 0 var(--s7)}.foot a{color:var(--onink)}.foot .muted{color:var(--inkmuted)}.foot h4{font:600 12px/16px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--inkmuted);margin-bottom:var(--s3)}
.foot li{margin-bottom:var(--s2)}.foot li a{text-decoration:none;font-size:14px;line-height:20px}
.credit{font:400 12px/16px var(--mono);color:var(--muted)}.credit a{color:var(--muted)}
.app{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh}
.rail{background:var(--ink);color:var(--onink);padding:var(--s5) var(--s4);display:flex;flex-direction:column;gap:var(--s5)}
.rail .brand{color:var(--onink)}.rail nav{display:flex;flex-direction:column;gap:var(--s1)}
.rail nav a{display:flex;align-items:center;gap:var(--s3);padding:var(--s2) var(--s3);min-height:40px;color:var(--onink);text-decoration:none;font-size:14px;line-height:20px}
.rail nav a[aria-current=page]{background:var(--onink);color:var(--ink)}.rail .ic{width:20px;height:20px}
.main{padding:var(--s7) var(--s8) var(--s9);min-width:0}
.tabs{display:none}
.top{display:flex;align-items:flex-end;gap:var(--s4);padding-bottom:var(--s4);border-bottom:2px solid var(--text);margin-bottom:var(--s6)}
.num{font:600 12px/16px var(--mono);color:var(--muted)}
.prop{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--s6);align-items:start}
.proof ol{counter-reset:p;display:flex;flex-direction:column;gap:var(--s3)}.proof li{counter-increment:p;display:grid;grid-template-columns:32px minmax(0,1fr);gap:var(--s2);font-size:14px;line-height:20px}
.proof li::before{content:counter(p);font:600 12px/20px var(--mono);color:var(--muted)}
.lang{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));border-top:2px solid var(--text);border-left:1px solid var(--line)}
.lang li{border-right:1px solid var(--line);border-bottom:1px solid var(--line);padding:var(--s3);min-width:0;display:flex;flex-direction:column;gap:var(--s1)}
.lang .w{font:400 24px/32px var(--body);overflow-wrap:anywhere}.lang .c{font:400 12px/16px var(--mono);color:var(--muted)}
.idx li{display:grid;grid-template-columns:48px minmax(0,4fr) minmax(0,5fr) minmax(0,3fr);gap:var(--s4);padding:var(--s3) 0;border-bottom:1px solid var(--line);align-items:baseline}
.idx .nm{font:400 24px/32px var(--body)}
.young{--young-r:16px;font-family:var(--young);background:var(--sq-bg);color:var(--sq-text)}
.young .card{border-radius:var(--young-r);box-shadow:0 4px 0 var(--sq-line);border:2px solid var(--sq-line)}
.yb{display:inline-flex;align-items:center;justify-content:center;gap:var(--s2);min-height:52px;padding:var(--s3) var(--s6);border:0;border-radius:16px;font:700 20px/24px 'Fredoka',sans-serif;letter-spacing:.02em;text-transform:uppercase;cursor:pointer;background:var(--sq-green);color:var(--sq-ongreen);box-shadow:0 4px 0 var(--sq-greenlip);transition:transform 80ms,box-shadow 80ms}
.yb:active{transform:translateY(4px);box-shadow:0 0 0 var(--sq-greenlip)}.yb.pink{background:var(--sq-pink);color:var(--sq-onpink);box-shadow:0 4px 0 var(--sq-pinklip)}.yb.sky{background:var(--sq-sky);color:var(--sq-onsky);box-shadow:0 4px 0 var(--sq-skylip)}
.yb.white{background:var(--sq-surf);color:var(--sq-text);box-shadow:0 4px 0 var(--sq-line),inset 0 0 0 2px var(--sq-line)}.yb.knob{background:var(--knob);color:var(--onknob);box-shadow:0 4px 0 #C24800}
.yb.block{width:100%}
.shapes{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.flow{display:flex;gap:var(--s2);flex-wrap:wrap}.flow span{font:600 12px/16px var(--mono);padding:var(--s1) var(--s2);box-shadow:inset 0 0 0 1px var(--muted);color:var(--muted)}.flow span[aria-current=step]{background:var(--ink);color:var(--onink);box-shadow:none}
.cal{display:grid;grid-template-columns:repeat(26,12px);grid-auto-rows:12px;gap:4px}.cal i{background:var(--surf2)}.cal i.l1{background:#B9B4AA}.cal i.l2{background:#6F6A62}.cal i.l3{background:var(--ink)}
@media (max-width:900px){
.wrap{padding:0 var(--s4)}.d1{font-size:40px;line-height:48px}.d2{font-size:32px;line-height:40px}
.site{padding:var(--s3) var(--s4)}.site nav a.hide-s{display:none}
.g16{grid-template-columns:minmax(0,1fr);column-gap:var(--s3)}.g16>*{grid-column:1/-1!important}
.app{grid-template-columns:minmax(0,1fr)}.rail{display:none}.main{padding:var(--s5) var(--s4) 104px}
.tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed;left:0;right:0;bottom:0;background:var(--ink);z-index:5}
.tabs a{display:flex;flex-direction:column;align-items:center;gap:var(--s1);padding:var(--s2) 0 var(--s3);color:var(--onink);text-decoration:none;font-size:12px;line-height:16px;min-height:64px}.tabs a[aria-current=page]{background:var(--onink);color:var(--ink)}.tabs .ic{width:24px;height:24px}
.young .tabs{background:var(--sq-surf);border-top:2px solid var(--sq-line)}.young .tabs a{color:var(--sq-text)}.young .tabs a[aria-current=page]{background:var(--sq-gold);color:var(--sq-ongold)}
.prop{grid-template-columns:minmax(0,1fr)}.lang{grid-template-columns:repeat(3,minmax(0,1fr))}
.idx li{grid-template-columns:32px minmax(0,1fr);row-gap:var(--s1)}.idx li>:nth-child(n+3){grid-column:2}
.cal{grid-template-columns:repeat(18,12px)}.cal i:nth-child(n+127){display:none}
.s-hide{display:none}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
"""
NAV=[("learn","Learn","app-learn"),("canon","Canon","canon-search"),("review","Review","review"),("progress","Progress","progress"),("settings","Settings","settings")]
def ic(kind,col="currentColor"):
    s={"learn":f'<rect x="3" y="3" width="8" height="18" fill="{col}"/><circle cx="17" cy="16" r="5" fill="{col}"/>',
       "canon":f'<circle cx="10" cy="10" r="7" fill="none" stroke="{col}" stroke-width="2"/><rect x="15" y="15" width="6" height="6" fill="{col}"/>',
       "review":f'<rect x="3" y="7" width="14" height="14" fill="none" stroke="{col}" stroke-width="2"/><rect x="7" y="3" width="14" height="14" fill="{col}"/>',
       "progress":f'<rect x="3" y="13" width="4" height="8" fill="{col}"/><rect x="10" y="8" width="4" height="13" fill="{col}"/><rect x="17" y="3" width="4" height="18" fill="{col}"/>',
       "settings":f'<circle cx="12" cy="12" r="9" fill="{col}"/><rect x="11" y="3" width="2" height="7" fill="var(--knob)"/>'}[kind]
    return f'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">{s}</svg>'
def mark(size=40): return M.mho_grid(size=size)
def site_header(cur=""):
    links=[("Canon","grid2-canon-search.html",""),("Polingual","grid2-study-young.html","hide-s"),("Learn","grid2-app-learn.html","hide-s"),("Math","grid2-math.html","hide-s")]
    a="".join(f'<a href="{h}" class="{c}"{" aria-current=page" if h.endswith(cur+".html") and cur else ""}>{t}</a>' for t,h,c in links)
    return f'<header class="site"><a class="brand" href="grid2-landing.html" aria-label="Bucket home">{mark()}<span>Bucket</span></a><nav aria-label="Primary">{a}<a class="btn sm" href="grid2-signin.html">Sign in</a></nav></header>'
def site_footer():
    s,att=DATA.strip()
    return f'''<footer class="foot"><div class="wrap"><div class="g16" style="row-gap:var(--s6)">
<div style="grid-column:span 6" class="stack"><div class="brand" style="color:var(--onink)">{M.mho_grid(fg="#F2F0EB",size=40)}<span>Bucket Foundation</span></div><p class="muted small">build the past. build history. bucket is the new renaissance.</p></div>
<div style="grid-column:span 3"><h4>Canon</h4><ul><li><a href="grid2-canon-search.html">Search</a></li><li><a href="grid2-math.html">Propositions</a></li><li><a href="grid2-app-learn.html">Learn</a></li></ul></div>
<div style="grid-column:span 3"><h4>Polingual</h4><ul><li><a href="grid2-study-young.html">Study</a></li><li><a href="grid2-quiz.html">Quiz</a></li><li><a href="grid2-review.html">Review</a></li></ul></div>
<div style="grid-column:span 4"><h4>Sources</h4><ul><li class="small muted">Words: {E(att["data"])}, {E(att["license"])}</li><li class="small muted">Figures after Oliver Byrne, 1847, public domain</li><li class="small muted">Grid after Josef Muller-Brockmann, 1981</li></ul></div>
</div><p class="muted small" style="margin-top:var(--s7)">Nonprofit. No equity, no investors, no exit.</p></div></footer>'''
def app_shell(cur,body,young=False):
    rail="".join(f'<a href="grid2-{h}.html"{" aria-current=page" if k==cur else ""}>{ic(k)}<span>{t}</span></a>' for k,t,h in NAV)
    tabs="".join(f'<a href="grid2-{h}.html"{" aria-current=page" if k==cur else ""}>{ic(k)}<span>{t}</span></a>' for k,t,h in NAV)
    return f'<div class="app"><aside class="rail"><a class="brand" href="grid2-landing.html">{M.mho_grid(fg="#F2F0EB",size=40)}<span>Bucket</span></a><nav aria-label="App">{rail}</nav><p class="small" style="margin-top:auto;color:var(--inkmuted)">Grid-Primitive</p></aside><main class="main">{body}</main><nav class="tabs" aria-label="App tabs">{tabs}</nav></div>'
def page(name,title,body,young=False,texture=False,head=""):
    import re as _re
    body=_re.sub(r'<div class="proof"><ol>(.*?)</ol>',lambda m:'<div class="proof"><ol>'+_re.sub(r'<li>(.*?)</li>',r'<li><span>\1</span></li>',m.group(1))+'</ol>',body,flags=_re.S)
    attrs=(' class="young"' if young else "")+(' data-texture="girih"' if texture else "")
    doc=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)}</title>
<link rel="icon" href="../assets/grid2/marks/favicon.svg"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="{FONTS}"><link rel="stylesheet" href="../assets/grid2/grid2.css">{head}</head><body{attrs}>{body}</body></html>'''
    open(os.path.join(SCREENS,f"grid2-{name}.html"),"w",encoding="utf-8").write(doc)
    return name
def byrne_i1(w=320):
    A=(100,180);B=(220,180);r=120;C=(160,180-r*math.sin(math.pi/3))
    c=T.C
    return f'''<svg viewBox="0 0 320 320" width="{w}" role="img" aria-label="Euclid I.1 in Byrne colors: two circles of equal radius on AB meet at C"><title>Elements I.1 after Byrne</title>
<circle cx="{A[0]}" cy="{A[1]}" r="{r}" fill="none" stroke="{c["byb"]}" stroke-width="3"/><circle cx="{B[0]}" cy="{B[1]}" r="{r}" fill="none" stroke="{c["byy"]}" stroke-width="3"/>
<path d="M{A[0]} {A[1]}L{B[0]} {B[1]}" stroke="{c["text"]}" stroke-width="6"/><path d="M{A[0]} {A[1]}L{C[0]:.2f} {C[1]:.2f}" stroke="{c["byr"]}" stroke-width="6"/><path d="M{B[0]} {B[1]}L{C[0]:.2f} {C[1]:.2f}" stroke="{c["byb"]}" stroke-width="6"/>
<g font-family="IBM Plex Mono" font-size="16" fill="{c["text"]}"><text x="{A[0]-24}" y="{A[1]+8}">A</text><text x="{B[0]+12}" y="{B[1]+8}">B</text><text x="{C[0]-6:.0f}" y="{C[1]-12:.0f}">C</text></g></svg>'''
def byrne_i47(w=320):
    c=T.C;A=(120,200);B=(220,200);Cp=(120,120)
    sqa=f"M120 200L220 200L220 300L120 300Z";sqb=f"M120 200L120 120L40 120L40 200Z";sqc=f"M120 120L220 200L300 100L200 20Z"
    return f'''<svg viewBox="0 0 320 320" width="{w}" role="img" aria-label="Euclid I.47 in Byrne colors: squares on the sides of a right triangle"><title>Elements I.47 after Byrne</title>
<path d="{sqa}" fill="{c["byy"]}"/><path d="{sqb}" fill="{c["byr"]}"/><path d="{sqc}" fill="{c["byb"]}"/><path d="M120 200L220 200L120 120Z" fill="{c["surf"]}" stroke="{c["text"]}" stroke-width="3"/>
<rect x="120" y="184" width="16" height="16" fill="none" stroke="{c["text"]}" stroke-width="2"/></svg>'''
def shapes_bg(seed=7,count=14,w=1440,h=900):
    import random
    rnd=random.Random(seed);cols=[T.C["red"],T.C["yel"],T.C["pblue"],T.C["knob"],T.SQ["green"],T.SQ["pink"]];out=[]
    for k in range(count):
        x=rnd.randrange(0,w//48)*48;y=rnd.randrange(0,h//48)*48;s=rnd.choice([16,24,32]);col=cols[k%len(cols)];t=k%4
        if t==0: out.append(f'<circle cx="{x}" cy="{y}" r="{s//2}" fill="{col}"/>')
        elif t==1: out.append(f'<rect x="{x}" y="{y}" width="{s}" height="{s}" fill="{col}"/>')
        elif t==2: out.append(f'<path d="M{x} {y+s}L{x+s//2} {y}L{x+s} {y+s}Z" fill="{col}"/>')
        else: out.append(f'<path d="M{x} {y+8}q8 -16 16 0t16 0t16 0" fill="none" stroke="{col}" stroke-width="6" stroke-linecap="round"/>')
    return f'<svg class="shapes" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="opacity:.55">{"".join(out)}</svg>'
def lang_strip(limit=None):
    s,att=DATA.strip();s=s[:limit] if limit else s
    items="".join(f'<li><span class="w" lang="{x["code"]}" dir="{"rtl" if x["code"] in ("ar","he","fa") else "ltr"}">{E(x["word"])}</span><span class="c">{x["code"]} · {E(x["name"])}</span><span class="c">{E(x["concept"])}</span></li>' for x in s)
    return f'<ul class="lang" aria-label="{len(s)} languages">{items}</ul><p class="credit" style="margin-top:var(--s2)">{len(s)} of 35 languages, from the Polingual starter set. {E(att["data"])}, {E(att["license"])}. <a href="{att["wiktionary_url"]}">Wiktionary</a></p>'
def canon_index():
    rows="".join(f'<li><span class="num">{b["n"]}</span><span class="nm">{E(b["name"])}</span><span class="small muted">{E(", ".join(b["queries"][:3]))}</span><span class="mono small muted">{E(" ".join(b["arxiv"]))}</span></li>' for b in DATA.branches()[:7])
    return f'<ol class="idx" aria-label="Seven branches">{rows}</ol>'
def landing():
    s,_=DATA.strip()
    hero=f'''<section class="wrap" style="padding-top:var(--s9);padding-bottom:var(--s9)"><div class="g16" style="row-gap:var(--s6);align-items:end">
<div style="grid-column:span 9" class="stack"><p class="kick">Bucket Foundation · canon and Polingual</p><h1 class="d1">Every foundation in every script, indexed.</h1>
<p style="max-width:560px" class="muted">Seven branches of first principles and {len(s)} languages, set as one index. Free to read. Each citation pays its author once.</p>
<div class="row" style="margin-top:var(--s3)"><a class="btn" href="grid2-canon-search.html">Open the canon</a><a class="btn ghost" href="grid2-study-young.html">Study a word</a></div></div>
<div style="grid-column:span 7;position:relative" class="s-hero"><div style="background:var(--surf);padding:var(--s6);position:relative">{M.mho_prim(True,size=None)}<span class="sr">Primitive alternate mark</span></div>
<div class="row" style="position:absolute;right:0;bottom:-24px;gap:0"><span class="sq" style="width:48px;height:48px"></span><span class="sq y" style="width:48px;height:48px"></span><span class="sq k" style="width:48px;height:48px"></span></div></div></div></section>'''
    langs=f'<section class="wrap" style="padding-bottom:var(--s9)"><div class="row" style="justify-content:space-between;margin-bottom:var(--s4)"><h2 class="d2">One word, {len(s)} scripts</h2><p class="kick">Polingual</p></div>{lang_strip()}</section>'
    idx=f'<section class="wrap" style="padding-bottom:var(--s9)"><div class="row" style="justify-content:space-between;margin-bottom:var(--s4)"><h2 class="d2">Seven branches</h2><p class="kick">Canon index</p></div><div class="rule"></div>{canon_index()}</section>'
    prop=f'''<section style="background:var(--surf);padding:var(--s9) 0"><div class="wrap prop"><div class="stack"><p class="kick">Proposition I.1</p><!-- voice-ignore-line --><h2 class="d2">On a given finite straight line, construct an equilateral triangle.</h2>
<div class="proof"><ol><li>With centre A and distance AB, draw the circle BCD. Postulate 3.</li><li>With centre B and distance BA, draw the circle ACE. Postulate 3.</li><li>From C, where the circles cut, join CA and CB. Postulate 1.</li><li>CA equals AB and CB equals BA, so all three sides are equal. Common notion 1.</li></ol></div>
<p class="credit">Figure drawn in code after Oliver Byrne, The First Six Books of the Elements of Euclid, 1847, public domain. <a href="https://archive.org/details/firstsixbooksofe00eucl">archive.org</a></p></div><figure style="justify-self:center">{byrne_i1(320)}</figure></div></section>'''
    page("landing","Bucket, Grid-Primitive landing",site_header()+"<main>"+hero+langs+idx+prop+"</main>"+site_footer())
def canon_search():
    res=[("04.01","A Mathematical Theory of Communication","Claude E. Shannon","1948","Bell System Technical Journal 27","H = −Σ p log p"),
         ("04.02","Irreversibility and Heat Generation in the Computing Process","Rolf Landauer","1961","IBM Journal of Research and Development 5","kT ln 2 per erased bit"),
         ("02.07","Über eine von den Grundfragen der Wärmetheorie","Ludwig Boltzmann","1877","Wiener Berichte 76","S = k log W"),
         ("04.03","Information Theory and Statistical Mechanics","Edwin T. Jaynes","1957","Physical Review 106","maximum entropy inference"),
         ("02.08","Über verschiedene für die Anwendung bequeme Formen der Hauptgleichungen","Rudolf Clausius","1865","Annalen der Physik 201","dS = δQ / T")]
    rows="".join(f'''<li style="display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:var(--s4);padding:var(--s4) 0;border-bottom:1px solid var(--line)"><span class="num">{n}</span><div class="stack" style="gap:var(--s1)"><a href="grid2-math.html" class="h3" style="color:var(--text);text-decoration:none">{E(t)}</a><span class="small muted">{E(a)}, {y}. {E(j)}</span><span class="mono small">{E(f)}</span></div><button class="btn sm ghost s-hide">Cite</button></li>''' for n,t,a,y,j,f in res)
    chips="".join(f'<button class="chip" aria-pressed="{"true" if b["n"] in ("02","04") else "false"}">{b["n"]} {E(b["name"])}</button>' for b in DATA.branches()[:7])
    body=f'''<div class="top"><div class="grow"><p class="kick">Canon</p><h1 class="d2">Search</h1></div><span class="mono small muted s-hide">5 results · 0.04 s</span></div>
<form role="search" class="stack" onsubmit="return false"><label class="f"><span>Search the canon</span><input class="inp" value="entropy" aria-label="Query"></label><div class="row" aria-label="Branches">{chips}</div></form>
<ol style="margin-top:var(--s5)" aria-label="Results">{rows}</ol><p class="credit" style="margin-top:var(--s4)">Citations to the original publications. Numbers are canon branch and position.</p>'''
    page("canon-search","Canon search, Grid-Primitive",app_shell("canon",body))
def app_learn():
    br=DATA.branches()[:7];prog=[62,48,20,71,84,12,35];shapes=["sq","sq k","tri","sq b","sq y","sq k","sq"]
    tiles="".join(f'''<a href="grid2-study.html" class="card stack" style="grid-column:span 4;text-decoration:none;color:var(--text);gap:var(--s3)"><div class="row" style="justify-content:space-between"><span class="num">{b["n"]}</span><span class="{shapes[i]}"></span></div><span class="h3">{E(b["name"])}</span><div class="prog" aria-label="{prog[i]} percent"><i style="width:{prog[i]}%"></i></div><span class="small muted">{prog[i]}% mastered{" · pilot" if b["pilot"] else ""}</span></a>''' for i,b in enumerate(br))
    body=f'''<div class="top"><div class="grow"><p class="kick">Learn</p><h1 class="d2">Today</h1></div><a class="btn" href="grid2-study.html">Study 12 due</a></div>
<div class="g16" style="row-gap:var(--s5);margin-bottom:var(--s7)"><div class="card" style="grid-column:span 16;display:flex;gap:var(--s6);flex-wrap:wrap;align-items:center;background:var(--ink);color:var(--onink)"><div class="stack grow" style="gap:var(--s1)"><span class="kick" style="color:var(--inkmuted)">Next atom</span><span class="h3">Landauer's principle bounds the heat of erasing one bit.</span></div><a class="btn" href="grid2-study.html">Continue</a></div>{tiles}
<a href="grid2-study-young.html" class="card stack" style="grid-column:span 4;text-decoration:none;color:var(--text);gap:var(--s3);box-shadow:inset 0 0 0 2px var(--text)"><div class="row" style="justify-content:space-between"><span class="num">Ω</span><span class="sq k"></span></div><span class="h3">Polingual</span><span class="w" lang="el" style="font-size:24px;line-height:32px">φως · свет · प्रकाश</span><span class="small muted">27 languages</span></a></div>'''
    page("app-learn","Learn, Grid-Primitive",app_shell("learn",body))
def study():
    body=f'''<div class="top"><div class="grow"><p class="kick">04 Information · deck study</p><h1 class="d2">New atom</h1></div><span class="mono small muted">3 of 12</span></div>
<div class="flow" aria-label="Frozen flow"><span>1 New atom</span><span>2 Show answer</span><span aria-current="step">3 Grade</span><span>4 Next card</span></div>
<div class="g16" style="margin-top:var(--s5);row-gap:var(--s5)"><article class="card stack" style="grid-column:span 10;gap:var(--s5);border-top:4px solid var(--ink)">
<div class="row" style="justify-content:space-between"><span class="num">04.02</span><span class="sq k" aria-hidden="true"></span></div>
<h2 class="h3" style="font-size:28px;line-height:36px;font-weight:300">What does Landauer's principle bound?</h2><div class="hair"></div>
<div class="stack" style="gap:var(--s2)"><p class="kick">Answer</p><p>The least heat a computer must give off to erase one bit: kT ln 2, about 2.9 × 10⁻²¹ J at 300 K.</p><p class="credit">Rolf Landauer, IBM Journal of Research and Development 5, 1961</p></div>
<div class="grade" role="group" aria-label="Grade" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s2)"><button class="btn sm ghost r1">Again</button><button class="btn sm ghost r2">Hard</button><button class="btn sm r3">Good</button><button class="btn sm ink r4">Easy</button></div></article>
<aside class="stack" style="grid-column:span 6"><figure class="card stack">{byrne_i1(240)}<figcaption class="credit">Byrne colors mark each idea in the proof column: red, yellow, blue.</figcaption></figure><div class="card stack" style="gap:var(--s2)"><p class="kick">Schedule</p><p class="mono small">Again 1 m · Hard 6 m · Good 1 d · Easy 4 d</p></div></aside></div>'''
    page("study","Study card, Grid-Primitive register",app_shell("learn",body))
def study_young():
    c=DATA.card("el");s,att=DATA.strip()
    others=[x for x in s if x["concept"]=="light" and x["code"] in ("ru","hi","he","ja")]
    chips="".join(f'<li class="card" style="padding:var(--s3);display:flex;flex-direction:column;gap:0"><span lang="{x["code"]}" dir="{"rtl" if x["code"]=="he" else "ltr"}" style="font:700 24px/32px var(--young)">{E(x["word"])}</span><span class="small" style="color:var(--sq-muted)">{E(x["name"])}</span></li>' for x in others)
    body=f'''<div style="position:relative">{shapes_bg(11,12)}<div style="position:relative" class="stack">
<div class="row" style="justify-content:space-between"><div class="row"><span class="yb white" style="min-height:40px;padding:var(--s2) var(--s3);font-size:14px"><span class="sq k" aria-hidden="true"></span>14 days</span><span class="yb white s-hide" style="min-height:40px;padding:var(--s2) var(--s3);font-size:14px">1,240 XP</span></div><span style="font:700 14px/20px var(--young);color:var(--sq-muted)">Word 3 of 10</span></div>
<div style="height:16px;border-radius:8px;background:var(--sq-line);overflow:hidden"><i style="display:block;height:100%;width:30%;background:var(--sq-green);border-radius:8px"></i></div>
<div class="flow" aria-label="Frozen flow"><span>1 New word</span><span aria-current="step">2 Show answer</span><span>3 Grade</span></div>
<article class="card stack" style="padding:var(--s7) var(--s5);align-items:center;text-align:center;gap:var(--s4);position:relative">
<span style="position:absolute;top:16px;left:16px;width:24px;height:24px;background:var(--red)"></span><span style="position:absolute;top:16px;right:16px;width:24px;height:24px;border-radius:50%;background:var(--knob)"></span>
<p style="font:700 14px/20px var(--young);text-transform:uppercase;letter-spacing:.08em;color:var(--sq-muted)">Greek · noun</p>
<p lang="el" style="font:700 80px/88px var(--young)">{E(c["word"])}</p><p class="mono" style="color:var(--sq-muted)">/{E(c["ipa"])}/</p>
<button class="yb block" style="max-width:360px">Show answer</button></article>
<p style="font:800 16px/24px Nunito,sans-serif">Same idea, more scripts</p><ul style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s3)" class="ylangs">{chips}</ul>
<p class="credit">{E(att["credit"])}</p></div></div>'''
    head="<style>@media (max-width:900px){.ylangs{grid-template-columns:repeat(2,minmax(0,1fr))!important}}</style>"
    page("study-young","Study card, young-learner register",app_shell("learn",body,True),young=True,head=head)
def review():
    q=[("04.02","Landauer's principle","1 d","Good"),("02.07","Boltzmann entropy","3 d","due"),("el","φως · light","10 m","due"),("01.03","Euclid I.1","2 d","due"),("ru","свет · light","1 h","new"),("05.11","Protein folding funnel","4 d","new")]
    rows="".join(f'<li style="display:grid;grid-template-columns:64px minmax(0,1fr) 64px 72px;gap:var(--s3);padding:var(--s3) 0;border-bottom:1px solid var(--line);align-items:center"><span class="num">{E(a)}</span><span>{E(b)}</span><span class="mono small muted">{c}</span><span class="small" style="justify-self:end;{"color:var(--redt)" if d=="due" else ""}">{d}</span></li>' for a,b,c,d in q)
    stats="".join(f'<div class="card stack" style="grid-column:span 4;gap:0"><span class="kick">{k}</span><span style="font:300 40px/48px var(--body)">{v}</span></div>' for k,v in (("Due",3),("New",2),("Graded today",1),("Retention","91%")))
    body=f'''<div class="top"><div class="grow"><p class="kick">Review</p><h1 class="d2">Queue</h1></div><a class="btn" href="grid2-study.html">Start review</a></div>
<div class="g16" style="row-gap:var(--s4);margin-bottom:var(--s6)">{stats}</div><div class="rule"></div><ol aria-label="Queue">{rows}</ol><p class="credit" style="margin-top:var(--s3)">Intervals from FSRS-5.</p>'''
    page("review","Review, Grid-Primitive",app_shell("review",body))
def quiz():
    s,att=DATA.strip();pick={x["code"]:x for x in s}
    opts=[("el","φως",True),("he","נגה",False),("hi","प्रकाश",False),("ja","明かり",False)]
    o="".join(f'<button class="opt card" aria-pressed="{"true" if ok else "false"}" style="display:flex;align-items:center;gap:var(--s4);border:0;text-align:left;cursor:pointer;min-height:64px;{"box-shadow:inset 0 0 0 3px var(--ink)" if ok else "box-shadow:inset 0 0 0 1px var(--line)"}"><span class="num">{chr(65+i)}</span><span lang="{c}" style="font:400 28px/36px var(--body)">{w}</span><span class="small muted" style="margin-left:auto">{E(pick[c]["name"])}</span>{"<span class=\"sq k\" aria-label=\"selected\"></span>" if ok else ""}</button>' for i,(c,w,ok) in enumerate(opts))
    body=f'''<div class="top"><div class="grow"><p class="kick">Polingual quiz</p><h1 class="d2">Which one is Greek?</h1></div><span class="mono small muted">Q 4 of 10</span></div>
<p class="muted" style="margin-bottom:var(--s4)">All four mean light.</p><div class="stack" style="gap:var(--s3);max-width:720px" role="group" aria-label="Choices">{o}</div>
<div class="row" style="margin-top:var(--s5);max-width:720px;justify-content:space-between"><span class="small">Correct: φως, /ˈfos/.</span><button class="btn">Next</button></div><p class="credit" style="margin-top:var(--s4)">{E(att["credit"])}</p>'''
    page("quiz","Quiz, Grid-Primitive",app_shell("learn",body))
def progress():
    br=DATA.branches()[:7];pr=[62,48,20,71,84,12,35]
    bars="".join(f'<li style="display:grid;grid-template-columns:32px minmax(0,160px) minmax(0,1fr) 48px;gap:var(--s3);align-items:center;padding:var(--s2) 0"><span class="num">{b["n"]}</span><span class="small">{E(b["name"])}</span><div class="prog"><i style="width:{p}%"></i></div><span class="mono small" style="text-align:right">{p}%</span></li>' for b,p in zip(br,pr))
    import random;r=random.Random(3)
    cal="".join(f'<i class="l{r.choice([0,0,1,1,2,3])}"></i>' for _ in range(182))
    langs=[("el","φως",64),("ru","свет",38),("he","נגה",22),("hi","प्रकाश",17)]
    lb="".join(f'<li style="display:grid;grid-template-columns:96px minmax(0,1fr) 48px;gap:var(--s3);align-items:center;padding:var(--s2) 0"><span lang="{c}" style="font-size:20px;line-height:28px">{w}</span><div class="prog"><i style="width:{p}%;background:var(--pblue)"></i></div><span class="mono small" style="text-align:right">{p}%</span></li>' for c,w,p in langs)
    body=f'''<div class="top"><div class="grow"><p class="kick">Progress</p><h1 class="d2">Mastery</h1></div><span class="mono small muted s-hide">M = proficiency^α · retention^β</span></div>
<div class="g16" style="row-gap:var(--s5)"><section class="card" style="grid-column:span 9"><p class="kick" style="margin-bottom:var(--s3)">Branches</p><ol>{bars}</ol></section>
<section class="card" style="grid-column:span 7"><p class="kick" style="margin-bottom:var(--s3)">Languages</p><ol>{lb}</ol></section>
<section class="card" style="grid-column:span 16;overflow:hidden"><p class="kick" style="margin-bottom:var(--s3)">26 weeks</p><div class="cal" aria-label="Study days">{cal}</div></section></div>'''
    page("progress","Progress, Grid-Primitive",app_shell("progress",body))
def settings():
    s,_=DATA.strip()
    langs="".join(f'<button class="chip" aria-pressed="{"true" if x["code"] in ("el","ru","he","hi","la") else "false"}" lang="{x["code"]}">{E(x["name"])}</button>' for x in s)
    def seg(label,opts,on): return f'<div class="stack" style="gap:var(--s2)"><span class="small" style="font-weight:600">{label}</span><div class="row" style="gap:0" role="radiogroup" aria-label="{label}">'+"".join(f'<button class="chip" role="radio" aria-checked="{"true" if o==on else "false"}" aria-pressed="{"true" if o==on else "false"}">{o}</button>' for o in opts)+'</div></div>'
    body=f'''<div class="top"><div class="grow"><p class="kick">Settings</p><h1 class="d2">Preferences</h1></div></div>
<div class="g16" style="row-gap:var(--s5)"><section class="card stack" style="grid-column:span 8"><p class="kick">Look</p>{seg("Study register",["Standard","Young learner"],"Standard")}{seg("Background texture",["None","Girih"],"None")}{seg("Motion",["Full","Reduced"],"Full")}<div class="row"><span class="sq k"></span><span class="small muted">Young learner switches Polingual study to the Squiggle and Primitive register. Flows stay the same.</span></div></section>
<section class="card stack" style="grid-column:span 8"><p class="kick">Account</p><label class="f">Email<input class="inp" value="ada@example.org"></label><label class="f">Daily goal<input class="inp" value="20 cards"></label><button class="btn ghost" style="align-self:flex-start">Sign out</button></section>
<section class="card stack" style="grid-column:span 16"><p class="kick">Languages, 5 of {len(s)}</p><div class="row" style="gap:var(--s2)">{langs}</div></section></div>'''
    page("settings","Settings, Grid-Primitive",app_shell("settings",body))
def signin():
    body=f'''{site_header()}<main class="wrap" style="padding-top:var(--s9);padding-bottom:var(--s9)"><div class="g16" style="row-gap:var(--s6)">
<section class="stack" style="grid-column:span 7;gap:var(--s5)"><p class="kick">Sign in</p><h1 class="d1">One code. No password.</h1><p class="muted">We send a six-digit code to your email. It works for ten minutes.</p>
<form class="stack" onsubmit="return false"><label class="f">Email<input class="inp" type="email" autocomplete="email" placeholder="you@example.org"></label><button class="btn block">Send code</button></form>
<p class="small muted">New here? The same code creates your account.</p></section>
<div style="grid-column:10 / span 7" class="s-hide"><div style="background:var(--surf);padding:var(--s7)">{M.construction()}</div><p class="credit" style="margin-top:var(--s2)">The mark on its 32-unit lattice.</p></div></div></main>'''
    page("signin","Sign in, Grid-Primitive",body)
def math_page():
    head=f'<link rel="stylesheet" href="{KATEX}katex.min.css"><script defer src="{KATEX}katex.min.js"></script><script defer src="{KATEX}contrib/auto-render.min.js" onload="renderMathInElement(document.body,{{delimiters:[{{left:\'$$\',right:\'$$\',display:true}},{{left:\'\\\\(\',right:\'\\\\)\',display:false}}]}})"></script><style>.katex{{font-size:1.1em}}.katex-display{{overflow-x:auto;overflow-y:hidden;padding:var(--s2) 0}}</style>'
    body=f'''<div class="top"><div class="grow"><p class="kick">01 Mathematics · Elements I</p><h1 class="d2">Proposition 47</h1></div><a class="btn ghost sm" href="grid2-canon-search.html">Cite</a></div>
<div class="prop"><div class="stack" style="gap:var(--s5)"><p style="font:300 24px/32px var(--body)">In right-angled triangles the square on the side subtending the right angle equals the squares on the sides containing it.</p>
$$\\textcolor{{#1F4E9C}}{{c^2}} = \\textcolor{{#C8331F}}{{a^2}} + \\textcolor{{#B07C00}}{{b^2}}$$
<div class="proof"><ol><li>Square the hypotenuse, blue, and each leg: red and yellow. I.46.</li><li>Drop the perpendicular from the right angle; it splits the blue square in two rectangles.</li><li>Each rectangle equals the square on the nearer leg, since \\(\\triangle ABD \\cong \\triangle FBC\\). I.4, I.41.</li><li>Sum both: \\(c^2 = a^2 + b^2\\). Common notion 2.</li></ol></div>
<p class="credit">Figure after Oliver Byrne, The First Six Books of the Elements of Euclid, 1847, plate for I.47, public domain. <a href="https://archive.org/details/firstsixbooksofe00eucl">archive.org</a>. Set in KaTeX 0.16.9.</p></div>
<figure class="card" style="justify-self:center">{byrne_i47(320)}</figure></div>'''
    page("math","Math page, Grid-Primitive",app_shell("canon",body),head=head)
BADGES=[("01","Mathematics","sq"),("02","Physics","sq k"),("03","Chemistry","tri"),("04","Information","sq b"),("05","Biophysics","sq y"),("06","Cosmology","sq k"),("07","Mind","sq")]
def game():
    days="".join(f'<li style="display:flex;flex-direction:column;align-items:center;gap:var(--s1)"><span style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font:700 16px/24px var(--young);{"background:var(--knob);color:var(--onknob)" if k<6 else "background:var(--sq-surf);box-shadow:inset 0 0 0 2px var(--sq-line)"}">{"✓" if k<6 else ""}</span><span class="small">{d}</span></li>' for k,d in enumerate("MTWTFSS"))
    badges="".join(f'<li class="card" style="display:flex;flex-direction:column;align-items:center;gap:var(--s2);padding:var(--s4)"><span class="{c}" style="transform:scale(2.5);margin:var(--s4);{"" if i<4 else "opacity:.35"}"></span><span style="font:700 14px/20px var(--young)">{n}</span><span class="small" style="color:var(--sq-muted)">{"Earned" if i<4 else "Locked"}</span></li>' for i,(k,n,c) in enumerate(BADGES))
    burst="".join(f'<span style="position:absolute;left:{50+44*math.cos(a):.1f}%;top:{50+40*math.sin(a):.1f}%;width:16px;height:16px;{st};animation:pop 900ms {i*60}ms cubic-bezier(0.34,1.56,0.64,1) both"></span>' for i,(a,st) in enumerate([(2*math.pi*k/12,["background:var(--red)","background:var(--yel);border-radius:50%","background:var(--sq-green);transform:rotate(45deg)","background:var(--knob);border-radius:50%"][k%4]) for k in range(12)]))
    body=f'''<div class="stack" style="gap:var(--s6)"><div class="row" style="justify-content:space-between"><h1 style="font:700 40px/48px var(--young)">Your streak</h1><span class="yb knob" style="min-height:40px;padding:var(--s2) var(--s4);font-size:16px">Level 6</span></div>
<div class="g16" style="row-gap:var(--s5)"><section class="card stack" style="grid-column:span 8;align-items:center;text-align:center;position:relative;overflow:hidden;padding:var(--s8) var(--s5)">{burst}
<p style="font:700 96px/96px var(--young);color:var(--sq-text)">14</p><p style="font:800 20px/28px Nunito,sans-serif">days in a row</p><button class="yb">Keep it going</button></section>
<section class="stack" style="grid-column:span 8;gap:var(--s4)"><div class="card stack"><div class="row" style="justify-content:space-between"><span style="font:700 20px/28px var(--young)">1,240 XP</span><span class="small" style="color:var(--sq-muted)">260 to level 7</span></div><div style="height:20px;border-radius:10px;background:var(--sq-line);overflow:hidden"><i style="display:block;height:100%;width:83%;background:var(--sq-gold)"></i></div></div>
<div class="card"><ul style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--s1)">{days}</ul></div>
<div class="card stack" style="background:var(--ink);color:var(--onink);border-color:var(--ink)"><p style="font:700 20px/28px var(--young)">Lesson complete</p><p class="small" style="color:var(--inkmuted)">10 words · 9 right · +40 XP</p><button class="yb pink" style="align-self:flex-start">Claim reward</button></div></section></div>
<section><p style="font:800 16px/24px Nunito,sans-serif;margin-bottom:var(--s3)">Branch badges</p><ul style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--s3)" class="badges">{badges}</ul></section></div>'''
    head="<style>@keyframes pop{0%{opacity:0;scale:.2}60%{opacity:1;scale:1.2}100%{opacity:1;scale:1}}@media (max-width:900px){.badges{grid-template-columns:repeat(2,minmax(0,1fr))!important}}</style>"
    page("game","Gamification, young-learner register",app_shell("progress",body,True),young=True,head=head)
def motion():
    p,info=M.omega()
    cells="".join(f'<rect x="{x}" y="{y}" width="32" height="32" fill="var(--ink)" style="animation:cell 2.4s {((x+y)//32)*80}ms var(--step) infinite alternate"/>' for x in range(0,256,32) for y in range(0,256,32) if (x//32+y//32)%3==0)
    tile=M.girih_tile(64,"#161616",.3)
    svg=f'''<svg viewBox="0 0 256 256" width="100%" role="img" aria-label="The mark assembling on its lattice"><title>Grid-Primitive motion</title><defs><clipPath id="wipe"><rect x="0" y="0" width="256" height="256" style="animation:wipe 2.4s var(--ease) infinite alternate"/></clipPath><pattern id="gp" width="64" height="64" patternUnits="userSpaceOnUse">{tile}</pattern></defs>
<g style="transform-origin:128px 128px;animation:turn 4.8s var(--ease) infinite"><rect width="256" height="256" fill="url(#gp)"/></g><g opacity=".12">{cells}</g>
<path d="{p}" fill="var(--ink)" clip-path="url(#wipe)"/><g style="transform-origin:128px 152px;animation:knob 2.4s var(--step) infinite alternate">{M.knob(128,152,24)}</g><rect x="144" y="136" width="32" height="32" fill="var(--red)" style="animation:note 2.4s var(--step) infinite alternate"/></svg>'''
    css="<style>@keyframes wipe{0%{transform:translateY(256px)}70%,100%{transform:translateY(0)}}@keyframes cell{0%{opacity:0}100%{opacity:1}}@keyframes turn{0%,40%{transform:rotate(0)}60%,100%{transform:rotate(45deg)}}@keyframes knob{0%{transform:rotate(-135deg)}100%{transform:rotate(135deg)}}@keyframes note{0%{transform:translate(-32px,32px)}100%{transform:translate(0,0)}}.paused *{animation-play-state:paused!important}</style>"
    js="<script>document.getElementById('pp').addEventListener('click',function(){var s=document.getElementById('stage');var p=s.classList.toggle('paused');this.textContent=p?'Play':'Pause';this.setAttribute('aria-pressed',p)})</script>"
    spec="".join(f'<li style="display:grid;grid-template-columns:120px minmax(0,1fr);gap:var(--s3);padding:var(--s2) 0;border-bottom:1px solid var(--line)"><span class="mono small">{a}</span><span class="small">{b}</span></li>' for a,b in (("Lattice","steps(4) on an 80 ms diagonal stagger, Primitive's stepped state"),("℧ wipe","cubic-bezier(0.2,0,0.38,0.9), Carbon productive, 2.4 s"),("Knob","−135° to 135° in four steps, the Teenage Engineering dial"),("Girih","the texture turns 45° and rests, Girih's reveal"),("Reduced","prefers-reduced-motion shows the final frame")))
    body=f'''<div class="top"><div class="grow"><p class="kick">Motion</p><h1 class="d2">Assemble</h1></div><button class="btn sm ghost" id="pp" aria-pressed="false">Pause</button></div>
<div class="g16" style="row-gap:var(--s5)"><div id="stage" class="card" style="grid-column:span 8">{svg}</div><ul style="grid-column:span 8">{spec}</ul></div>'''
    page("motion","Motion, Grid-Primitive",app_shell("learn",body),head=css)
    f=os.path.join(SCREENS,"grid2-motion.html");s=open(f,encoding="utf-8").read().replace("</body>",js+"</body>");open(f,"w",encoding="utf-8").write(s)
def marks():
    def tile(svg,label,note,bg="var(--surf)"):
        return f'<figure class="stack" style="grid-column:span 4;gap:var(--s2)"><div style="background:{bg};padding:var(--s5);aspect-ratio:1">{svg}</div><figcaption><span class="small" style="font-weight:600">{label}</span><br><span class="small muted">{note}</span></figcaption></figure>'
    sizes="".join(f'<div class="stack" style="align-items:center;gap:var(--s1)">{M.mho_grid(size=s)}<span class="mono small muted">{s}</span></div>' for s in (16,24,32,48,64))
    body=f'''<div class="top"><div class="grow"><p class="kick">Marks</p><h1 class="d2">℧ and b</h1></div></div>
<div class="g16" style="row-gap:var(--s6)">{tile(M.mho_grid(),"Grid ℧, refined","Wider neck, heavier slab. The red square sits one half module off axis, a hand-placed note on the 32-unit lattice.")}
{tile(M.b_grid(),"Grid b","Stem and bowl on the lattice. One square corner where bowl meets stem; the others turn on 56-unit arcs.")}
{tile(M.construction(),"Construction","32-unit lattice, bowl ellipses, integer coordinates.")}
{tile(M.mho_prim(True),"Primitive ℧ with the knob","The gold dot of the live InverseOmega, drawn as Teenage Engineering's orange knob: Bucket as an instrument you play.",bg="var(--surf2)")}
{tile(M.mho_prim(False),"Primitive ℧ without the dot","The alternate mark inside Grid-Primitive.",bg="var(--surf2)")}
{tile(M.mho_wedge(),"Wedge ℧, accent","The diagonal cut in brushed metal, a tool through a map. Accent only.")}
{tile(M.b_solar(),"Solarpunk b","The same cut through the b, with a green sun. Accent only.")}
{tile('<div style="width:100%;height:100%;background-image:url(../assets/grid2/marks/girih.svg);background-size:64px"></div>',"Girih texture","An 8-fold khatam star on a 64-unit tile, at 14% ink.",bg="var(--bg)")}
{tile(f'<div style="width:100%;height:100%;display:grid;place-items:center;background:var(--ink)">{M.mho_grid(fg="#F2F0EB",size=128)}</div>',"Reversed","Paper on ink.")}</div>
<section style="margin-top:var(--s7)"><p class="kick" style="margin-bottom:var(--s3)">Sizes</p><div class="row" style="gap:var(--s6);align-items:flex-end">{sizes}</div></section>
<p class="credit" style="margin-top:var(--s5)">Wedge ℧ outline from Noto Serif Ω, SIL Open Font License. All other marks are code geometry.</p>'''
    page("marks","Marks, Grid-Primitive",app_shell("settings",body))
def dot_pair():
    body=f'''<main class="wrap" style="padding:var(--s8) var(--s4)"><p class="kick">Primitive dot</p><h1 class="d2" style="margin-bottom:var(--s5)">With the knob, without it</h1>
<div class="g16" style="row-gap:var(--s5)"><figure style="grid-column:span 8" class="stack"><div style="background:var(--surf2);padding:var(--s7)">{M.mho_prim(True)}</div><figcaption class="small">With: the knob carries the gold dot of the live ℧.</figcaption></figure>
<figure style="grid-column:span 8" class="stack"><div style="background:var(--surf2);padding:var(--s7)">{M.mho_prim(False)}</div><figcaption class="small">Without: the alternate for small sizes and dense headers.</figcaption></figure></div></main>'''
    page("dot-pair","Primitive dot pair",body)
def texture():
    body=f'''{site_header()}<main><section class="wrap" style="padding-top:var(--s9);padding-bottom:var(--s9)"><div class="g16" style="row-gap:var(--s6);align-items:center">
<div class="stack" style="grid-column:span 8;gap:var(--s4)"><p class="kick">Texture option</p><h1 class="d1">Few axioms. Every pattern.</h1><p class="muted" style="max-width:520px">Girih's 8-fold star tiles the page background at 14% ink. It is off by default and switches on in Settings.</p><a class="btn" href="grid2-settings.html" style="align-self:flex-start">Texture settings</a></div>
<div style="grid-column:span 8;background:var(--surf);padding:var(--s6)">{M.girih_svg(64,"#161616",.9).replace('width="64" height="64"','width="100%"')}<p class="credit" style="margin-top:var(--s2)">One tile: {"{"}8/3{"}"} star in an octagon, compass and straightedge after Eric Broug, Islamic Geometric Patterns, 2008.</p></div></div></section></main>{site_footer()}'''
    page("texture","Girih texture, Grid-Primitive",body,texture=True)
def build():
    os.makedirs(SCREENS,exist_ok=True);os.makedirs(ASSETS,exist_ok=True)
    M.write_assets(os.path.join(ASSETS,"marks"))
    open(os.path.join(ASSETS,"grid2.css"),"w",encoding="utf-8").write(CSS)
    for f in (landing,canon_search,app_learn,study,study_young,review,quiz,progress,settings,signin,math_page,game,motion,marks,dot_pair,texture): f()
if __name__=="__main__": build();print("built")
