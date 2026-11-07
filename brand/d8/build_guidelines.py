import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SLIDE = Path.home() / "agfarms/.wt-brand-d8/polingual/public/d8/slide.html"
s = SLIDE.read_text()
i = s.index('<svg viewBox="0 -78 100 184" class="fire"')
pot = s[i:s.index("</svg>", i) + 6]
pot_css = s[s.index(".fl{transform-origin"):s.index("@media (prefers-reduced-motion:reduce){.fl")]
col_css = s[s.index(".azu{"):s.index(".ink{")]
defs = re.search(r"<defs>.*?</defs>", pot, re.S).group(0)
pot_plain = pot.replace(defs, "")

SKINS = [("", "Tyrian purple"), ("kente", "Kente, Ghana"), ("azulejo", "Azulejo, Portugal"), ("girih", "Girih, Persia"),
         ("seal", "Seal key, China"), ("paisley", "Paisley, Kashmir"), ("mudcloth", "Bògòlanfini, Mali")]


def skin(k):
    p = pot_plain.replace('class="mho face"', 'class="mho"')
    if k:
        p = p.replace('stroke="#5B1A4A" stroke-width="13"', f'stroke="url(#sk-{k})" stroke-width="13"')
    return p


PAL = [("Parchment", "#F6EEDC", "Page ground"), ("Ink", "#231F20", "Text, keylines, shadows"),
       ("Tyrian purple", "#5B1A4A", "Phoenicia. The cut, the marks, the art field"),
       ("Vermilion", "#D9381E", "China. One action per screen, the key word"),
       ("Ochre", "#E9A23B", "Lascaux. Fire, warmth, highlights"), ("Lapis", "#26428B", "Afghanistan. Depth"),
       ("Malachite", "#1E7A5A", "Egypt. Success, growth"), ("Maya blue", "#6FB7C2", "Mesoamerica. Air, tiles")]

pal = "".join(f'<div class="sw"><i style="background:{h}"></i><b>{n}</b><code>{h}</code><span>{u}</span></div>' for n, h, u in PAL)
skins = "".join(f'<figure class="sk">{skin(k)}<figcaption>{n}</figcaption></figure>' for k, n in SKINS)

SECTIONS = [("brands", "Brands"), ("marks", "Marks"), ("color", "Color"), ("type", "Type"), ("tiles", "Word tiles"),
            ("streak", "Streak"), ("collage", "Collage"), ("scenes", "Scenes"), ("buttons", "Buttons"),
            ("layout", "Layout"), ("motion", "Motion"), ("voice", "Voice"), ("dont", "Retired"), ("files", "Files")]
nav = "".join(f'<a href="#{a}">{t}</a>' for a, t in SECTIONS)

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bucket and Polingual Brand</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;700;800&family=Space+Mono:wght@400;700&family=Noto+Sans:wght@400;800&family=Noto+Sans+Hebrew:wght@800&family=Noto+Sans+Arabic:wght@800&family=Noto+Sans+Devanagari:wght@800&family=Noto+Sans+SC:wght@800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="tiles.css">
<style>
*{{box-sizing:border-box;margin:0}}
body{{background:var(--parchment);background-image:radial-gradient(var(--dot) 1.2px,transparent 1.3px);background-size:28px 28px;font-family:var(--font-body);color:var(--ink)}}
.side{{position:fixed;left:0;top:0;bottom:0;width:220px;padding:28px 22px;border-right:2px solid var(--line);background:var(--parchment);overflow:auto}}
.side .lg{{display:flex;gap:10px;align-items:center;margin-bottom:28px}}.side .lg img{{width:40px;height:40px;border-radius:10px}}
.side .lg b{{font-family:var(--font-display);font-size:20px;line-height:1.05}}
.side a{{display:block;color:var(--ink-2);text-decoration:none;font-weight:800;font-size:15px;padding:7px 0}}.side a:hover{{color:var(--vermilion)}}
main{{margin-left:220px;padding:56px 64px 120px;max-width:1360px}}
section{{padding:56px 0;border-bottom:2px solid var(--line)}}
.k{{font-family:var(--font-label);font-weight:700;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--vermilion)}}
h1{{font-family:var(--font-display);font-size:88px;line-height:.95;letter-spacing:-.02em}}h1 em{{font-style:normal;color:var(--vermilion)}}
h2{{font-family:var(--font-display);font-size:52px;line-height:1;margin:10px 0 18px}}
p.l{{font-size:20px;line-height:1.5;color:var(--ink-2);max-width:780px}}
.row{{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;margin-top:28px}}
.card{{background:#fff;border-radius:var(--r-card);padding:26px;box-shadow:inset 0 0 0 2px var(--line)}}
.two{{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:28px}}
.brandcard{{border-radius:24px;padding:40px;min-height:320px;display:flex;flex-direction:column;justify-content:space-between}}
.brandcard img{{width:120px;height:120px;border-radius:28px;box-shadow:var(--shadow-piece)}}
.brandcard b{{font-family:var(--font-display);font-size:44px}}.brandcard span{{font-size:17px;opacity:.85}}
.sw{{width:150px}}.sw i{{display:block;height:150px;border-radius:16px;box-shadow:inset 0 0 0 2px rgba(0,0,0,.08),0 6px 0 rgba(0,0,0,.15)}}
.sw b{{display:block;font-size:19px;margin-top:12px}}.sw code{{font-family:var(--font-label);font-size:14px;color:var(--ink-2)}}.sw span{{display:block;font-size:14px;color:var(--ink-2);margin-top:4px;line-height:1.4}}
.ty{{display:grid;grid-template-columns:260px 1fr;gap:22px 32px;align-items:baseline;margin-top:28px}}.ty .lab{{font-family:var(--font-label);font-size:14px;color:var(--ink-2)}}
.do,.dn{{border-radius:16px;padding:20px 22px;font-size:17px;line-height:1.5}}.do{{background:#E4F1E9;box-shadow:inset 0 0 0 2px #1E7A5A}}.dn{{background:#F9E1DB;box-shadow:inset 0 0 0 2px #D9381E}}
.do b,.dn b{{display:block;font-family:var(--font-label);font-size:13px;letter-spacing:.12em;margin-bottom:8px}}
.fire{{width:150px;height:276px;overflow:visible}}.sk .fire{{width:96px;height:176px}}
.sk{{display:flex;flex-direction:column;align-items:center;gap:8px;width:140px}}.sk figcaption{{font-family:var(--font-label);font-size:13px;text-align:center}}
{pot_css}
.collage{{position:relative;height:560px;background:var(--tyrian);border-radius:24px;overflow:hidden;margin-top:28px}}.collage>*{{position:absolute}}
{col_css}
.mini{{font-weight:800;font-size:40px;color:#F6EEDC;opacity:.75}}
.cap{{font-family:var(--font-label);font-size:13px;color:#F6EEDC;background:rgba(0,0,0,.4);padding:4px 9px;border-radius:6px}}
.btn{{font-family:var(--font-body);font-weight:800;font-size:20px;padding:18px 36px;border-radius:var(--r-btn);border:0}}
.btn-p{{background:var(--vermilion);color:#fff;box-shadow:var(--lip) var(--vermilion-lip)}}.btn-s{{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 2px var(--line),var(--lip) var(--line)}}
iframe.f{{border:0;border-radius:18px;box-shadow:0 0 0 3px var(--ink),0 10px 0 rgba(0,0,0,.15);background:#fff}}
table{{border-collapse:collapse;margin-top:24px;font-size:16px}}td,th{{text-align:left;padding:10px 18px 10px 0;border-bottom:1px solid var(--line);vertical-align:top}}th{{font-family:var(--font-label);font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}}
ul.r{{font-size:19px;line-height:1.8;padding-left:24px;color:var(--ink-2)}}
a.dl{{display:inline-block;margin:6px 10px 0 0;padding:10px 14px;background:#fff;border-radius:10px;box-shadow:inset 0 0 0 2px var(--line);font-weight:800;color:var(--ink);text-decoration:none}}
@media (max-width:900px){{.side{{position:static;width:auto;border:0}}.side a{{display:inline-block;margin-right:14px}}main{{margin:0;padding:24px 16px 80px}}h1{{font-size:52px}}h2{{font-size:36px}}.two{{grid-template-columns:1fr}}.ty{{grid-template-columns:1fr}}}}
</style></head><body>
<svg width="0" height="0" style="position:absolute">{defs}</svg>
<nav class="side"><div class="lg"><img src="bucket-icon.svg" alt=""><b>Brand<br>guidelines</b></div>{nav}</nav>
<main>
<header><p class="k">D8 · Global Squiggle · October 2026</p><h1>Every culture brings<br>its own <em>color.</em></h1><p class="l" style="margin-top:22px">The ground is parchment and ink. Everything loud comes from somewhere real: a flag, a pigment, a tile, a cloth. The words sit at the center, and the world crowds in around them.</p></header>

<section id="brands"><p class="k">Brands</p><h2>Two products, one system.</h2>
<div class="two">
<div class="brandcard" style="background:var(--tyrian);color:var(--parchment)"><img src="bucket-icon.svg" alt="Bucket mark"><div><b>Bucket</b><br><span>The foundation and the canon. Primary research, free to read, paid once to cite. Mark: the ℧ with a flame drop.</span></div></div>
<div class="brandcard" style="background:#fff;box-shadow:inset 0 0 0 2px var(--line)"><img src="polingual-icon.svg" alt="Polingual mark"><div><b style="color:var(--tyrian-deep)">polingual</b><br><span>Language learning for multilingual learners. iOS beta on TestFlight. Mark: the Po tile.</span></div></div>
</div></section>

<section id="marks"><p class="k">Marks</p><h2>The ℧ holds the fire.</h2><p class="l">Bucket's mark is an inverse omega: a bowl. It carries the streak as a living flame. Polingual uses the Po tile; its accent is still open, with a diacritic over the o as the lead option.</p>
<div class="row"><img src="bucket-icon.svg" width="180" height="180" style="border-radius:40px" alt=""><img src="bucket-icon.svg" width="96" height="96" style="border-radius:22px" alt=""><img src="bucket-icon.svg" width="48" height="48" style="border-radius:11px" alt=""><img src="polingual-icon.svg" width="180" height="180" style="border-radius:40px" alt=""><img src="polingual-icon.svg" width="96" height="96" style="border-radius:22px" alt=""><img src="polingual-icon.svg" width="48" height="48" style="border-radius:11px" alt=""></div>
<div class="two"><div class="do"><b>DO</b>Keep the ℧ upright with its feet level. Give it a third of the icon as padding. Keep the drop at the center of the bowl.</div><div class="dn"><b>DON'T</b>Draw the lyre, a plain U, or a bucket pail. Outline the mark. Put it on a busy collage without its purple tile.</div></div></section>

<section id="color"><p class="k">Color</p><h2>Historic pigments.</h2><div class="row">{pal}</div><p class="l" style="margin-top:28px">Flags show at full strength only on flag tiles and tile borders. Vermilion marks one action per screen.</p></section>

<section id="type"><p class="k">Type</p><h2>Round type for every script.</h2><div class="ty">
<span class="lab">Display · Fredoka 700</span><span style="font-family:var(--font-display);font-size:72px;line-height:1">Hear it said.</span>
<span class="lab">Body · Nunito</span><span style="font-size:24px">One word, many languages, one streak.</span>
<span class="lab">Label · Space Mono</span><span style="font-family:var(--font-label);font-weight:700;font-size:20px;letter-spacing:.14em">FRENCH · /sɑ̃/</span>
<span class="lab">Scripts · Noto</span><span style="font-size:52px;font-weight:800"><span style="font-family:'Noto Sans Hebrew'">מאה</span> · <span style="font-family:'Noto Sans Arabic'">مئة</span> · <span style="font-family:'Noto Sans Devanagari'">सौ</span> · <span style="font-family:'Noto Sans SC'">百</span> · <span style="font-family:'Noto Sans'">εκατό</span></span>
</div><p class="l" style="margin-top:24px">Every word appears in its own script with its IPA beneath it, set in Noto Sans so diacritics and tone marks render.</p></section>

<section id="tiles"><p class="k">Word tiles</p><h2>The hero of every screen.</h2><div class="row" data-tiles="text" data-cycle="2400"></div>
<table><tr><th>Part</th><th>Rule</th></tr><tr><td>Face</td><td>Flag washed to 20% over parchment, full-color flag border</td></tr><tr><td>Language</td><td>Top left, Space Mono caps</td></tr><tr><td>Word and sound</td><td>Center, speaker icon to the right of the word, no circle</td></tr><tr><td>IPA</td><td>Below the word, Noto Sans</td></tr><tr><td>Motion</td><td>Tiles fade to a new language every 2.4 s; hovering or playing holds them</td></tr><tr><td>Flag tiles</td><td>Full color, no text, used to pick a language</td></tr></table>
<div class="row" data-tiles="bare"></div></section>

<section id="streak"><p class="k">Streak</p><h2>The bowl wears the world.</h2><div class="row">{skins}</div><p class="l" style="margin-top:22px">One flame, starting as the drop inside the bowl and rising out through the neck. On live pages the ring rotates through these textiles every 3 s. The number matches the word the tiles say.</p></section>

<section id="collage"><p class="k">Collage</p><h2>Chaos with a passport.</h2><p class="l">Every piece comes from a real craft. Credit the source when a piece is new.</p>
<div class="collage">
<div class="azu" style="left:70px;top:60px;transform:rotate(12deg)"></div><span class="cap" style="left:70px;top:260px">Azulejo · Lisbon</span>
<div class="seal" style="left:380px;top:70px;transform:rotate(-7deg)"><span>百</span></div><span class="cap" style="left:384px;top:256px">Seal · China</span>
<div class="stamp" style="left:660px;top:90px;transform:rotate(6deg)"><b style="font-family:'Noto Sans'">ἑκατόν</b><small>ATHENS · 400 BC</small></div><span class="cap" style="left:670px;top:256px">Stamp · Greece</span>
<div class="kente" style="left:880px;top:130px;transform:rotate(-12deg)"></div><span class="cap" style="left:920px;top:270px">Kente · Ghana</span>
<div class="torn" style="left:100px;top:360px;transform:rotate(-4deg)"><span style="font-family:'Noto Sans Devanagari'">शतम्</span></div><span class="cap" style="left:110px;top:500px">Torn page · Sanskrit</span>
<div class="paisley" style="left:520px;top:340px;transform:rotate(25deg)"></div><span class="cap" style="left:500px;top:510px">Paisley · Kashmir</span>
<div class="mini" style="left:800px;top:380px;transform:rotate(-12deg);font-family:'Noto Sans Hebrew'">מאה</div><div class="mini" style="left:980px;top:430px;transform:rotate(18deg);font-family:'Noto Sans'">сто</div><span class="cap" style="left:880px;top:510px">Scattered words</span>
</div></section>

<section id="scenes"><p class="k">Scenes</p><h2>Find it in the world.</h2><p class="l">A scene is a place from one culture, drawn in the collage style: flat pigment fills, a 4px ink keyline, a hard ink offset shadow, no gradients. The learner hears a word and taps the object. Paris holds a croissant and a baguette; Tokyo holds salmon and a lantern.</p>
<iframe class="f" src="scenes.html" title="Scene game" style="width:100%;height:620px;margin-top:24px"></iframe>
<table><tr><th>Rule</th><th>Value</th></tr><tr><td>Objects</td><td>Five to eight per scene, each at least 120px across at 1200 wide</td></tr><tr><td>Keyline and shadow</td><td>4px ink stroke; offset 6, 8 at 28% ink</td></tr><tr><td>Palette</td><td>Pigments only; food may use its own warm tones</td></tr><tr><td>Feedback</td><td>Correct pops and shows the word; a miss shakes and says the word it is</td></tr><tr><td>Source</td><td>Each scene names its place and language in the footer</td></tr></table></section>

<section id="buttons"><p class="k">Buttons</p><h2>Flat buttons with one lip.</h2><div class="row" style="align-items:center"><button class="btn btn-p">Join the beta</button><button class="btn btn-s">Explore the canon</button></div><p class="l" style="margin-top:22px">12px corners, a 4px darker lip, no outlines, no pills. One vermilion button per screen.</p></section>

<section id="layout"><p class="k">Layout</p><h2>One screen, no scroll.</h2><div class="row"><iframe class="f" src="https://www.polingual.com/" title="Desktop" style="width:1440px;height:900px;transform:scale(.5);transform-origin:0 0;margin:0 -720px -450px 0"></iframe><iframe class="f" src="https://www.polingual.com/" title="Phone" style="width:390px;height:844px;transform:scale(.53);transform-origin:0 0;margin:0 -183px -397px 0"></iframe></div>
<table><tr><th>Window</th><th>Layout</th></tr><tr><td>Under 430 wide</td><td>Phone: stacked, tiles 3 by 2, art strip at the bottom</td></tr><tr><td>430 to 679</td><td>Phone, tiles capped at 15vh, art strip keeps 26vh</td></tr><tr><td>680 and up, narrower than 5:4</td><td>Column: tiles left, full-height purple collage right</td></tr><tr><td>5:4 and wider</td><td>Desktop hero with the diagonal cut, stretched to the window height</td></tr></table></section>

<section id="motion"><p class="k">Motion</p><h2>Slow fire, quick words.</h2><table><tr><th>Element</th><th>Motion</th></tr><tr><td>Flame</td><td>Three layers sway at 0.6 to 1.1 s</td></tr><tr><td>Tiles</td><td>240 ms fade to a new language</td></tr><tr><td>Purple panel</td><td>650 ms slide and resize between layouts</td></tr><tr><td>All</td><td>Holds still under prefers-reduced-motion</td></tr></table></section>

<section id="voice"><p class="k">Voice</p><h2>Short, warm, direct.</h2><ul class="r"><li>Name the thing and stop.</li><li>No subtitle under the headline.</li><li>Words in their own script, always with IPA.</li><li>Credit every cultural source.</li></ul></section>

<section id="dont"><p class="k">Retired</p><h2>Tried and dropped.</h2><ul class="r"><li>Greek meander border on top</li><li>Geometric shapes as hero art</li><li>Neat diagrams and speech bubbles</li><li>Black circle sound buttons</li><li>The lyre mark</li></ul></section>

<section id="files"><p class="k">Files</p><h2>Take what you need.</h2><a class="dl" href="tokens.css" download>tokens.css</a><a class="dl" href="tokens.tailwind.cjs" download>tokens.tailwind.cjs</a><a class="dl" href="bucket-icon.svg" download>bucket-icon.svg</a><a class="dl" href="polingual-icon.svg" download>polingual-icon.svg</a><a class="dl" href="tiles.css" download>tiles.css</a><a class="dl" href="tiles.js" download>tiles.js</a><a class="dl" href="scenes.html">scenes.html</a></section>
</main>
<script src="tiles.js"></script>
<script>(()=>{{const K=["#5B1A4A","url(#sk-kente)","url(#sk-azulejo)","url(#sk-girih)","url(#sk-seal)","url(#sk-paisley)","url(#sk-mudcloth)"];let i=0;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;setInterval(()=>{{i=(i+1)%K.length;document.querySelectorAll('#marks .mho.face').forEach(p=>p.setAttribute('stroke',K[i]))}},3000)}})()</script>
</body></html>"""
(HERE / "index.html").write_text(html)
