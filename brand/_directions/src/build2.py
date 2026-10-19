import json,os,math,glob,html as H
from lib import D,glyph,wordmark,pairs,gear,cr
from paths import SRC_DIR,BRAND_DIR
MADE=json.load(open(SRC_DIR+'/made.json'))
from logos import MARKS,svgm,lockup,mho,construction,vessel,mascot,MASCOT,MOTION
B=BRAND_DIR+"/"; DD=B+"_directions/"
os.makedirs(DD+"screens",exist_ok=True); os.makedirs(DD+"icons",exist_ok=True)

G24={
"home":"M12 2 2 10.5V22h7v-6h6v6h7V10.5Z",
"search":"M10 2a8 8 0 1 0 0 16a8 8 0 1 0 0-16ZM10 5a5 5 0 1 1 0 10a5 5 0 1 1 0-10ZM15.4 17.5l2.1-2.1 4.5 4.5-2.1 2.1Z",
"library":"M2 3h5v18H2ZM9 5h5v16H9ZM15 5.2l4.4-1.2 3.6 16.4-4.4 1.2ZM3.5 6v2h2V6ZM10.5 8v2h2V8Z",
"cards":"M7 2h15v14h-2V4H7ZM2 7h16v15H2Z",
"listen":"M2 9h4l7-6v18l-7-6H2ZM15 8h2v8h-2ZM19 5h2v14h-2Z",
"cite":"M5 2h14v20l-7-5-7 5Z",
"profile":"M12 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11ZM2 22c0-5.5 4.5-8 10-8s10 2.5 10 8Z",
"settings":gear(12,12,10,7.8,8,4.2),
}
PRIM24={
"home":'<path d="M12 2 22 12H2Z" fill="A"/><rect x="5" y="14" width="14" height="8" fill="A"/><rect x="10" y="16" width="4" height="6" fill="B"/>',
"search":'<circle cx="10" cy="10" r="8" fill="A"/><circle cx="10" cy="10" r="4" fill="BG"/><rect x="16" y="16" width="6" height="6" fill="B"/>',
"library":'<rect x="2" y="4" width="9" height="16" fill="A"/><rect x="13" y="4" width="9" height="16" fill="B"/>',
"cards":'<rect x="8" y="2" width="14" height="14" fill="B"/><rect x="2" y="8" width="14" height="14" fill="A"/>',
"listen":'<rect x="2" y="8" width="5" height="8" fill="A"/><path d="M7 8 14 2V22L7 16Z" fill="A"/><circle cx="19" cy="12" r="3" fill="B"/>',
"cite":'<path d="M5 2H19V22L12 16 5 22Z" fill="A"/><circle cx="12" cy="8" r="3" fill="B"/>',
"profile":'<circle cx="12" cy="7" r="5" fill="A"/><path d="M2 22a10 8 0 0 1 20 0Z" fill="B"/>',
"settings":'<rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" fill="A"/><circle cx="12" cy="12" r="4" fill="B"/>',
}
SPEC={
"d7":dict(r=1,grid="Codex 20px grid inside a 24 artboard, filled, 1px corner radius, Greek-key corner on the active state",keylines="sq"),
"d1":dict(r=0,grid="Carbon: 24 artboard, 2px padding, 20px live area, square terminals, 2px counters",keylines="sq"),
"d2":dict(r=1,grid="SF Symbols regular-weight counters at 2px, 1px corner radius, glyph set into a 24px mon roundel with a hairline inner ring",keylines="circle"),
"d3":dict(r=1.5,grid="Duolingo: 24 artboard, 1.5px corner radius on every join, 2px darker lip below each shape",keylines="sq"),
"d4":dict(r=0,grid="Material Symbols Sharp, filled, 24dp with 20dp live area, 0 radius, red corner wedge as the active marker",keylines="m3"),
"d5":dict(r=1.5,grid="Fluent 2 filled 24: 2px padding, 1.5px corner radius, 2px counters, 4-point accent on the keyline corner",keylines="sq"),
"d6":dict(r=0,grid="Circle, square and triangle only on a 2px module, two colors, no curves except full circles",keylines="sq"),
}
def rounded(d,r):
    if r==0: return f'<path fill-rule="evenodd" d="{d}" fill="F"/>'
    s=(20-2*r)/20
    return f'<g transform="translate(12 12) scale({s:.4f}) translate(-12 -12)"><path fill-rule="evenodd" d="{d}" fill="F" stroke="F" stroke-width="{2*r/s:.3f}" stroke-linejoin="round"/></g>'
ROUND={"search":1.04,"profile":1.03,"settings":1.04}
def icon(d,n):
    inner=icon0(d,n);s=ROUND.get(n)
    if n=="listen": inner=f'<g transform="translate(.5 0)">{inner}</g>'
    return f'<g transform="translate(12 12) scale({s}) translate(-12 -12)">{inner}</g>' if s else inner
def icon0(d,n):
    c=d["c"];i=d["id"];r=SPEC[i]["r"]
    if i=="d6":
        inner=PRIM24[n].replace('"A"',f'"{c["text"]}"').replace('"BG"',f'"{c["bg"]}"').replace('"B"','"#1D4ED8"')
    elif i=="d2":
        g=rounded(G24[n],1).replace('"F"',f'"{c["bg"]}"')
        inner=f'<circle cx="12" cy="12" r="12" fill="{c["acc"]}"/><circle cx="12" cy="12" r="11.2" fill="none" stroke="{c["bg"]}" stroke-width=".35"/><g transform="translate(12 12) scale(.74) translate(-12 -12)">{g}</g>'
    elif i=="d3":
        inner=f'<g transform="translate(0 1.5)">{rounded(G24[n],1.5).replace(chr(34)+"F"+chr(34),chr(34)+"#1F5600"+chr(34))}</g>'+rounded(G24[n],1.5).replace('"F"','"#2E7D00"')
        inner=f'<g transform="translate(12 12) scale(.92) translate(-12 -12)">{inner}</g>'
    elif i=="d4":
        inner=f'{rounded(G24[n],0).replace(chr(34)+"F"+chr(34),chr(34)+c["text"]+chr(34))}<path d="M18 22 22 18V22Z" fill="{c["acc"]}"/>'
    elif i=="d5":
        inner=rounded(G24[n],1.5).replace('"F"',f'"{c["text"]}"')+f'<path d="M22 0l.6 1.4L24 2l-1.4.6L22 4l-.6-1.4L20 2l1.4-.6Z" fill="{c["acc"]}"/>'
    else:
        inner=rounded(G24[n],0).replace('"F"',f'"{c["text"]}"')
    return inner
try:
    import icons as _ic
    icon=_ic.icon
except ImportError:
    pass
def svg(inner,px,extra=""): return f'<svg viewBox="0 0 24 24" width="{px}" height="{px}" {extra}>{inner}</svg>'
def overlay(d):
    k=SPEC[d["id"]]["keylines"];m=d["c"]["hl"]
    lines="".join(f'<path d="M{x} 0V24M0 {x}H24" stroke="{m}" stroke-opacity=".18" stroke-width=".05"/>' for x in range(1,24))
    kl=f'<rect x="2" y="2" width="20" height="20" fill="none" stroke="{m}" stroke-width=".12"/><circle cx="12" cy="12" r="10" fill="none" stroke="{m}" stroke-width=".12"/>'
    if k=="m3": kl+=f'<rect x="3" y="3" width="18" height="18" fill="none" stroke="{m}" stroke-width=".12"/><rect x="4" y="2" width="16" height="20" fill="none" stroke="{m}" stroke-width=".12"/><rect x="2" y="4" width="20" height="16" fill="none" stroke="{m}" stroke-width=".12"/>'
    return lines+kl
NAMES=list(G24)

T={
"d1":dict(scale="Carbon productive: 12/16, 14/20, 16/24, 20/28, 32/40, 54/64, 76/84",h1="76px",h1m="42px",lh="1.1",track="-0.02em",heb="IBM Plex Sans Hebrew",f="IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Mono&family=IBM+Plex+Sans+Hebrew:wght@400;600"),
"d2":dict(scale="Perfect fourth 1.333: 14, 18, 24, 32, 42, 56, 75",h1="75px",h1m="42px",lh="1.15",track="0.02em",heb="Frank Ruhl Libre",f="Shippori+Mincho:wght@500;800&family=Zen+Kaku+Gothic+New:wght@400;700&family=Frank+Ruhl+Libre:wght@500;700"),
"d3":dict(scale="Major third 1.25: 15, 19, 24, 30, 37, 47, 58",h1="58px",h1m="37px",lh="1.05",track="0",heb="Rubik",f="Fredoka:wght@500;700&family=Nunito:wght@400;800&family=Rubik:wght@500;700"),
"d4":dict(scale="Golden 1.618: 14, 22, 36, 58, 94, 152",h1="152px",h1m="58px",lh=".86",track="0.01em",heb="Heebo",f="Oswald:wght@500;700&family=Roboto+Flex:opsz,wght@8..144,400;8..144,600&family=Heebo:wght@500;800"),
"d5":dict(scale="Minor third 1.2: 14, 17, 20, 24, 29, 35, 50, 60",h1="60px",h1m="35px",lh="1.15",track="0.01em",heb="Noto Sans Hebrew",f="Reem+Kufi:wght@500;700&family=Noto+Sans:wght@400;600&family=Noto+Sans+Hebrew:wght@400;600"),
"d7":dict(scale="Golden ratio steps on a 4px base: 13, 16, 21, 26, 34, 55, 89",h1="89px",h1m="44px",lh="1.05",track="0.02em",heb="Noto Sans Hebrew",f="GFS+Didot&family=Gentium+Book+Plus:wght@400;700&family=Noto+Sans+Mono&family=Noto+Sans+Hebrew:wght@400;600"),
"d6":dict(scale="Perfect fifth 1.5: 12, 18, 27, 40, 60, 90",h1="90px",h1m="40px",lh=".95",track="-0.03em",heb="Heebo",f="Jost:wght@400;700&family=Space+Mono:wght@400;700&family=Heebo:wght@500;700"),
}
SCR={
"d7":""".hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;padding:64px 48px}.btn{border-radius:2px}.c{border-radius:2px;border-top:4px solid var(--acc)}""",
"d1":"""header{border-bottom:1px solid #E0E0E0}.hero{display:grid;grid-template-columns:repeat(16,1fr);gap:0 32px;padding:96px 32px}.hero .txt{grid-column:1/8}.hero figure{grid-column:9/17;margin:0}.hero figure svg{width:100%;height:auto;display:block}.hero img{aspect-ratio:1;object-fit:cover}.kicker{font-family:'IBM Plex Mono';font-size:14px;letter-spacing:.32px}
.btn{border-radius:0;padding:15px 64px 15px 16px}.cards{grid-template-columns:repeat(4,1fr);gap:1px;background:#E0E0E0}.c{border-radius:0}.root{border-top:4px solid var(--acc)}""",
"d2":""".hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:72px 32px}.hero img{border-radius:20px;max-width:880px;aspect-ratio:21/9;object-fit:cover;margin-top:40px}.hero .sub{margin:0 auto 24px}@media (max-width:600px){.hero img{aspect-ratio:4/5}}.btn{border-radius:999px}.c{border-radius:20px;border:1px solid #D9CFBE;text-align:center}.c .tag{align-self:center}.root{background:var(--acc);color:var(--onacc)}.root .muted{color:#D7DEE8}.seal{display:inline-block;background:var(--hl);color:#fff;border-radius:50%;width:44px;height:44px;line-height:44px;font-weight:700}""",
"d3":""".hero{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:center;align-content:start;padding:64px 48px}.hero img{border-radius:24px;aspect-ratio:4/3;object-fit:cover}@media (max-width:600px){.hero img{aspect-ratio:1}}.btn{border-radius:16px;box-shadow:0 4px 0 #46A302;text-transform:uppercase;font-weight:800;letter-spacing:.04em}.c{border-radius:16px;border:2px solid #E5E0D2;box-shadow:0 4px 0 #E5E0D2}.tag{background:#FF4B91;color:#1A1A1A;border-radius:8px;padding:2px 8px}.root{background:#FFC800;border-color:#E0A800;box-shadow:0 4px 0 #E0A800}.root .muted{color:#3D3A33}""",
"d4":""".hero{display:grid;grid-template-columns:1fr 1fr;align-items:end;padding:48px 32px;position:relative;overflow:hidden}.hero:before{content:"";position:absolute;right:-30%;top:-20%;width:60%;height:140%;background:var(--acc);transform:skewX(-30deg);z-index:0}.hero>*{position:relative}.hero h1{text-transform:uppercase;transform:rotate(-4deg);transform-origin:left bottom;padding-left:8px}.hero img{aspect-ratio:3/4;max-height:720px;object-fit:cover}.btn{border-radius:0;text-transform:uppercase;letter-spacing:.12em}.c{border-radius:0;border-left:12px solid var(--acc);clip-path:polygon(0 0,100% 0,100% 85%,85% 100%,0 100%)}.word{text-transform:uppercase}""",
"d5":""".hero{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:72px 48px;background-image:radial-gradient(circle at 75% 50%,#123873 0 40%,transparent 41%)}.hero h1{word-spacing:.12em}.hero img{border-radius:50%;aspect-ratio:1;object-fit:cover;box-shadow:0 0 0 6px var(--bg),0 0 0 8px var(--acc)}.btn{border-radius:4px}.c{border-radius:8px;border:1px solid #2C5AA0}.root{border-color:var(--acc)}""",
"d6":"""header{border-bottom:2px solid #111}.hero{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;padding:48px 32px}.hero .txt{grid-column:1/7}.hero figure{grid-column:7/13;margin:0;border:2px solid #111;align-self:start}.hero img{aspect-ratio:1;object-fit:cover;height:100%}.kicker,.tag,.ipa,.btn{font-family:'Space Mono'}.kicker,.tag,.btn{text-transform:uppercase;font-size:12px;letter-spacing:.08em}.btn{border-radius:999px;border:2px solid #111}.btn.ghost{box-shadow:none!important}.c{border-radius:4px;border:2px solid #111}.knob{display:inline-block;width:18px;height:18px;border-radius:50%;background:var(--acc);border:2px solid #111;vertical-align:middle;margin-right:8px}""",
}
COPY={
"d7":("Proposition I","Every proof, in order.","Begin the Elements"),
"d1":("Index 01 / Canon","Every foundation, indexed.","Open the canon"),
"d2":("巻一 · Volume one","build the past.","Begin a study"),
"d3":("Polingual","Learn the words that built the world.","Start a streak"),
"d4":("Bucket · No. 1","Build the past","Join the build"),
"d5":("The canon","Few axioms. Every pattern.","Enter the canon"),
"d6":("BKT-1 · Canon instrument","build the past.","Press play"),
}
SWISS='<svg viewBox="0 0 400 400" role="img" aria-label="Composition after Muller-Brockmann, Musica Viva 1958"><rect width="400" height="400" fill="#161616"/>'+"".join(f'<circle cx="250" cy="170" r="{r}" fill="none" stroke="{"#0F62FE" if r==90 else "#F4F4F4"}" stroke-width="{12 if r==90 else 3}"/>' for r in range(30,270,30))+'<rect x="0" y="300" width="400" height="100" fill="#F4F4F4"/><rect x="24" y="324" width="120" height="8" fill="#161616"/><rect x="24" y="344" width="80" height="8" fill="#161616"/><rect x="24" y="364" width="160" height="8" fill="#0F62FE"/><rect x="352" y="324" width="24" height="24" fill="#DA1E28"/></svg>'
TOK=[4,8,12,16,24,32,48,64,96]
def tokenize(css):
    def tk(v):
        n=min(TOK,key=lambda t:abs(t-v));return f"var(--s{TOK.index(n)+1})"
    def decl(m):
        p,v=m.group(1),m.group(2)
        return p+":"+re.sub(r"(?<![\w.-])(\d+)px",lambda x:tk(int(x.group(1))) if int(x.group(1))>=4 else x.group(0),v)
    return re.sub(r"((?:padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?):([^;{}]+)",decl,css)
STATES='''.inp{font:400 16px/24px inherit;font-family:inherit;color:var(--text);background:var(--surf);border:1px solid var(--muted);padding:var(--s3) var(--s4);min-height:48px;width:220px;border-radius:inherit}.inp:focus-visible,.inp.is-focus{outline:3px solid var(--acc);outline-offset:2px}.inp:disabled,.inp.is-disabled{background:var(--bg);border-style:dashed;cursor:not-allowed}.btn{transition:background-color 120ms var(--ease),transform 80ms var(--ease),box-shadow 120ms}.btn:hover,.btn.is-hover{background:color-mix(in srgb,var(--acc) 86%,#000)}.btn:active,.btn.is-active{transform:translateY(1px)}.btn:focus-visible,.btn.is-focus{outline:3px solid var(--text);outline-offset:3px}.btn:disabled,.btn.is-disabled{background:var(--surf);color:var(--muted);box-shadow:inset 0 0 0 1px var(--muted);cursor:not-allowed;transform:none}.btn.ghost:hover,.btn.ghost.is-hover{background:color-mix(in srgb,var(--text) 10%,transparent)}'''
def screen(d,kind):
    c=d["c"];t=T[d["id"]];k,h,cta=COPY[d["id"]]
    nav=f'<header><span class="logo">{glyph(d,32)}<b>bkt</b></span><nav><a>Canon</a><a>Polingual</a><a>Cite</a></nav></header>'
    if kind=="hero":
        body=f'''{nav}<section class="hero"><div class="txt"><p class="kicker">{k}</p><h1>{h}</h1><p class="sub">Bucket holds the foundations of every field: axioms, laws and primary derivations. Read free. When you cite one, the author is paid.</p><button class="btn">{"<span class=knob></span>" if d["id"]=="d6" else ""}{cta}</button></div><figure class="cons">{construction(d,vessel,560)}</figure></section>'''
    else:
        body=f'''{nav}<main class="study"><p class="kicker">Polingual · root word · 3 of 12</p><div class="cards">
<article class="c root"><span class="tag">English · root</span><span class="word">hundred</span><span class="ipa muted">/ˈhʌn.drəd/</span><p class="muted">Proto-Indo-European *ḱm̥tóm, through Germanic *hundą.</p></article>
<article class="c" lang="fr"><span class="tag">Français</span><span class="word">cent</span><span class="ipa muted">/sɑ̃/</span><p>« Cent ans de solitude. »</p><p class="muted">From Latin centum, same root.</p></article>
<article class="c" lang="es"><span class="tag">Español</span><span class="word">cien</span><span class="ipa muted">/θjen/ · /sjen/</span><p>«Cien años de soledad.»</p><p class="muted">From Latin centum, same root.</p></article>
<article class="c he" lang="he" dir="rtl"><span class="tag">עברית</span><span class="word">מֵאָה</span><span class="ipa muted" dir="ltr">/me.ˈa/</span><p>מֵאָה שָׁנִים שֶׁל בְּדִידוּת.</p><p class="muted" dir="ltr" lang="en">Semitic root m-ʾ-h, a separate lineage.</p></article>
</div><section class="tree"><h2>Lineage</h2><ol><li><b>*ḱm̥tóm</b><span>Proto-Indo-European, c. 4000 BCE</span></li><li><b>*hundą</b><span>Proto-Germanic</span></li><li><b>centum</b><span>Latin</span></li><li><b>cent · cien</b><span>French, Spanish</span></li><li lang="he" dir="rtl"><b>מֵאָה</b><span lang="en" dir="ltr">Semitic, separate root</span></li></ol></section><div class="actions"><div class="prog" role="progressbar" aria-valuenow="3" aria-valuemin="0" aria-valuemax="12" aria-label="3 of 12"><i style="width:25%"></i></div><button class="btn ghost">again</button>{"<span class=seal>知</span>" if d["id"]=="d2" else ""}<button class="btn">knew it</button></div></main><footer><span>Cite this card: bkt.canon/polingual/hundred · author paid on citation</span></footer>'''
    out=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bkt {d["name"]} {kind}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={t["f"]}&display=block">
<style>:root{{{";".join(f"--{a}:{b}" for a,b in c.items())}}}*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:400 16px/24px {d["body"]};font-optical-sizing:auto;-webkit-font-smoothing:antialiased}}
header{{display:flex;justify-content:space-between;align-items:center;padding:16px 32px}}.logo{{display:flex;gap:10px;align-items:center;font:{d["dispw"]} 22px {d["disp"]}}}nav{{display:flex;gap:24px}}nav a{{color:var(--text)}}
h1{{font:{d["dispw"]} {t["h1"]}/{t["lh"]} {d["disp"]};letter-spacing:{t["track"]};margin:0 0 24px}}.kicker{{color:var(--muted);margin:0 0 16px;font-size:14px}}.sub{{color:var(--muted);font-size:18px;line-height:28px;max-width:44ch;margin:0 0 32px}}img{{width:100%;display:block}}.cons svg{{width:100%;height:auto;display:block}}img[hidden]{{display:none}}
.btn{{background:var(--acc);color:var(--onacc);border:0;font:600 16px/1 {d["body"]};padding:16px 28px;min-height:48px;cursor:pointer}}.btn.ghost{{background:transparent;color:var(--text);box-shadow:inset 0 0 0 2px var(--text)!important}}
.study{{padding:48px 32px}}.cards{{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}}.c{{background:var(--surf);padding:var(--s6);display:flex;flex-direction:column;gap:8px}}.c p{{margin:0}}.tag{{font-size:13px;font-weight:600;align-self:flex-start}}.word{{font:{d["dispw"]} 48px/56px {d["disp"]}}}.tag{{line-height:16px}}.c p{{line-height:24px}}.muted{{color:var(--muted)}}.he,.he .word{{font-family:'{t["heb"]}'}}.he .tag{{align-self:flex-start}}.actions{{display:flex;gap:16px;justify-content:flex-end;align-items:center;margin-top:32px}}.prog{{flex:1;height:8px;background:color-mix(in srgb,var(--muted) 25%,transparent)}}.prog i{{display:block;height:100%;background:var(--acc)}}
body{{min-height:100vh;display:flex;flex-direction:column}}main,.hero{{flex:1}}.tree{{margin-top:32px}}.tree h2{{font:{d["dispw"]} 20px {d["disp"]};margin:0 0 12px}}.tree ol{{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(5,1fr);gap:12px}}.tree li{{border-top:2px solid var(--text);padding-top:8px;display:flex;flex-direction:column}}.tree b{{font-size:20px}}.tree span{{color:var(--muted);font-size:14px}}footer{{padding:16px 32px;color:var(--muted);font-size:14px;border-top:1px solid color-mix(in srgb,var(--muted) 30%,transparent)}}
{SCR[d['id']]}{STATES}:root{{--ease:{d['ease']};{';'.join(f'--s{k+1}:{v}px' for k,v in enumerate(TOK))}}}
@media (max-width:600px){{header{{padding:12px 16px}}nav{{display:none}}.hero{{display:flex!important;flex-direction:column;padding:32px 16px!important;gap:24px}}h1{{font-size:{t["h1m"]}}}.study{{padding:24px 16px}}.cards{{grid-template-columns:1fr!important;gap:12px}}.word{{font-size:36px}}.tree ol{{grid-template-columns:1fr 1fr}}footer{{padding:16px}}.actions{{justify-content:stretch}}.actions .btn{{flex:1}}}}
@media (prefers-reduced-motion:reduce){{*{{transition:none!important;animation:none!important}}}}
</style></head><body>{body}</body></html>'''
    h,rest=out.split('<style>',1);css,tail=rest.split('</style>',1)
    return h+'<style>'+tokenize(css)+'</style>'+tail

import re
def clean(t):
    t=re.split(r"QS:|<|\{\{",t)[0].strip(" ,;")
    return t[:70]
def refstrip(d):
    p=f'{DD}refs/{d["id"]}/sources.json'
    if not os.path.exists(p): return '<p class="small">References pending.</p>',[]
    S=json.load(open(p))
    items="".join(f'<figure><a href="{H.escape(s["url"])}"><img src="refs/{d["id"]}/{s["file"]}" alt="{H.escape(s["title"])}" loading="lazy"></a><figcaption>{H.escape(clean(s["title"]))}, {H.escape(clean(str(s.get("creator",""))))} {H.escape(clean(str(s.get("year",""))))}</figcaption></figure>' for s in S)
    return f'<div class="refs">{items}</div>',S
def sampled(d):
    try:
        from PIL import Image
    except: return ""
    fs=glob.glob(f'{DD}refs/{d["id"]}/*.jpg')[:5]
    if not fs: return ""
    from collections import Counter
    cnt=Counter()
    for f in fs:
        im=Image.open(f).convert("RGB").resize((80,80)).quantize(6).convert("RGB")
        cnt.update(im.getdata())
    cols=["#%02X%02X%02X"%c for c,_ in cnt.most_common(8)]
    return "".join(f'<span class="chip" style="background:{x}" title="{x}"></span>' for x in cols)

LIGHT={"d7":"window","d1":"flat","d2":"lantern","d3":"gloss","d4":"rake","d5":"window","d6":"studio"}
PAGES=["landing","polingual-landing","polingual-flow","app-learn","app-language-picker","app-study-card","app-review","app-quiz","app-placement","app-progress","app-canon-search","app-settings","signin","signup","signin-code","email-signin","onboarding","download","logo-in-context","names","math","app-video-tool","game-progress","game-badges","game-social","game-celebrate","game-summary"]
def pagegrid(i):
    out=[]
    for p in PAGES:
        if not os.path.exists(f'{DD}pages/{i}/{p}.html'): continue
        t=f'pages/{i}/thumbs/{p}-1440.png';m=f'pages/{i}/thumbs/{p}-390.png'
        im=f'<img src="{t}" alt="{p} at 1440px" loading="lazy">' if os.path.exists(DD+t) else ''
        im2=f'<img class="m" src="{m}" alt="{p} at 390px" loading="lazy">' if os.path.exists(DD+m) else ''
        out.append(f'<a class="pg" href="pages/{i}/{p}.html" target="_blank" rel="noopener"><span class="pv">{im}{im2}</span><span class="pn">{p.replace("-"," ")}</span></a>')
    return f'<div class="pages">{"".join(out)}</div>' if out else ''
def VID(i):
    if not os.path.exists(f'{DD}video/{i}-16x9.mp4'): return ''
    sb="".join(f'<img src="video/{i}-frame-{k}.jpg" alt="Storyboard frame {k}" loading="lazy">' for k in range(1,7))
    return f'<div class="vid"><video src="video/{i}-16x9.mp4" controls muted loop playsinline preload="metadata" poster="video/{i}-frame-2.jpg"></video><video class="v916" src="video/{i}-9x16.mp4" controls muted loop playsinline preload="metadata" poster="video/{i}-frame-2.jpg"></video></div><div class="sb">{sb}</div>'
VAR={
"d1":["Pixel lattice 24 and 64","Carbon filled, square terminals","Alpine ibex","Set union ∪","Hard cuts, steps(1)","16-column grid"],
"d2":["Compass and circle construction","SF-style glyphs in mon roundels","Tsuru-maru crane","Igeta well frame","Ink reveal, ease-in-out 900ms","Centered scroll axis"],
"d3":["Pattern-tile grid with radius rules","Chunky with bottom lip","Squiggle worm","Cornucopia","Squash and stretch overshoot","Stacked cards"],
"d4":["Ruled surfaces, 30 degree diagonals","Material Sharp with diagonal metaphors","Steel swallow","Shukhov hyperboloid","Diagonal wipe, emphasized","Diagonal axis"],
"d5":["Tiling math, 8 and 16-fold","Fluent outline 1.5px with filled accent","Hoopoe in khatam","Astrolabe","Tessellation growth, decelerate","8-fold symmetric"],
"d7":["Euclid propositions, labelled points","Codex filled with Greek-key active corner","Owl of Athena","Amphora","Proof-step sequence, standard 240ms","Proposition and proof columns"],
"d6":["Pixel lattice of primitives","Primitives only, two-color","Primitive goat","Brandt MT49 teapot","Mechanical steps(4)","Hardware panel module"]}
VCOLS=["Construction","Icon grammar","Mascot","Vessel","Motion","Layout skeleton"]
for k in range(len(VCOLS)):
    vals=[VAR[x][k] for x in VAR]; assert len(set(vals))==len(VAR),VCOLS[k]
secs=[];nav=[];md=[];OV=[];SLOTS={};RAIL=[]
for d in D:
    c=d["c"];i=d["id"];pr=pairs(d);t=T[i]
    for kind in ("hero","card"): open(f'{DD}screens/{i}-{kind}.html',"w").write(screen(d,kind))
    st=screen(d,"hero").split("<body>")[0]+'<body style="min-height:0;display:block"><div style="display:flex;gap:16px;flex-wrap:wrap;padding:16px">'+"".join(f'<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start"><button class="btn {c_}" {"disabled" if c_=="is-disabled" else ""}>{COPY[i][2]}</button><small style="color:var(--muted);font-size:12px;line-height:16px">{c_[3:] or "default"}</small></div>' for c_ in ("","is-hover","is-active","is-focus","is-disabled"))+''.join(f'<div style="display:flex;flex-direction:column;gap:4px"><input class="inp {c_}" value="{v_}" aria-label="search" {"disabled" if c_=="is-disabled" else ""}><small style="color:var(--muted);font-size:12px;line-height:16px">input {c_[3:] or "default"}</small></div>' for c_,v_ in (("","entropy"),("is-focus","Noether"),("is-disabled","")))+'</div></body></html>'
    open(f'{DD}screens/{i}-states.html',"w").write(st)
    import cairosvg
    for n in NAMES:
        sv=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="{"crispEdges" if i in ("d1","d6") else "geometricPrecision"}">{icon(d,n)}</svg>'
        open(f'{DD}icons/{i}-{n}.svg',"w").write(sv)
        for px in (16,24,32): cairosvg.svg2png(bytestring=sv.encode(),write_to=f'{DD}icons/{i}-{n}-{px}.png',output_width=px,output_height=px)
    open(f'{DD}icons/{i}-glyph.svg',"w").write(glyph(d,1024).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ',1))
    strip,S=refstrip(d)
    ov="".join(f'<figure>{svg(overlay(d)+icon(d,n),120)}<figcaption>{n}</figcaption></figure>' for n in NAMES)
    sizes="".join(f'<div class="sz"><span>{px}px</span>'+"".join(svg(icon(d,n),px,f'aria-label="{n}" role="img"') for n in NAMES)+'</div>' for px in (16,24,32,64))+'<div class="sz"><span>png</span>'+''.join(f'<img src="icons/{i}-{n}-{px}.png" width="{px}" height="{px}" alt="{n} {px}px export" style="image-rendering:pixelated">' for px in (16,24,32) for n in NAMES[:4])+'</div>'
    rows="".join(f'<tr><td><span class="sw" style="background:{b};color:{f}">Aa</span></td><td>{n}</td><td><code>{f} / {b}</code></td><td>{r:.2f}:1</td></tr>' for n,f,b,r in pr)
    sw="".join(f'<span class="chip" style="background:{v}"></span><code>{k} {v}</code>' for k,v in c.items())
    src="".join(f'<li><a href="{u}">{tt}</a></li>' for tt,u in d["src"])
    def frame(kind,w,h,s): return f'<div class="fr" style="width:{w*s:.0f}px;height:{h*s:.0f}px"><iframe src="screens/{i}-{kind}.html" title="{d["name"]} {kind} at {w}px" style="width:{w}px;height:{h}px;transform:scale({s})" ></iframe><span>{w}px</span></div>'
    def tile(href,img,label,slot,w=1440,h=900):
        ok=os.path.exists(DD+img)
        im=f'<img src="{img}" alt="{label}" loading="lazy" decoding="async" width="{w}" height="{h}">' if ok else ''
        if ok: SLOTS.setdefault(slot,{})[i]=(img,href,label)
        return f'<a class="tl" href="{href}" data-slot="{slot}" style="--ar:{w}/{h}"><span class="pv">{im}</span><span class="pn">{label}</span></a>'
    def pt(p): return tile(f"pages/{i}/{p}.html",f"pages/{i}/thumbs/{p}-1440.png",p.replace("-"," "),p)
    sc=lambda k,lab: tile(f"screens/{i}-{k}.html",f"screens/thumbs/{i}-{k}.png",lab,k)
    os.makedirs(DD+"logos",exist_ok=True)
    logo_cells=""
    for key,lab,fn in MARKS:
        open(f"{DD}logos/{i}-{key}.svg","w").write(svgm(d,fn,1024))
        logo_cells+=f'<a class="lc" href="logos/{i}-{key}.svg" data-slot="logo-{key}"><span class="lb">{svgm(d,fn,88)}<span>{svgm(d,fn,32)}</span></span><span class="pn">{lab}</span></a>'
        SLOTS.setdefault("logo-"+key,{})[i]=(f"logos/{i}-{key}.svg",f"logos/{i}-{key}.svg",lab)
    open(f"{DD}logos/{i}-mho-construction.svg","w").write(construction(d,mho,1024))
    open(f"{DD}logos/{i}-mascot.svg","w").write(svgm(d,mascot,1024))
    open(f"{DD}logos/{i}-glyph.svg","w").write(glyph(d,1024).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ',1))
    for k_,f_ in (("mho-construction",None),("mascot",None),("glyph",None)): SLOTS.setdefault("logo-"+k_,{})[i]=(f"logos/{i}-{k_}.svg",f"logos/{i}-{k_}.svg",k_)
    mi,mw,me=MOTION[i]
    css=".m-"+i+" .mq{animation:idle-"+i+" 3s "+me+" infinite;transform-origin:50% 60%}.m-"+i+" .mq.win{animation:win-"+i+" 600ms "+me+" 1}"+mi.replace("idle","idle-"+i)+mw.replace("win","win-"+i)+"@media (prefers-reduced-motion:reduce){.m-"+i+" .mq{animation:none!important}}"
    logo_cells+=f'<a class="lc" href="logos/{i}-mho-construction.svg" data-slot="logo-mho-construction"><span class="lb">{construction(d,mho,88)}</span><span class="pn">℧ construction</span></a>'
    logo_cells+=f'<a class="lc" href="logos/{i}-glyph.svg" data-slot="logo-glyph"><span class="lb">{glyph(d,88)}<span>{glyph(d,32)}</span></span><span class="pn">bkt glyph</span></a>'
    logo_cells+='<div class="lc masc m-'+i+'"><style>'+css+'</style><button class="mqb" aria-label="Play success motion" onclick="const s=this.querySelector(&quot;.mq&quot;);s.classList.remove(&quot;win&quot;);void s.offsetWidth;s.classList.add(&quot;win&quot;)"><span class="mq">'+svgm(d,mascot,88)+'</span></button><span class="pn">'+MASCOT[i]+'</span></div>'
    logo_cells+=f'<div class="lc"><span class="lb lks">{lockup(d,"Bucket")}{lockup(d,"bkt")}</span><span class="pn">℧ lockups</span></div>'
    logo_cells+=f'<div class="lc wide"><span class="lb ctx"><span class="ai">{svgm(d,mho,52)}</span><span class="tab">{svgm(d,mho,16)}<i>Bucket</i></span><span class="hdr">{lockup(d,"Bucket")}<i>Canon</i><i>Cite</i></span></span><span class="pn">In context</span></div>'
    ico="".join(svg(overlay(d)+icon(d,n),48,f'role="img" aria-label="{n}"') for n in NAMES)
    ico16="".join(svg(icon(d,n),16,f'role="img" aria-label="{n}"') for n in NAMES)
    try:
        from logos import pixel_strip
        logo_cells+=f'<div class="lc wide"><span class="lb pxs">{pixel_strip(d)}</span><span class="pn">Pixel check 16, 24, 32, 64</span></div>'
    except ImportError: pass
    logo_cells+=f'<div class="lc wide"><span class="lb icn"><span>{ico}</span><span class="s">{ico16}</span></span><span class="pn">Icons, 24 grid and 16px</span></div>'
    PG=["polingual-landing","polingual-flow","onboarding","signin","signup","signin-code","email-signin","download","logo-in-context","names"]
    AP=["app-learn","app-language-picker","app-study-card","app-review","app-quiz","app-placement","app-progress","app-settings","app-video-tool"]
    GM=["game-progress","game-badges","game-social","game-celebrate","game-summary"]
    pages="".join(pt(p) for p in PG)
    app="".join(pt(p) for p in AP)+sc("search","canon search")+sc("search-empty","search empty")+sc("search-loading","search loading")
    game="".join(pt(p) for p in GM)
    math_=f'<div class="live"><iframe src="screens/{i}-mm.html" title="{d["name"]} math and motion" loading="lazy"></iframe></div>'+pt("math")
    SLOTS.setdefault("math-motion",{})[i]=(f"screens/thumbs/{i}-mm.png",f"screens/{i}-mm.html","math and motion")
    vid='<p class="pn">Video rendering.</p>' if not os.path.exists(f'{DD}video/{i}-16x9.mp4') else f'<div class="vids"><video src="video/{i}-16x9.mp4" controls muted loop playsinline preload="none" poster="video/{i}-frame-2.jpg" width="1280" height="720"></video><video class="v9" src="video/{i}-9x16.mp4" controls muted loop playsinline preload="none" poster="video/{i}-frame-2.jpg" width="720" height="1280"></video></div>'+"".join(f'<a class="tl" href="video/{i}-frame-{k}.jpg" data-slot="frame-{k}" style="--ar:16/9"><span class="pv"><img src="video/{i}-frame-{k}.jpg" alt="Storyboard frame {k}" loading="lazy" width="640" height="360"></span><span class="pn">frame {k}</span></a>' for k in range(1,7))
    SLOTS.setdefault("video",{})[i]=(f"video/{i}-frame-3.jpg",f"video/{i}-16x9.mp4","video")
    three='<p class="pn">3D render queued for this direction.</p>' if not os.path.exists(f'{DD}3d/{i}-mark.jpg') else f'<a class="tl" href="3d/{i}-mark.png" data-slot="3d-mark" style="--ar:1/1"><span class="pv"><img src="3d/{i}-mark.jpg" alt="Blender mark" loading="lazy" width="1024" height="1024"></span><span class="pn">mark, Blender</span></a><a class="tl" href="3d/{i}-object.png" data-slot="3d-object" style="--ar:1/1"><span class="pv"><img src="3d/{i}-object.jpg" alt="Blender object" loading="lazy" width="1024" height="1024"></span><span class="pn">object, Blender</span></a><div class="tl"><canvas class="live3" data-glb="3d/{i}-mark.glb" data-bg="{c["bg"]}" data-light="{LIGHT[i]}" aria-label="Live 3D mark, drag to rotate" width="320" height="320"></canvas><span class="pn">live, Three.js</span></div>'
    SLOTS.setdefault("3d-object",{})[i]=(f"3d/{i}-object.jpg",f"3d/{i}-object.png","object")
    lic=[]
    lp=f"{DD}licensed/{i}/sources.json"
    if os.path.exists(lp):
        try: lic=json.load(open(lp))
        except Exception: lic=[]
    refs="".join(f'<a class="tl" href="refs/{i}/{s_["file"]}" title="{H.escape(clean(s_["title"]))}" style="--ar:4/3"><span class="pv"><img src="refs/{i}/{s_["file"]}" alt="{H.escape(clean(s_["title"]))}" loading="lazy"></span><span class="pn">{H.escape(clean(s_["title"]))}</span></a>' for s_ in S)
    refs+="".join(f'<a class="tl" href="licensed/{i}/{s_["file"]}" title="{H.escape(clean(str(s_.get("title",""))))}, {H.escape(str(s_.get("license","")))}" style="--ar:4/3"><span class="pv"><img src="licensed/{i}/{s_["file"]}" alt="{H.escape(clean(str(s_.get("title",""))))}" loading="lazy"></span><span class="pn">{H.escape(clean(str(s_.get("title",""))))} · {H.escape(str(s_.get("license","")))}</span></a>' for s_ in lic if os.path.exists(f"{DD}licensed/{i}/{s_.get('file','')}"))
    TABS=[("Logos",f'<div class="lg">{logo_cells}</div>'),("Pages",f'<div class="grid">{pages}</div>'),("App",f'<div class="grid">{app}</div>'),("Math and motion",f'<div class="grid">{math_}</div>'),("Video",f'<div class="grid">{vid}</div>'),("Gamification",f'<div class="grid">{game}</div>'),("3D · in progress",f'<div class="grid">{three}</div>'),("References",f'<div class="grid">{refs}</div>')]
    slug=lambda n:re.sub(r"[^a-z0-9]+","-",n.lower()).strip("-")
    panels="".join(f'<section class="ps" id="{i}-{slug(n)}"><h3>{n}</h3>{h}</section>' for n,h in TABS)
    hero=f'<div class="hero2"><div class="nat"><span class="pn">Landing, 1440 × 900, actual size</span><div class="natv"><iframe src="pages/{i}/landing.html" title="{d["name"]} landing at 1440 by 900" width="1440" height="900" loading="lazy"></iframe></div></div><div class="nat"><span class="pn">390 × 844, actual size</span><div class="natv"><iframe src="pages/{i}/landing.html" title="{d["name"]} landing at 390 by 844" width="390" height="844" loading="lazy"></iframe></div></div><a class="tl full" href="pages/{i}/landing.html"><span class="pn">Open full screen</span></a></div>'
    RAIL.append(f'<details class="rd" data-d="{i}"><summary><span class="sw" style="background:{c["acc"]}"></span><b>{d["n"]} {d["name"]}</b></summary><nav>'+"".join(f'<a href="#{i}-{slug(n)}">{n}</a>' for n,_ in TABS)+'</nav></details>')
    feel=d["feel"].split(". ")[0].rstrip(".")
    OV.append(f'<a class="ov" href="#{i}" style="background:{c["bg"]};color:{c["text"]}"><span class="ovm">{svgm(d,mho,56)}{svgm(d,mascot,56)}</span><b style="font-family:{d["disp"]}">{d["n"]} {d["name"]}</b><span class="ovl">{d["movement"]} · {d["system"]}</span><span class="chips">{"".join(f'<span class="chip" style="background:{v}"></span>' for v in c.values())}</span><span class="ovf">{feel}</span></a>')
    secs.append(f'''<section id="{i}" class="dir dirv" hidden style="{";".join(f"--{a}:{b}" for a,b in c.items())};--disp:{d["disp"]};--body:{d["body"]}">
<header class="dh"><span class="xp">Experimental</span><span class="num">{d["n"]}</span><h2>{d["name"]}</h2><span class="lineage">{d["movement"]} · {d["system"]}</span><details class="made"><summary>How it is made</summary><span>{MADE[i]["medium"]}. Motion: {MADE[i]["motion"]}. Accents: {MADE[i]["accents"]}.</span></details></header>
{hero}{panels}
</section>''')
    nav.append(f'<a href="#{i}">{d["n"]} {d["name"]}</a>')
    md.append((d,pr,S))

from logos import heritage_strip
LINEAGE=f'<div class="lin"><p class="cl">℧ lineage</p>{heritage_strip()}</div>'
fams=[];[fams.append(x) for d in D for x in T[d["id"]]["f"].split("&family=") if x not in fams];fonts="&".join("family="+x for x in fams)
page=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>bkt Directions</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fonts}&display=block">
<style>*{{box-sizing:border-box}}body{{margin:0;background:#FAFAF8;color:#1A1A1A;font:16px/1.5 'IBM Plex Sans',sans-serif}}
.top{{padding:40px 16px;max-width:1240px;margin:auto}}.top h1{{margin:0 0 8px;font-size:36px}}.top nav{{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}}.top nav a{{color:#1A1A1A;border:1px solid #1A1A1A;padding:4px 10px;text-decoration:none}}
.dir{{background:var(--bg);color:var(--text);font-family:var(--body);padding:56px max(16px,calc((100% - 1240px)/2))}}.dh{{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}}.num{{font:700 56px var(--disp)}}.dh h2{{font:700 48px var(--disp);margin:0}}.lineage{{color:var(--muted);margin:0}}.feel{{max-width:68ch;font-size:18px}}h4{{font:700 20px var(--disp);margin:40px 0 12px}}
.pages{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}}.pg{{color:var(--text);text-decoration:none;display:flex;flex-direction:column;gap:8px}}.pv{{position:relative;display:block;aspect-ratio:16/10;overflow:hidden;border:1px solid color-mix(in srgb,var(--muted) 40%,transparent)}}.pv img{{width:100%;height:100%;object-fit:cover;object-position:top;display:block}}.pv img.m{{position:absolute;right:6px;bottom:6px;width:22%;height:auto;aspect-ratio:390/844;border:1px solid var(--muted)}}.pg:hover .pv,.pg:focus-visible .pv{{outline:3px solid var(--acc)}}.pn{{font-size:14px;text-transform:capitalize}}.vid{{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}}.vid video{{width:min(720px,100%);display:block;border:1px solid var(--muted)}}.vid .v916{{width:220px}}.sb{{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:12px}}.sb img{{width:100%;display:block;border:1px solid color-mix(in srgb,var(--muted) 40%,transparent)}}.three{{display:flex;gap:16px;flex-wrap:wrap}}.three figure{{margin:0;width:360px;max-width:100%}}.three img,.three canvas{{width:100%;aspect-ratio:1;display:block;border:1px solid color-mix(in srgb,var(--muted) 30%,transparent)}}.heri{{display:flex;gap:32px;flex-wrap:wrap}}.hs{{display:flex;gap:8px}}.hs img{{width:96px;height:96px;object-fit:cover;border:1px solid #ccc}}.cur{{display:inline-flex;gap:8px;margin-right:8px}}.cur img{{height:96px;width:auto;border:1px solid #ccc}}.refs{{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}}.refs figure{{margin:0;flex:0 0 180px}}.refs img{{width:180px;height:130px;object-fit:cover;display:block;border:1px solid var(--muted)}}.refs figcaption{{font-size:12px;color:var(--muted);line-height:1.3;margin-top:4px}}
.frames{{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}}.fr{{position:relative;overflow:hidden;border:1px solid var(--muted);flex:none}}.fr iframe{{border:0;transform-origin:0 0;position:absolute;top:0;left:0;background:var(--bg)}}.fr span{{position:absolute;right:4px;bottom:4px;font-size:11px;background:var(--text);color:var(--bg);padding:1px 6px}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:40px}}.wm{{font-size:96px;line-height:1;font-kerning:normal;display:inline-block;margin-bottom:24px}}.wm i{{font-style:normal;display:inline-block}}.wm32{{font-size:32px;margin-left:24px}}.glyphs{{display:flex;align-items:flex-end;gap:24px;flex-wrap:wrap}}.glyphs>div{{display:flex;flex-direction:column;align-items:center;gap:4px}}.g1024 svg{{width:240px;height:240px}}small,.small{{color:var(--muted);font-size:13px}}
.icons{{display:flex;flex-wrap:wrap;gap:12px}}.icons figure{{margin:0;text-align:center}}.icons svg{{background:color-mix(in srgb,var(--surf) 70%,transparent);outline:1px solid color-mix(in srgb,var(--muted) 30%,transparent)}}figcaption{{font-size:12px;color:var(--muted)}}.sizes{{margin-top:16px;display:grid;gap:12px}}.sz{{display:flex;gap:16px;align-items:center;flex-wrap:wrap}}.sz span{{width:44px;font-size:12px;color:var(--muted)}}
dl{{margin:0}}dt{{font-weight:700;margin-top:10px}}dd{{margin:0}}.sws{{display:grid;grid-template-columns:20px 1fr;gap:4px 8px;align-items:center}}.chip{{display:inline-block;width:20px;height:20px;border:1px solid var(--muted);vertical-align:middle}}.sampled .chip{{margin-right:4px}}code{{font-size:13px}}
.ct{{border-collapse:collapse;font-size:14px}}.ct td{{padding:4px 8px;border-bottom:1px solid color-mix(in srgb,var(--muted) 30%,transparent)}}.sw{{display:inline-block;padding:2px 8px;font-weight:700}}.src a{{color:var(--text)}}
dd{{overflow:hidden}}.mdemo{{display:inline-block;width:16px;height:16px;background:var(--acc);vertical-align:middle;margin-left:8px;animation:mv 1.6s var(--ease) infinite alternate}}@keyframes mv{{to{{transform:translateX(64px)}}}}
.dir{{padding:32px max(16px,calc((100% - 1240px)/2))}}.dh{{gap:12px;align-items:center}}.dh .num{{font-size:32px}}.dh h2{{font-size:32px}}.chips{{display:flex;gap:4px}}.chips .chip{{width:16px;height:16px}}.fonts{{color:var(--muted);font-size:13px}}
.row{{display:flex;gap:12px;align-items:flex-start;margin-top:16px;flex-wrap:wrap}}.r-mm iframe{{width:min(720px,100%);height:440px;border:1px solid color-mix(in srgb,var(--muted) 40%,transparent)}}.r-mm .vid video{{width:min(400px,100%)}}.r-mm .vid .v916{{width:124px}}.sb{{grid-template-columns:repeat(6,64px)}}
.marks{{display:flex;gap:16px;align-items:flex-end}}.wmw .wm{{font-size:56px;margin:0}}.wmw svg{{height:48px}}.icons{{display:flex;flex-direction:column;gap:8px}}.ig{{display:flex;gap:8px;align-items:center}}.ig svg{{outline:1px solid color-mix(in srgb,var(--muted) 25%,transparent)}}.ig.s svg{{outline:0}}.ig.s{{gap:40px;padding-left:16px}}
.r-logo{{gap:24px}}.lm{{margin:0;display:flex;flex-direction:column;gap:6px;align-items:flex-start}}.lm>span{{display:flex;gap:8px;align-items:flex-end}}.lm figcaption{{font-size:12px;color:var(--muted)}}.mqb{{background:none;border:0;padding:0;cursor:pointer}}.mqb:focus-visible{{outline:3px solid var(--acc);outline-offset:2px}}.mq{{display:block}}.lks{{display:flex;flex-direction:column;gap:12px;justify-content:center;height:96px}}.lk{{display:inline-flex;align-items:center;gap:10px;font-size:32px;line-height:40px}}
.ctx{{display:flex;gap:16px;align-items:center;margin-top:12px;flex-wrap:wrap}}.ai{{display:grid;place-items:center;width:76px;height:76px;border-radius:18px;background:var(--surf);box-shadow:0 0 0 1px color-mix(in srgb,var(--muted) 30%,transparent)}}.tab{{display:inline-flex;gap:8px;align-items:center;padding:6px 12px;border-radius:8px 8px 0 0;background:var(--surf);font-size:12px}}.tab i,.hdr i{{font-style:normal}}.hdr{{display:flex;gap:24px;align-items:center;padding:8px 16px;background:var(--surf);font-size:14px}}.hdr .lk{{font-size:22px}}.hdr .lk svg{{width:28px;height:28px}}
.made{{margin:8px 0 0;font-size:13px;line-height:20px;color:var(--muted);max-width:120ch}}.made b{{color:var(--text)}}.rl{{margin:24px 0 0;font-size:12px;line-height:16px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}}.grid{{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-top:16px}}.g6{{grid-template-columns:repeat(6,1fr)}}.tl{{color:var(--text);text-decoration:none;display:flex;flex-direction:column;gap:4px}}.tl .pv{{display:block;aspect-ratio:16/10;overflow:hidden;border:1px solid color-mix(in srgb,var(--muted) 40%,transparent);background:var(--surf)}}.tl img{{width:100%;height:100%;object-fit:cover;object-position:top;display:block}}.tl:hover .pv,.tl:focus-visible .pv{{outline:3px solid var(--acc)}}.pn{{font-size:12px;line-height:16px;text-transform:capitalize;color:var(--muted)}}
.r-3d img,.r-3d canvas{{width:200px;height:200px;object-fit:cover;display:block}}.r-ref img{{height:72px;width:108px;object-fit:cover;display:block;border:1px solid color-mix(in srgb,var(--muted) 30%,transparent)}}
details{{margin-top:16px;font-size:14px}}summary{{cursor:pointer;color:var(--muted)}}.spec p{{max-width:90ch}}.cl{{margin:24px 0 8px;font-weight:600}}
@media (max-width:760px){{.grid{{grid-template-columns:repeat(3,1fr)}}.r-mm iframe{{height:360px}}.ig.s{{gap:16px}}.ig{{flex-wrap:wrap}}}}
@media (max-width:760px){{.grid2{{grid-template-columns:1fr}}.fr{{transform:scale(.6);transform-origin:0 0}}.g1024 svg{{width:160px;height:160px}}}}
@media (prefers-reduced-motion:reduce){{.mdemo{{animation:none}}}}
.top{{max-width:none;padding:24px}}.ovg{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}}.ov{{min-width:0;display:flex;flex-direction:column;gap:6px;padding:16px;text-decoration:none;border-radius:4px;box-shadow:0 0 0 1px #0002;min-height:200px}}.ov:hover,.ov:focus-visible{{outline:3px solid #0F62FE;outline-offset:2px}}.ovm{{display:flex;gap:8px}}.ov b{{font-size:22px;line-height:28px}}.ovl,.ovf{{font-size:13px;line-height:18px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}.ov .chips{{display:flex;gap:3px}}.ov .chip{{width:14px;height:14px;border:1px solid #0003}}
.cmp{{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}}.cmp select{{font:inherit;padding:6px 8px}}.cmpg{{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;width:100%}}.cm{{color:inherit;text-decoration:none;display:flex;flex-direction:column;gap:4px}}.cm .pv{{display:block;aspect-ratio:16/10;overflow:hidden;border:1px solid #ccc;background:#fff}}.cm img{{width:100%;height:100%;object-fit:contain}}.cm .pn{{font-size:12px}}
.vm{{margin-top:16px;font-size:13px}}.vm table{{border-collapse:collapse;width:100%;margin-top:8px}}.vm th,.vm td{{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top}}.vm .chip{{width:12px;height:12px;display:inline-block;vertical-align:middle}}.lin{{margin-top:16px}}.lin svg,.lin img{{max-height:96px}}.her{{margin-top:12px;font-size:14px}}.her .hs{{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}}.her img{{height:80px;width:auto;border:1px solid #ccc}}
.dir{{width:100vw;height:100vh;box-sizing:border-box;padding:16px 24px;display:flex;flex-direction:column;overflow:hidden;scroll-snap-align:start}}.dir .tp{{flex:1;min-height:0;overflow:auto}}.dir .tabs{{position:static}}html{{scroll-snap-type:y mandatory}}.top{{min-height:100vh;scroll-snap-align:start;box-sizing:border-box}}.dh{{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline}}.dh .num{{font-size:28px}}.dh h2{{font-size:28px;margin:0}}.lineage{{color:var(--muted);font-size:14px}}.made{{width:100%;font-size:13px;color:var(--muted)}}.made summary{{cursor:pointer;color:var(--text)}}
.tabs{{position:sticky;top:0;z-index:5;display:flex;gap:4px;overflow-x:auto;background:var(--bg);padding:8px 0;margin:8px 0 12px;border-bottom:1px solid color-mix(in srgb,var(--muted) 30%,transparent)}}.tabs button{{font:600 13px/20px var(--body);color:var(--text);background:transparent;border:0;padding:6px 10px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent}}.tabs button[aria-selected=true]{{border-color:var(--acc)}}.tabs button:focus-visible{{outline:2px solid var(--acc)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}}.tl{{color:var(--text);text-decoration:none;display:flex;flex-direction:column;gap:4px;min-width:0}}.tl .pv{{display:block;aspect-ratio:var(--ar,16/10);overflow:hidden;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent);background:var(--surf)}}.tl img{{width:100%;height:100%;object-fit:cover;object-position:top;display:block}}.tl canvas{{width:100%;aspect-ratio:1;display:block}}.pn{{font-size:12px;line-height:16px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:capitalize}}.tl:hover .pv,.tl:focus-visible .pv,.lc:hover .lb{{outline:3px solid var(--acc)}}
.live{{grid-column:span 4}}.live iframe{{width:100%;aspect-ratio:16/10;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent)}}.vids{{grid-column:span 6;display:flex;gap:10px}}.vids video{{height:300px;width:auto;max-width:100%;border:1px solid var(--muted)}}
.lg{{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}}.lc{{color:var(--text);text-decoration:none;display:flex;flex-direction:column;gap:4px;min-width:0}}.lc .lb{{display:flex;align-items:flex-end;gap:8px;justify-content:center;height:120px;overflow:hidden;background:var(--surf);border:1px solid color-mix(in srgb,var(--muted) 35%,transparent)}}.lc.wide{{grid-column:span 2}}.lc .lks{{flex-direction:column;align-items:flex-start;justify-content:center;padding:0 12px}}.lk{{font-size:24px}}.lk svg{{width:28px;height:28px}}.lc .ctx{{justify-content:flex-start;align-items:center;gap:10px;padding:0 10px}}.icn{{flex-direction:column;align-items:flex-start!important;justify-content:center!important;padding:0 10px}}.icn span{{display:flex;gap:4px}}.icn svg[width="48"]{{width:36px;height:36px}}.ctx .hdr{{padding:4px 8px;gap:10px;font-size:12px}}.ctx .lk{{font-size:16px}}.ctx .lk svg{{width:20px;height:20px}}.icn .s{{gap:14px;padding-left:16px}}.pxs{{justify-content:flex-start!important;align-items:center!important;flex-wrap:wrap;align-content:center;padding:4px 10px;gap:4px;image-rendering:pixelated;overflow:auto!important}}.pxs img,.pxs svg{{flex:none}}.masc .mqb{{height:120px;background:var(--surf);border:1px solid color-mix(in srgb,var(--muted) 35%,transparent)}}
.lbx{{position:fixed;inset:0;background:#000;z-index:50;display:grid;grid-template-columns:40px 1fr 40px;grid-template-rows:1fr auto;align-items:center;gap:0;padding:0}}.lbx[hidden]{{display:none}}.lbv{{height:100vh;width:100%;display:grid;place-items:center;min-height:0;overflow:hidden}}.lbt{{position:absolute;bottom:4px;left:0;right:0}}.lbv.one{{overflow:auto;place-items:start center}}.vpw{{position:relative;overflow:hidden}}.vp{{transform-origin:0 0;position:absolute;top:0;left:0}}.vp iframe{{width:100%;height:100%;border:0;background:#fff}}.lbo{{position:absolute;bottom:4px;left:48px;display:flex;gap:4px;z-index:2}}.lbo button{{font-size:13px;height:32px;padding:0 10px;color:#fff;background:#fff2}}.lbo button[aria-pressed=true]{{background:#fff;color:#000}}.lbv img,.lbv video{{max-width:100%;max-height:100%;object-fit:contain}}.lbx button{{font-size:32px;color:#fff;background:#fff2;border:0;height:48px;cursor:pointer}}.lbc{{position:absolute;top:8px;right:8px;width:48px}}.lbt{{grid-column:1/4;color:#fff;font-size:13px;margin:0;text-align:center}}
@media (max-width:760px){{.ovg{{grid-template-columns:1fr 1fr}}.grid,.lg,.cmpg{{grid-template-columns:repeat(2,1fr)}}.live,.vids,.lc.wide{{grid-column:span 2}}.vids video{{height:200px}}.lbx{{grid-template-columns:36px 1fr 36px;padding:8px}}}}
.hero2{{display:flex!important;gap:16px;align-items:flex-start;flex-wrap:wrap}}.nat{{display:flex;flex-direction:column;gap:4px;max-width:100%}}.natv{{overflow:auto;max-width:100%;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent);background:var(--surf)}}.natv iframe{{display:block;border:0}}.hero2 .full{{align-self:flex-start;padding:8px 12px;border:1px solid var(--text);color:var(--text)}}.hero2 .full .pn{{color:var(--text)}}
.lbo button{{font-size:13px!important;height:32px!important}}.lbo{{flex-wrap:wrap}}.lbx.noh .lbo{{display:none}}
.vids{{flex-wrap:wrap}}.vids video{{max-width:100%!important;height:auto!important;max-height:320px}}
.rd summary[aria-current=true] b{{text-decoration:underline;text-underline-offset:4px}}
@media (max-width:900px){{.shell{{display:block}}.rail{{position:sticky;top:0;z-index:20;height:auto;max-height:60vh;border-right:0;border-bottom:1px solid #ddd}}main{{height:auto;overflow:visible}}}}
.shell{{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh}}.rail{{position:sticky;top:0;height:100vh;overflow:auto;border-right:1px solid #ddd;background:#fff;padding:16px;box-sizing:border-box}}.rt{{font-weight:700;font-size:18px;margin:0}}.xp{{display:inline-block;font:600 11px/16px 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#7A4B00;background:#FFF3D6;border:1px solid #E8C77A;padding:0 6px;border-radius:2px;margin:4px 0 12px;vertical-align:middle}}.rh{{display:block;padding:8px 0;color:#1A1A1A}}.rd{{border-top:1px solid #eee}}.rd summary{{display:flex;gap:8px;align-items:center;padding:10px 0;cursor:pointer;list-style:none}}.rd summary::-webkit-details-marker{{display:none}}.rd summary em{{margin-left:auto;font:600 10px/14px 'IBM Plex Mono',monospace;color:#7A4B00;font-style:normal}}.rd .sw{{width:12px;height:12px;border-radius:2px;flex:none}}.rd nav{{display:flex;flex-direction:column;padding:0 0 10px 20px}}.rd nav a{{color:#333;font-size:13px;line-height:28px;text-decoration:none}}.rd nav a:hover{{text-decoration:underline}}.rd[open] summary b{{text-decoration:underline;text-underline-offset:4px}}
main{{min-width:0;height:100vh;overflow:auto}}.dirv.in{{animation:fadein 240ms cubic-bezier(.2,0,.38,.9)}}@keyframes fadein{{from{{opacity:0;transform:translateY(8px)}}to{{opacity:1;transform:none}}}}
.dir{{width:auto!important;height:auto!important;overflow:visible!important;display:block!important;padding:24px 32px 64px!important}}.dir[hidden]{{display:none!important}}.ps{{padding:32px 0;border-top:1px solid color-mix(in srgb,var(--muted) 25%,transparent);scroll-margin-top:8px}}.ps h3{{font:700 20px/28px var(--disp);margin:0 0 16px}}
.hero2{{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:16px;align-items:start;margin:16px 0 8px}}.fw{{position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent);background:var(--surf)}}.fw iframe{{border:0;position:absolute;top:0;left:0;transform-origin:0 0}}
@media (max-width:900px){{.shell{{grid-template-columns:1fr}}.rail{{position:static;height:auto}}.hero2{{grid-template-columns:1fr}}}}
@media (prefers-reduced-motion:reduce){{.dirv.in{{animation:none}}}}html{{scroll-snap-type:none!important}}.top{{min-height:0!important;padding:24px 32px!important}}
</style></head><body>
<div class="shell"><aside class="rail"><p class="rt">bkt directions</p><p class="xp">Experimental</p><a class="rh" href="#top">Overview</a>{"".join(RAIL)}</aside><main id="main"><div class="top dirv" id="top"><h1>bkt directions</h1><div class="ovg">{"".join(OV)}</div><details class="vm"><summary>Variance matrix</summary><table><tr><th></th>{"".join(f"<th>{x}</th>" for x in VCOLS)}<th>Accent</th><th>Display type</th></tr>{"".join(f'<tr><th>{d["n"]} {d["name"]}</th>'+"".join(f"<td>{v}</td>" for v in VAR[d["id"]])+f'<td><span class="chip" style="background:{d["c"]["acc"]}"></span> {d["c"]["acc"]}</td><td>{d["disp"].strip(chr(39))}</td></tr>' for d in D)}</table><p>Every column holds six different values; the build fails otherwise.</p></details><div class="cmp"><label for="slot">Compare</label><select id="slot"><option value="">pick a slot</option>{"".join(f'<option value="{k}">{k.replace("-"," ")}</option>' for k in sorted(SLOTS))}</select><div id="cmpg" class="cmpg"></div></div>{LINEAGE}<details class="her"><summary>Heritage marks and current canon search</summary><div class="hs"><img src="heritage/goat.jpg" alt="Goat mark" loading="lazy"><img src="heritage/omega-lyre-gold.jpg" alt="Omega lyre gold" loading="lazy"><img src="heritage/omega-lyre-aegean.jpg" alt="Omega lyre aegean" loading="lazy"><img src="heritage/omega-stonepunk.jpg" alt="Omega stonepunk" loading="lazy"><img src="current/canon-search-1440.png" alt="Current canon search" loading="lazy"><img src="current/explore-1440.png" alt="Current explore" loading="lazy"></div></details></div>
{"".join(secs)}</main></div>
<div id="lb" class="lbx" hidden role="dialog" aria-modal="true" aria-label="Preview"><button class="lbc" aria-label="Close">×</button><button class="lbp" aria-label="Previous">‹</button><div class="lbv"></div><button class="lbn" aria-label="Next">›</button><p class="lbt"></p><div class="lbo"><button data-dev="d" aria-pressed="true">1440×900</button><button data-dev="m" aria-pressed="false">390×844</button><button data-z="1" aria-pressed="false">1:1</button></div></div>
<script>const SL={json.dumps(SLOTS)},NAMES={json.dumps({d["id"]:d["n"]+" "+d["name"] for d in D})};
document.querySelectorAll(".dir").forEach(sec=>{{const bs=sec.querySelectorAll("[role=tab]"),ps=sec.querySelectorAll(".tp");bs.forEach(b=>b.onclick=()=>{{bs.forEach(x=>x.setAttribute("aria-selected",x===b));ps.forEach(p=>p.hidden=p.dataset.p!==b.dataset.t)}})}});
const lb=document.getElementById("lb"),lv=lb.querySelector(".lbv"),lt=lb.querySelector(".lbt");let L=[],K=0;
let DEV=innerWidth<700?"m":"d",ONE=false,OPENER=null;
function fit(){{const w=lv.querySelector(".vp");if(!w)return;const W=DEV==="d"?1440:390,Hh=DEV==="d"?900:844;w.style.width=W+"px";w.style.height=Hh+"px";const s=ONE?1:Math.min(lv.clientWidth/W,lv.clientHeight/Hh);w.style.transform=`scale(${{s}})`;w.parentElement.style.width=W*s+"px";w.parentElement.style.height=Hh*s+"px";lv.classList.toggle("one",ONE)}}
function show(){{const a=L[K],h=a.getAttribute("href");ONE=false;lb.querySelector("[data-z]").setAttribute("aria-pressed","false");lb.classList.toggle("noh",!/\\.html$/.test(h));lb.querySelectorAll("[data-dev]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.dev===DEV));lv.innerHTML=/\.html$/.test(h)?`<div class="vpw"><div class="vp"><iframe src="${{h}}" title="full view"></iframe></div></div>`:/\.mp4$/.test(h)?`<video src="${{h}}" controls autoplay muted loop></video>`:`<img src="${{h}}" alt="">`;fit();lt.textContent=(a.querySelector(".pn")||a).textContent+"  ·  "+(K+1)+"/"+L.length+"  ·  "+h}}
lb.querySelectorAll("[data-dev]").forEach(b=>b.onclick=()=>{{DEV=b.dataset.dev;lb.querySelectorAll("[data-dev]").forEach(x=>x.setAttribute("aria-pressed",x===b));fit()}});lb.querySelector("[data-z]").onclick=e=>{{ONE=!ONE;e.target.setAttribute("aria-pressed",ONE);fit()}};addEventListener("resize",fit);
document.addEventListener("click",e=>{{const a=e.target.closest("a.tl,a.lc,a.cm");if(!a||e.metaKey||e.ctrlKey)return;e.preventDefault();L=[...a.parentElement.querySelectorAll("a.tl,a.lc,a.cm")];K=L.indexOf(a);OPENER=a;lb.hidden=false;show();requestAnimationFrame(fit);lb.querySelector(".lbc").focus()}});
const nav=d=>{{K=(K+d+L.length)%L.length;show()}};lb.querySelector(".lbp").onclick=()=>nav(-1);lb.querySelector(".lbn").onclick=()=>nav(1);const close=()=>{{lb.hidden=true;lv.innerHTML="";OPENER&&OPENER.focus()}};lb.addEventListener("keydown",e=>{{if(e.key!=="Tab")return;const f=[...lb.querySelectorAll("button:not([hidden]),iframe,video")].filter(x=>x.offsetParent);if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){{e.preventDefault();f[f.length-1].focus()}}else if(!e.shiftKey&&i===f.length-1){{e.preventDefault();f[0].focus()}}}});lb.querySelector(".lbc").onclick=close;lb.onclick=e=>{{if(e.target===lb)close()}};
document.addEventListener("keydown",e=>{{if(lb.hidden)return;if(e.key==="ArrowRight")nav(1);if(e.key==="ArrowLeft")nav(-1);if(e.key==="Escape")close()}});
document.getElementById("slot").onchange=e=>{{const s=SL[e.target.value]||{{}};document.getElementById("cmpg").innerHTML=Object.keys(NAMES).map(i=>s[i]?`<a class="cm" href="${{s[i][1]}}"><span class="pv"><img src="${{s[i][0]}}" alt="" loading="lazy"></span><span class="pn">${{NAMES[i]}}</span></a>`:`<span class="cm none"><span class="pn">${{NAMES[i]}}: none</span></span>`).join("")}};
</script>
<script>const R=[...document.querySelectorAll(".rd")];
function showDir(id){{document.querySelectorAll(".dirv").forEach(s=>{{const on=s.id===id;s.hidden=!on;if(on){{s.classList.remove("in");void s.offsetWidth;s.classList.add("in")}}}});R.forEach(r=>{{if(r.dataset.d!==id)r.open=false;r.querySelector("summary").setAttribute("aria-current",r.dataset.d===id)}});history.replaceState(null,"","#"+id);if(id!=="top")requestAnimationFrame(fitFrames);document.getElementById("main").scrollTo({{top:0}})}}
R.forEach(r=>r.addEventListener("toggle",()=>{{if(r.open)showDir(r.dataset.d)}}));
document.querySelector(".rh").onclick=e=>{{e.preventDefault();R.forEach(r=>r.open=false);showDir("top")}};
document.querySelectorAll(".rd nav a").forEach(a=>a.onclick=e=>{{e.preventDefault();const t=document.getElementById(a.getAttribute("href").slice(1));history.replaceState(null,"",a.getAttribute("href"));t&&t.scrollIntoView({{behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"}})}});
document.querySelectorAll(".ov").forEach(o=>o.onclick=e=>{{e.preventDefault();const id=o.getAttribute("href").slice(1);const r=R.find(x=>x.dataset.d===id);r.open=true}});
function fitFrames(){{document.querySelectorAll(".dirv:not([hidden]) .fw").forEach(f=>{{const W=+f.dataset.w,H=+f.dataset.h,s=f.clientWidth/W;const i=f.querySelector("iframe");i.style.width=W+"px";i.style.height=H+"px";i.style.transform=`scale(${{s}})`;f.style.height=H*s+"px"}})}}addEventListener("resize",fitFrames);
const h=location.hash.slice(1),hd=h.split("-")[0],hr=R.find(x=>x.dataset.d===hd);if(hr){{hr.open=true;if(h!==hd)setTimeout(()=>{{const t=document.getElementById(h);t&&t.scrollIntoView()}},400)}}
</script><script type="importmap">{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}}}</script>
<script type="module">
import * as THREE from "three";import {{GLTFLoader}} from "three/addons/loaders/GLTFLoader.js";import {{OrbitControls}} from "three/addons/controls/OrbitControls.js";
const still=matchMedia("(prefers-reduced-motion: reduce)").matches;
const L={{flat:[[0,5,5,1.2,0xffffff]],lantern:[[-3,2,4,1.6,0xffd9a0],[3,1,-2,.4,0x8fa8d8]],gloss:[[2,4,5,2,0xffffff],[-4,1,2,.8,0xffc800]],rake:[[-6,1,2,3,0xffffff]],window:[[4,5,3,2,0xffe2b0],[-3,0,2,.5,0x3fc1c9]],studio:[[3,6,4,1.5,0xffffff],[-4,2,3,.6,0xffffff]]}};
for(const cv of document.querySelectorAll("canvas.live3")){{
 const r=new THREE.WebGLRenderer({{canvas:cv,antialias:true}});r.setPixelRatio(Math.min(devicePixelRatio,2));r.setSize(cv.clientWidth,cv.clientWidth,false);r.toneMapping=THREE.ACESFilmicToneMapping;
 const s=new THREE.Scene();s.background=new THREE.Color(cv.dataset.bg);s.add(new THREE.HemisphereLight(0xffffff,0x444444,.6));
 for(const [x,y,z,i,c] of L[cv.dataset.light]){{const d=new THREE.DirectionalLight(c,i);d.position.set(x,y,z);s.add(d)}}
 const cam=new THREE.PerspectiveCamera(30,1,.1,100);cam.position.set(0,0,6);const oc=new OrbitControls(cam,cv);oc.enableZoom=false;oc.autoRotate=!still;oc.autoRotateSpeed=1.2;
 new GLTFLoader().load(cv.dataset.glb,g=>{{const o=g.scene;const b=new THREE.Box3().setFromObject(o);const z=b.getSize(new THREE.Vector3()).length();o.scale.setScalar(3/z);b.setFromObject(o);o.position.sub(b.getCenter(new THREE.Vector3()));s.add(o)}});
 let vis=false;new IntersectionObserver(e=>vis=e[0].isIntersecting).observe(cv);
 r.setAnimationLoop(()=>{{if(!vis)return;oc.update();r.render(s,cam)}});
}}
</script></body></html>'''
open(DD+"index.html","w").write(page)
L=["# bkt Design Directions, Round 2","","Brand-kit Step 1. Page: `brand/_directions/index.html`; screens in `_directions/screens/`, icons in `_directions/icons/`, references in `_directions/refs/<id>/`. Round 1 archived at `brand/_archive/2026-10/directions-v1/`. Each direction pairs one art movement with one shipping design system and cites both. Art is gpt-image-1 high quality, three candidates per direction, best one cropped. Marks and icons are hand-written SVG on a 24px grid.","","| # | Name | Movement | System | Accent | Display type | Scale | Motion |","|---|------|----------|--------|--------|--------------|-------|--------|"]
for d,pr,S in md: L.append(f'| {d["n"]} | {d["name"]} | {d["movement"]} | {d["system"]} | {d["c"]["acc"]} | {d["disp"].strip(chr(39))} | {T[d["id"]]["scale"].split(":")[0]} | {d["ease"]} {d["dur"]} |')
for d,pr,S in md:
    L+=["",f'## {d["n"]} {d["name"]}',"",d["feel"],"",f'- Color: '+", ".join(f"{k} {v}" for k,v in d["c"].items()),f'- Type: {T[d["id"]]["scale"]}; display {d["disp"].strip(chr(39))} {d["dispw"]}, body {d["body"].strip(chr(39))}, Hebrew {T[d["id"]]["heb"]}',f'- Layout: {d["layout"]}',f'- Illustration: {d["illus"]}',f'- Icons: {SPEC[d["id"]]["grid"]}',f'- Motion: {d["motion"]}','- Contrast: '+"; ".join(f"{n} {r:.2f}:1" for n,f,b,r in pr),"- Sources:"]+[f"  - [{t}]({u})" for t,u in d["src"]]+(["- References:"]+[f'  - [{s["title"]}]({s["url"]}), {s.get("license","")}' for s in S] if S else [])
SC={}
for ln in open(SRC_DIR+'/scores.txt'):
    p_=ln.split()
    if len(p_)==4: SC.setdefault(p_[0],{})[int(p_[1])]=(p_[2],p_[3])
L+=["","## Critic Rounds","","Bucket critic, design rubric frozen before round 1, pass above 8.0 with every dimension at least 7.0 and no open high finding.","","| # | Name | Round 1 | Round 2 | Round 3 |","|---|------|---------|---------|---------|"]
for d in D:
    r=SC.get(d["id"],{})
    L.append(f'| {d["n"]} | {d["name"]} | '+" | ".join(f"{r[k][0]} {r[k][1].lower()}" if k in r else "" for k in (1,2,3))+" |")
open(B+"DESIGN-DIRECTIONS.md","w").write("\n".join(L)+"\n")
print("built")
