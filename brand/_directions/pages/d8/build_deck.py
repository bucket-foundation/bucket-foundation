from pathlib import Path

HERE = Path(__file__).resolve().parent
s = (HERE / "slide.html").read_text()


def cut(start, end):
    i = s.index(start)
    return s[i:s.index(end, i)]


i = s.index('<svg viewBox="0 -78 100 184" class="fire"')
pot = s[i:s.index("</svg>", i) + 6]
import re
DEFS = re.search(r"<defs>.*?</defs>", pot, re.S).group(0)
pot = pot.replace(DEFS, "")
potcss = cut(".fl{transform-origin", "@media (prefers-reduced-motion:reduce){.fl")
col = cut(".azu{", ".ink{")
fl = s[s.index('<link href="https://fonts'):s.index(">", s.index('<link href="https://fonts')) + 1]
memphis = s[s.index(".memphis{"):s.index("\n", s.index(".memphis{"))]

SKINS = [("", "Tyrian purple"), ("kente", "Kente · Ghana"), ("azulejo", "Azulejo · Portugal"),
         ("girih", "Girih · Persia"), ("seal", "Seal key · China"), ("paisley", "Paisley · Kashmir"),
         ("mudcloth", "Bògòlanfini · Mali")]


def skin(k):
    p = pot.replace('class="fire"', 'class="fire sm"').replace('class="mho face"', 'class="mho fixed"')
    if k:
        p = p.replace('stroke="#5B1A4A" stroke-width="13"', f'stroke="url(#sk-{k})" stroke-width="13"')
    return p


sk_html = "".join(f'<div class="sk">{skin(k)}<span>{n}</span></div>' for k, n in SKINS)

PAL = [("Parchment", "#F6EEDC", "Paper, page ground"), ("Ink", "#231F20", "Text, keylines"),
       ("Tyrian purple", "#5B1A4A", "Phoenicia · the cut, the mark"), ("Vermilion", "#D9381E", "China · action"),
       ("Ochre", "#E9A23B", "Lascaux · fire, warmth"), ("Lapis", "#26428B", "Afghanistan · depth"),
       ("Malachite", "#1E7A5A", "Egypt · growth"), ("Maya blue", "#6FB7C2", "Mesoamerica · air")]
pal_html = "".join(f'<div class="sw"><i style="background:{h}"></i><b>{n}</b><code>{h}</code><span>{u}</span></div>' for n, h, u in PAL)

CSS = """
:root{--bg:#F6EEDC;--ink:#231F20;--pur:#5B1A4A;--lip:#3A0F2F;--ochre:#E9A23B;--cta:#D9381E;--cta-lip:#8E2312;--muted:#5d5650;--line:#E3D6B8}
*{box-sizing:border-box;margin:0}
html,body{height:100%;overflow:hidden;background:#151213}
.stage{position:fixed;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}
.s{position:absolute;inset:0;background:var(--bg);background-image:radial-gradient(#e2d4b4 1.4px,transparent 1.5px);background-size:32px 32px;font-family:Nunito,sans-serif;color:var(--ink);padding:110px 150px;overflow:hidden;display:none}
.s.on{display:block}
.s.dark{background:var(--pur);color:#F6EEDC;background-image:none}
.n{position:absolute;right:60px;bottom:40px;font-family:'Space Mono';font-size:16px;color:#9a8f80}
.k{font-family:'Space Mono';font-weight:700;font-size:20px;letter-spacing:.16em;text-transform:uppercase;color:var(--cta)}
.dark .k{color:var(--ochre)}
h1{font-family:Fredoka;font-weight:700;font-size:150px;line-height:.95;letter-spacing:-.02em}
h2{font-family:Fredoka;font-weight:700;font-size:84px;line-height:1;margin:16px 0 40px}
h1 em,h2 em{font-style:normal;color:var(--cta)}
p.l{font-size:30px;line-height:1.45;max-width:1100px;color:var(--muted)}
.dark p.l{color:#e3d7c2}
a{color:var(--cta)}
.row{display:flex;gap:28px;flex-wrap:wrap;align-items:flex-start}
.sw{width:168px}.sw i{display:block;height:168px;border-radius:18px;box-shadow:inset 0 0 0 2px rgba(0,0,0,.1),0 6px 0 rgba(0,0,0,.18)}
.sw b{display:block;font-size:24px;margin-top:16px}.sw code{font-family:'Space Mono';font-size:16px;color:var(--muted)}.sw span{display:block;font-size:16px;color:var(--muted);margin-top:6px;line-height:1.35}
.ty{display:grid;grid-template-columns:340px 1fr;gap:24px 40px;align-items:baseline}
.ty .lab{font-family:'Space Mono';font-size:18px;color:var(--muted)}
.fire{width:220px;height:400px;overflow:visible}
.fire.sm{width:120px;height:220px}
.sk{display:flex;flex-direction:column;align-items:center;gap:8px;width:190px}.sk span{font-family:'Space Mono';font-size:15px;text-align:center}
.col{position:relative;height:640px;background:var(--lip);border-radius:28px;overflow:hidden}.col>*{position:absolute}
.mini{font-weight:800;font-size:40px;color:#F6EEDC;opacity:.75}
.cap{font-family:'Space Mono';font-size:14px;color:#F6EEDC;background:rgba(0,0,0,.4);padding:4px 10px;border-radius:6px}
.btn{font-family:Nunito;font-weight:800;font-size:30px;padding:24px 48px;border-radius:12px;border:0}
.btn-p{background:var(--cta);color:#fff;box-shadow:0 5px 0 var(--cta-lip)}.btn-s{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line),0 5px 0 var(--line)}
.frame{border:0;border-radius:18px;box-shadow:0 10px 0 rgba(0,0,0,.15);background:#fff}
ul.r{font-size:34px;line-height:1.7;padding-left:34px}
.mk{width:260px;height:260px;border-radius:64px;background:var(--pur);display:grid;place-items:center;box-shadow:0 12px 0 var(--lip)}.mk img{width:220px}
.big .t{width:240px;height:240px}
.nav{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);font-family:'Space Mono';font-size:12px;color:#9a8f80}
"""

SLIDES = f"""
<section class="s"><div class="memphis"></div><div class="row" style="align-items:center;gap:50px;margin-top:140px"><div class="mk"><img src="mark-d8.svg" alt="℧"></div><h1>bkt<br><em>brand</em></h1></div><p class="l" style="margin-top:60px">Language learning for multilingual learners. Bucket Foundation, working system, October 2026.</p></section>
<section class="s dark"><p class="k">Idea</p><h2>Every culture brings its own color.</h2><p class="l">The ground is parchment and ink. Everything loud comes from somewhere real: a flag, a pigment, a tile, a cloth. The words sit at the center, and the world crowds in around them.</p></section>
<section class="s"><p class="k">Mark</p><h2>The ℧ holds the fire.</h2><div class="row" style="gap:90px;align-items:center"><div class="mk"><img src="mark-d8.svg" alt="℧"></div>{pot}<div style="max-width:640px"><p class="l">An inverted omega: a bowl that carries the streak as a living flame. The final mark is still open.</p><p class="l" style="margin-top:24px"><a href="omega.html">Omega exploration</a></p></div></div></section>
<section class="s"><p class="k">Color</p><h2>Historic pigments.</h2><div class="row">{pal_html}</div><p class="l" style="margin-top:50px">Flags appear at full strength only on flag tiles and tile borders.</p></section>
<section class="s"><p class="k">Type</p><h2>Round type for every script.</h2><div class="ty"><span class="lab">Display · Fredoka 700</span><span style="font-family:Fredoka;font-weight:700;font-size:96px">Hear it said.</span><span class="lab">Body · Nunito</span><span style="font-size:34px">One word, many languages, one streak.</span><span class="lab">Label · Space Mono</span><span style="font-family:'Space Mono';font-weight:700;font-size:26px;letter-spacing:.14em">FRENCH · /sɑ̃/</span><span class="lab">Scripts · Noto</span><span style="font-size:64px;font-weight:800"><span style="font-family:'Noto Sans Hebrew'">מאה</span> · <span style="font-family:'Noto Sans Arabic'">مئة</span> · <span style="font-family:'Noto Sans Devanagari'">सौ</span> · <span style="font-family:'Noto Sans SC'">百</span> · <span style="font-family:'Noto Sans'">εκατό</span></span></div></section>
<section class="s"><p class="k">Word tiles</p><h2>The hero of every screen.</h2><div class="row big" data-tiles="text" data-cycle="2200"></div><p class="l" style="margin-top:56px">Low color face, full flag border. Language top left, speaker right of the word, IPA below. Tap to hear. Tiles flip to new languages.</p></section>
<section class="s"><p class="k">Flag tiles</p><h2>Full color, no words.</h2><div class="row big" data-tiles="bare"></div><p class="l" style="margin-top:56px">Glazed and tilted, like hand-laid ceramic. Used to pick a language.</p></section>
<section class="s"><p class="k">Streak</p><h2>The bowl wears the world.</h2><div class="row" style="gap:16px">{sk_html}</div><p class="l" style="margin-top:40px">On live pages the ℧ ring rotates through these textiles and tilework every three seconds.</p></section>
<section class="s dark"><p class="k">Collage</p><h2>Chaos with a passport.</h2><div class="col">
<div class="azu" style="left:80px;top:70px;transform:rotate(12deg)"></div><span class="cap" style="left:80px;top:290px">Azulejo · Lisbon</span>
<div class="seal" style="left:400px;top:80px;transform:rotate(-7deg)"><span>百</span></div><span class="cap" style="left:400px;top:290px">Seal · China</span>
<div class="stamp" style="left:680px;top:110px;transform:rotate(6deg)"><b style="font-family:'Noto Sans'">ἑκατόν</b><small>ATHENS · 400 BC</small></div><span class="cap" style="left:690px;top:290px">Stamp · Greece</span>
<div class="kente" style="left:1060px;top:140px;transform:rotate(-12deg)"></div><span class="cap" style="left:1100px;top:290px">Kente · Ghana</span>
<div class="torn" style="left:120px;top:390px;transform:rotate(-4deg)"><span style="font-family:'Noto Sans Devanagari'">शतम्</span></div><span class="cap" style="left:130px;top:540px">Torn page · Sanskrit</span>
<div class="paisley" style="left:560px;top:370px;transform:rotate(25deg)"></div><span class="cap" style="left:530px;top:550px">Paisley · Kashmir</span>
<div class="mini" style="left:860px;top:410px;transform:rotate(-12deg);font-family:'Noto Sans Hebrew'">מאה</div><div class="mini" style="left:1050px;top:460px;transform:rotate(18deg);font-family:'Noto Sans'">сто</div><div class="mini" style="left:1250px;top:400px;transform:rotate(-30deg);font-family:'Noto Sans'">백</div><span class="cap" style="left:960px;top:550px">Scattered words</span>
</div></section>
<section class="s"><div class="memphis"></div><p class="k">Confetti</p><h2>Motifs from real crafts.</h2><p class="l">Girih star, Greek key, Chinese cloud scroll, lotus petal. Pigment colors only, on the margins, at half strength.</p></section>
<section class="s"><p class="k">Buttons</p><h2>Flat buttons with one lip.</h2><div class="row" style="gap:30px;align-items:center"><button class="btn btn-p">Start learning</button><button class="btn btn-s">Explore the canon</button></div><p class="l" style="margin-top:50px">12px corners, a 4px darker lip, no outlines, no pills.</p></section>
<section class="s"><p class="k">Layouts</p><h2>One screen, no scroll.</h2><div class="row" style="gap:40px"><iframe class="frame" src="slide.html" style="width:1920px;height:1080px;transform:scale(.6);transform-origin:0 0;margin-right:-728px;margin-bottom:-432px"></iframe><iframe class="frame" src="mobile.html" style="width:390px;height:844px;transform:scale(.77);transform-origin:0 0;margin-bottom:-194px;margin-right:-90px"></iframe></div></section>
<section class="s"><p class="k">Voice</p><h2>Short, warm, direct.</h2><ul class="r"><li>Name the thing and stop.</li><li>No subtitles under the headline.</li><li>Words in their own script, always with IPA.</li><li>Credit every cultural source.</li></ul></section>
<section class="s dark"><p class="k">Retired</p><h2>Tried and dropped.</h2><ul class="r"><li>Greek meander border on top</li><li>Geometric shapes as hero art</li><li>Neat diagrams and speech bubbles</li><li>Black circle sound buttons</li></ul></section>
"""

JS = """
const S=[...document.querySelectorAll('.s')];let c=Math.max(0,Math.min(S.length-1,+(location.hash.slice(1)||1)-1));
S.forEach((s,i)=>s.insertAdjacentHTML('beforeend',`<span class="n">${i+1} / ${S.length}</span>`));
const show=()=>{S.forEach((s,i)=>s.classList.toggle('on',i===c));history.replaceState(null,'','#'+(c+1))};
const fit=()=>{const k=Math.min(innerWidth/1920,innerHeight/1080);st.style.transform=`translate(${(innerWidth-1920*k)/2}px,${(innerHeight-1080*k)/2}px) scale(${k})`};
addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key))c=Math.min(S.length-1,c+1);if(['ArrowLeft','PageUp'].includes(e.key))c=Math.max(0,c-1);show()});
addEventListener('click',e=>{if(e.target.closest('.t,a,button,iframe'))return;c=e.clientX>innerWidth/2?Math.min(S.length-1,c+1):Math.max(0,c-1);show()});
addEventListener('resize',fit);fit();show();
(()=>{const K=["#5B1A4A","url(#sk-kente)","url(#sk-azulejo)","url(#sk-girih)","url(#sk-seal)","url(#sk-paisley)","url(#sk-mudcloth)"];let i=0;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;setInterval(()=>{i=(i+1)%K.length;document.querySelectorAll('.mho.face').forEach(p=>p.setAttribute('stroke',K[i]))},3000)})();
"""

out = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bucket Brand Deck</title>
{fl}
<link rel="stylesheet" href="tiles.css">
<style>{CSS}{memphis}
{potcss}
{col}</style></head><body>
<svg width="0" height="0" style="position:absolute">{DEFS}</svg>
<div class="stage" id="st">{SLIDES}</div>
<div class="nav">arrow keys or click to move</div>
<script src="tiles.js"></script>
<script>{JS}</script></body></html>"""
(HERE / "deck.html").write_text(out)
