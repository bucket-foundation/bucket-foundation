import os, re, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from made12 import enforce, shippo, igeta, d1_svg

G = {"__file__": os.path.abspath("gen_pages.py"), "__name__": "gp"}
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "gen_pages.py")).read().split("\nPAGES = dict(")[0]
exec(compile(src, "gen_pages.py", "exec"), G)
SK, head, shell, end = G["SK"], G["head"], G["shell"], G["end"]
from paths import DIRECTIONS_DIR as ROOT

CSS = {
"d1": """
.gx{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:0 8px}
.cap{font:400 12px/16px var(--mono);color:var(--muted)}
.seg16{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:2px}.seg16 i{height:16px;background:#E0E0E0}.seg16 i.on{background:#0F62FE}.seg16 i.nx{background:#161616}
.big{font:300 96px/96px var(--disp);letter-spacing:-.02em}
.badge{display:flex;flex-direction:column;gap:8px}.badge svg{width:100%;height:auto;aspect-ratio:1}
.st{font:400 12px/16px var(--mono)}
.mmap{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px}.mmap i{aspect-ratio:1;display:block;background:#F4F4F4;box-shadow:inset 0 0 0 1px #E0E0E0}.mmap .l1{background:#D0E2FF}.mmap .l2{background:#78A9FF}.mmap .l3{background:#0F62FE}.mmap .l4{background:#161616}
.leg{display:flex;flex-wrap:wrap;gap:16px}.leg span{display:inline-flex;gap:8px;align-items:center}.leg i{width:16px;height:16px;display:block;box-shadow:inset 0 0 0 1px #E0E0E0}
.lb li{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:16px;padding:12px 0;border-top:1px solid #E0E0E0;align-items:center}.lb li.me{background:#EDF5FF;box-shadow:inset 4px 0 0 #0F62FE;padding-left:12px}.lb .zone{font:400 12px/16px var(--mono);color:var(--muted);padding:8px 0;border-top:1px solid #161616}
.push{background:#161616;color:#F4F4F4;padding:16px;display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px}.push img{width:32px;height:32px}.push .muted{color:#C6C6C6}
.toast{border-left:4px solid #0F62FE;background:#F4F4F4;padding:16px}
.stage{position:relative;height:280px;background:#F4F4F4;overflow:hidden;border-top:1px solid #161616;contain:layout paint}
.stage .masc{position:absolute;right:16px;bottom:0;width:112px;height:112px}
.stage .msg{position:absolute;left:16px;top:24px;right:16px;font:300 clamp(24px,2.2vw,36px)/1.25 var(--disp);overflow-wrap:anywhere}
.stage .sq{position:absolute;width:16px;height:16px;background:#0F62FE;visibility:hidden}
.play .masc{animation:g1-hop 440ms steps(4,end) both}
.play .msg{animation:mk1-type 110ms steps(3,end) both 110ms}
.play .sq{animation:g1-flash 660ms steps(1,end) both;animation-delay:calc(var(--i)*55ms)}
@keyframes g1-hop{0%{transform:translateY(0)}25%{transform:translateY(-24px)}50%{transform:translateY(-32px)}75%{transform:translateY(-16px)}100%{transform:translateY(0)}}
@keyframes g1-flash{0%{visibility:visible}50%{visibility:hidden}100%{visibility:visible}}
.lvl .msg b{color:#0F62FE;font-weight:300}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px}.stats>div{background:#F4F4F4;padding:16px}.stats b{display:block;font:300 48px/56px var(--disp)}
@media (max-width:720px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.big{font-size:64px;line-height:72px}.stage .msg{left:24px;top:24px;font-size:28px;line-height:36px}.stage .masc{left:auto;right:16px;width:96px;height:96px}}
@media (prefers-reduced-motion:reduce){.play .masc,.play .msg,.play .sq{animation:none!important}.stage .sq{visibility:visible}}
""",
"d2": """
.cap{font:400 12px/16px var(--body);color:var(--muted);text-align:center}
.ring{width:160px;height:160px}.ring .tr{stroke:#D9CFBE}.ring .pr{stroke:#1F3A5F;stroke-linecap:round;stroke-dasharray:var(--p) 1;stroke-dashoffset:0;animation:g2-ring 900ms var(--mk-ink) both}
@keyframes g2-ring{from{stroke-dasharray:0 1}}
.big{font:800 72px/80px var(--disp)}
.badge{display:flex;flex-direction:column;gap:8px;align-items:center;text-align:center}.badge svg{width:100%;max-width:160px;height:auto;aspect-ratio:1}
.badge.lock .mk-con{opacity:.4}.badge.lock .mk-ink{display:none}
.st{font:700 12px/16px var(--body);letter-spacing:.12em;text-transform:uppercase}
.axis{display:flex;flex-direction:column;align-items:center;gap:0}.axis li{display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;padding-bottom:24px}.axis li:not(:last-child)::after{content:"";width:0;height:24px;border-left:3px double #5A5148;position:absolute;bottom:0}
.node{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font:800 18px/1 var(--disp);border:2px solid #1F3A5F;background:#FBF8F1;color:#1F3A5F}.node.l4{background:#1F3A5F;color:#F4EFE4}.node.l3{background:#1F3A5F;color:#F4EFE4;box-shadow:0 0 0 4px #FBF8F1,0 0 0 6px #B8341B}.node.l2{background:#FBF8F1;box-shadow:inset 0 0 0 6px #1F3A5F}.node.l1{border-style:dashed}.node.l0{border-color:#5A5148;color:#5A5148}
.lb li{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:16px;padding:12px 0;border-top:3px double #D9CFBE;align-items:center}.lb li.me{background:color-mix(in srgb,#1F3A5F 8%,transparent);border-radius:12px;padding-left:12px}.lb .zone{text-align:center;font:700 12px/16px var(--body);letter-spacing:.12em;color:#B8341B;padding:8px 0}
.lb .n{width:32px;height:32px;border-radius:50%}
.push{background:#1C1C1C;color:#F4EFE4;padding:16px;border-radius:20px;display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px}.push img{width:32px;height:32px;border-radius:50%}.push .muted{color:#D9CFBE}
.toast{border:3px double #D9CFBE;background:#FBF8F1;padding:16px;border-radius:20px}
.stage{position:relative;height:300px;background:#FBF8F1;overflow:hidden;border-radius:20px;border:1px solid #D9CFBE}
.stage .masc{position:absolute;left:50%;top:32px;width:136px;height:136px;margin-left:-68px;transform-origin:50% 90%}
.stage .halo{position:absolute;left:50%;top:16px;width:168px;height:168px;margin-left:-84px}
.stage .halo circle{stroke:#B8341B;stroke-width:3;fill:none;stroke-dasharray:1 1;stroke-dashoffset:1}
.stage .msg{position:absolute;left:16px;right:16px;bottom:24px;text-align:center;font:800 28px/36px var(--disp)}
.stage .stamp{position:absolute;right:24px;top:24px;width:56px;height:56px;border-radius:50%;background:#B8341B;color:#FFFFFF;display:grid;place-items:center;font:700 14px/1 var(--body);opacity:0}
.play .halo circle{animation:mk2-draw 900ms var(--mk-ink) forwards}
.play .masc{animation:g2-bow 1300ms var(--mk-ink) both}
.play .msg{animation:mk2-reveal 900ms var(--mk-ink) both 300ms}
.play .stamp{animation:g2-stamp 400ms var(--mk-ink) both 900ms}
.play.lvl .masc{animation:g2-rise 1300ms var(--mk-ink) both}
@keyframes g2-bow{0%{transform:rotate(0)}40%{transform:rotate(14deg)}100%{transform:rotate(0)}}
@keyframes g2-rise{0%{transform:translateY(24px);opacity:0}70%{transform:translateY(-8px);opacity:1}100%{transform:none}}
@keyframes g2-stamp{from{opacity:0;transform:scale(1.6)}to{opacity:1;transform:none}}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.stats>div{text-align:center}.stats b{display:block;font:800 40px/48px var(--disp)}
@media (max-width:720px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.big{font-size:56px;line-height:64px}}
@media (prefers-reduced-motion:reduce){.play *,.ring .pr{animation:none!important}.stage .halo circle{stroke-dashoffset:0}.stage .stamp{opacity:1}}
""",
}

REPLAY = '<script>document.addEventListener("click",function(e){var b=e.target.closest("[data-replay]");if(!b)return;var s=document.getElementById(b.getAttribute("data-replay"));s.classList.remove("play");void s.offsetWidth;s.classList.add("play")});window.addEventListener("load",function(){document.querySelectorAll(".stage").forEach(function(s){s.classList.add("play")})})</script>'


def mascot(d, cls="masc"):
    s = open(f"{ROOT}/logos/{d}-mascot.svg").read()
    s = re.sub(r'\s(width|height)="1024"', "", s).replace('aria-label="mark"', 'aria-label="bkt mascot"').replace("<svg ", f'<svg class="{cls}" ', 1)
    return s


def cap(t):
    return f'<p class="cap">{t}</p>'


def goal(d, mins=12, of=20):
    if d == "d1":
        n = round(16 * mins / of)
        cells = "".join(f'<i class="{"on" if i < n else ""}"></i>' for i in range(16))
        return f'<div class="stack" style="gap:8px"><div class="row" style="justify-content:space-between"><b>Daily goal</b><span class="st">{mins}/{of} min</span></div><div class="seg16" role="img" aria-label="{mins} of {of} minutes">{cells}</div></div>'
    p = mins / of
    return f'<div class="stack center"><svg class="ring" viewBox="0 0 160 160" role="img" aria-label="{mins} of {of} minutes"><circle class="tr" cx="80" cy="80" r="64" fill="none" stroke-width="12"/><circle class="pr" cx="80" cy="80" r="64" fill="none" stroke-width="12" pathLength="1" style="--p:{p:.2f}" transform="rotate(-90 80 80)"/><text x="80" y="88" text-anchor="middle" font-size="24" font-weight="800" fill="#1C1C1C" font-family="Shippori Mincho,serif">{mins}/{of}</text></svg><b>Daily goal, minutes</b></div>'


def xpbar(d, xp=1840, nxt=2000):
    pct = xp / nxt * 100
    return f'<div class="stack" style="gap:8px"><div class="row" style="justify-content:space-between"><b>Level 7</b><span class="st">{xp} / {nxt} XP</span></div><div class="prog" role="img" aria-label="{xp} of {nxt} XP"><i style="width:{pct:.0f}%"></i></div><p class="muted small">160 XP to level 8.</p></div>'


def p_progress(d):
    s = SK[d]
    days = "MTWTFSS"
    hist = [1, 1, 1, 2, 1, 1, 0]
    if d == "d1":
        cells = "".join(f'<li class="stack" style="gap:4px;align-items:flex-start"><span class="st">{days[i]}</span><svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">{"<rect width='32' height='32' fill='#0F62FE'/>" if h == 1 else ("<rect x='1' y='1' width='30' height='30' fill='none' stroke='#161616' stroke-width='2'/><rect x='8' y='8' width='16' height='16' fill='#161616'/>" if h == 2 else "<rect x='.5' y='.5' width='31' height='31' fill='none' stroke='#8D8D8D'/>")}</svg></li>' for i, h in enumerate(hist))
    else:
        cells = "".join(f'<li class="stack center" style="gap:4px"><span class="st">{days[i]}</span><svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">{"<circle cx='20' cy='20' r='18' fill='var(--acc)'/><circle cx='20' cy='20' r='13' fill='none' stroke='#F4EFE4'/><circle cx='20' cy='20' r='5' fill='#B8341B'/>" if h == 1 else ("<circle cx='20' cy='20' r='17' fill='none' stroke='#1F3A5F' stroke-width='2'/><path d='M10,20h20M20,10v20' stroke='#1F3A5F' stroke-width='2'/>" if h == 2 else "<circle cx='20' cy='20' r='17' fill='none' stroke='#1F3A5F' stroke-dasharray='3,3'/>")}</svg></li>' for i, h in enumerate(hist))
    streak = f'<section class="card stack"><span class="kick">Streak</span><p class="big">23</p><p>days in a row. Today is open: 8 minutes keeps it.</p><ol class="row" style="gap:16px" aria-label="This week">{cells}</ol><p class="small muted">Thursday used a streak freeze. One freeze left, earned at 7 days.</p>{cap("Precedent: Duolingo streak and streak freeze.")}</section>'
    lvl = f'<section class="card stack"><span class="kick">Experience</span>{xpbar(d)}<div class="toast stack" style="gap:8px"><b>Level-up preview</b><p class="small">Finish one more lesson to reach level 8 and unlock the Physics branch review deck.</p><a class="btn sm" href="game-celebrate.html#lvl">See the level-up</a></div>{cap("Precedent: Brilliant level and course progress.")}</section>'
    g = f'<section class="card stack"><span class="kick">Today</span>{goal(d)}<p class="small muted">Goal set to 20 minutes in Settings.</p>{cap("Precedent: Duolingo daily goal, Anki daily limit.")}</section>'
    body = f'<div class="grid" style="--cols:3">{streak}{lvl}{g}</div>'
    return head(d, "game progress", f"<style>{CSS[d]}</style>") + shell(d, "app-progress", "Progress", body) + end()


def d1_badge(n, state, pct=0):
    num = f'<text x="8" y="88" font-family="IBM Plex Sans" font-weight="300" font-size="{88 if len(n) == 1 else (64 if len(n) == 2 else 48)}" letter-spacing="-2" fill="{"#FFFFFF" if state == "earned" else ("#161616" if state == "prog" else "#8D8D8D")}">{n}</text>'
    if state == "earned":
        bg = '<rect width="128" height="128" fill="#0F62FE"/><rect x="104" y="8" width="16" height="16" fill="#DA1E28"/>'
    elif state == "prog":
        bg = f'<rect width="128" height="128" fill="#F4F4F4"/><rect y="120" width="{int(128*pct)//8*8}" height="8" fill="#0F62FE"/>'
    else:
        bg = '<rect x=".5" y=".5" width="127" height="127" fill="#FFFFFF" stroke="#8D8D8D" stroke-dasharray="8 8"/>'
    grid = "".join(f'<line x1="{i*8}" y1="0" x2="{i*8}" y2="128" stroke="#000" stroke-opacity=".06"/>' for i in range(1, 16))
    return f'<svg viewBox="0 0 128 128" role="img" aria-label="Badge {n}">{bg}{grid}{num}</svg>'


def d2_crest(kind, state, pct=0):
    c, R = 80, 24
    ink = "#1F3A5F"
    if kind == "shippo":
        art = shippo(c, c, R)
    elif kind == "igeta":
        art = igeta(c, c, 96)
    elif kind == "wa3":
        cs = [(c + 22 * math.cos(math.radians(a)), c + 22 * math.sin(math.radians(a))) for a in (-90, 30, 150)]
        art = f'<g class="mk-con" stroke="{ink}" fill="none"><circle cx="{c}" cy="{c}" r="22"/><circle cx="{c}" cy="{c}" r="56"/></g>' + "".join(f'<circle class="mk-ink" style="--i:{i}" pathLength="1" cx="{x:.1f}" cy="{y:.1f}" r="26" fill="none" stroke="{ink}" stroke-width="7"/>' for i, (x, y) in enumerate(cs))
    elif kind == "kikko":
        hexp = lambda r: " ".join(f"{c + r*math.cos(math.radians(60*k+30)):.1f},{c + r*math.sin(math.radians(60*k+30)):.1f}" for k in range(6))
        art = f'<g class="mk-con" stroke="{ink}" fill="none"><circle cx="{c}" cy="{c}" r="56"/><circle cx="{c}" cy="{c}" r="40"/></g><polygon class="mk-ink" pathLength="1" points="{hexp(56)}" fill="none" stroke="{ink}" stroke-width="8"/><polygon class="mk-ink" style="--i:1" pathLength="1" points="{hexp(36)}" fill="{ink}" stroke="{ink}"/><circle class="mk-ink" style="--i:2" pathLength="1" cx="{c}" cy="{c}" r="10" fill="#B8341B" stroke="#B8341B"/>'
    elif kind == "hishi":
        art = f'<g class="mk-con" stroke="{ink}" fill="none">' + "".join(f'<circle cx="{c+dx}" cy="{c+dy}" r="28"/>' for dx, dy in ((0, -28), (28, 0), (0, 28), (-28, 0))) + f'</g><polygon class="mk-ink" pathLength="1" points="{c},{c-60} {c+60},{c} {c},{c+60} {c-60},{c}" fill="{ink}" stroke="{ink}" stroke-width="2"/><polygon class="mk-ink" style="--i:1" pathLength="1" points="{c},{c-28} {c+28},{c} {c},{c+28} {c-28},{c}" fill="#FBF8F1" stroke="#FBF8F1"/>'
    else:
        art = f'<g class="mk-con" stroke="{ink}" fill="none"><circle cx="{c}" cy="{c}" r="40"/><line x1="{c-64}" y1="{c}" x2="{c+64}" y2="{c}"/></g><path class="mk-ink" pathLength="1" d="M{c-40},{c-14}h80v10h-80zM{c-40},{c+4}h80v10h-80z" fill="{ink}" stroke="{ink}"/><circle class="mk-ink" style="--i:1" pathLength="1" cx="{c}" cy="{c}" r="56" fill="none" stroke="{ink}" stroke-width="6"/>'
    ring = ""
    if state == "prog":
        ring = f'<circle cx="{c}" cy="{c}" r="74" fill="none" stroke="#D9CFBE" stroke-width="4"/><circle cx="{c}" cy="{c}" r="74" fill="none" stroke="#B8341B" stroke-width="4" pathLength="1" stroke-dasharray="{pct} 1" transform="rotate(-90 {c} {c})" stroke-linecap="round"/>'
    elif state == "earned":
        ring = f'<circle cx="{c}" cy="{c}" r="74" fill="none" stroke="{ink}" stroke-width="1"/><circle cx="{c}" cy="{c}" r="70" fill="none" stroke="{ink}" stroke-width="1"/>'
    op = ' opacity=".55"' if state == "prog" else ""
    return f'<svg viewBox="0 0 160 160" role="img" aria-label="{kind} crest">{ring}<g{op}>{art}</g></svg>'


BADGES = [("7", "Seven-day streak", "earned", 1), ("100", "100 cards reviewed", "earned", 1), ("3", "Three branches opened", "prog", .66), ("1k", "1,000 XP", "prog", .4), ("16", "Sixteen words mastered", "lock", 0), ("50", "Fifty days in a row", "lock", 0)]
CRESTS = ["shippo", "wa3", "kikko", "igeta", "hishi", "maru"]


def p_badges(d):
    items = []
    for i, (n, t, st, pct) in enumerate(BADGES):
        art = d1_badge(n, st, pct) if d == "d1" else d2_crest(CRESTS[i], st, pct)
        lab = {"earned": "Earned 14 Oct", "prog": f"In progress, {int(pct*100)}%", "lock": "Locked"}[st]
        items.append(f'<li class="card badge{" lock" if st == "lock" else ""}">{art}<b>{t}</b><span class="st">{lab}</span></li>')
    badges = f'<section class="stack"><h2 class="disp">Badges</h2><ul class="grid" style="--cols:6">{"".join(items)}</ul>{cap("Precedent: Duolingo achievements, Khan Academy badges.")}</section>'
    lv = [("Not started", 0), ("Attempted", 1), ("Familiar", 2), ("Proficient", 3), ("Mastered", 4)]
    es = ["uno", "dos", "tres", "cien", "mil", "casa", "agua", "fuego", "tierra", "aire", "luz", "calor", "peso", "medida", "número", "cero"]
    inf = ["bit", "entropy", "channel", "noise", "code", "capacity", "redundancy", "source", "Landauer", "Shannon H", "mutual info", "Kolmogorov", "Huffman", "Hamming", "parity", "erasure"]
    lvls_es = [4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 0, 0, 0]
    lvls_in = [4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0]
    def mm(name, words, lv_):
        if d == "d1":
            cells = "".join(f'<i class="l{l}" title="{w}: {lv[l][0]}"></i>' for w, l in zip(words, lv_))
            return f'<section class="card stack"><h3>{name}</h3><div class="mmap" role="img" aria-label="{name} mastery: {sum(1 for l in lv_ if l==4)} of {len(lv_)} mastered">{cells}</div></section>'
        nodes = "".join(f'<li><span class="node l{l}">{k+1}</span><span class="small">{w}, {lv[l][0]}</span></li>' for k, (w, l) in enumerate(list(zip(words, lv_))[:8]))
        return f'<section class="card stack center"><h3>{name}</h3><ol class="axis">{nodes}</ol><p class="small muted">8 more skills below.</p></section>'
    if d == "d1":
        legend = '<div class="leg small">' + "".join(f'<span><i style="background:{c}"></i>{n}</span>' for (n, _), c in zip(lv, ["#F4F4F4", "#D0E2FF", "#78A9FF", "#0F62FE", "#161616"])) + "</div>"
    else:
        legend = '<div class="leg small row" style="justify-content:center;gap:16px">' + "".join(f'<span class="row" style="gap:8px"><span class="node l{l}" style="width:24px;height:24px;font-size:11px"></span>{n}</span>' for n, l in lv) + "</div>"
    maps = f'<section class="stack"><h2 class="disp">Mastery map</h2>{legend}<div class="grid" style="--cols:2">{mm("Spanish", es, lvls_es)}{mm("Information branch", inf, lvls_in)}</div>{cap("Precedent: Khan Academy mastery levels, Brilliant learning path.")}</section>'
    return head(d, "game badges", f"<style>{CSS[d]}</style>") + shell(d, "app-progress", "Badges and mastery", badges + maps) + end()


def p_social(d):
    rows = [("Ada L.", 2410), ("Kenji M.", 2275), ("You", 1840), ("Noor A.", 1790), ("Tomás R.", 1520), ("Lea S.", 1210), ("Ravi P.", 880)]
    av = ["#0F62FE", "#DA1E28", "#161616", "#525252"] if d == "d1" else ["#1F3A5F"] * 4
    li = []
    for i, (n, x) in enumerate(rows):
        if i == 3:
            li.append('<li class="zone" style="display:block">Promotion zone ends here</li>')
        badge = f'<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">{"<rect width='32' height='32' fill='" + av[i % 4] + "'/>" if d == "d1" else "<circle cx=\'16\' cy=\'16\' r=\'15\' fill=\'var(--acc)\'/><circle cx=\'16\' cy=\'16\' r=\'12\' fill=\'none\' stroke=\'#F4EFE4\'/><path d=\'M16 8l2.5 8-2.5 8-2.5-8z\' fill=\'#F4EFE4\' fill-opacity=\'.35\'/>"}<text x="16" y="21" text-anchor="middle" font-size="14" fill="#FFFFFF" font-family="sans-serif">{n[0]}</text></svg>'
        li.append(f'<li class="{"me" if n == "You" else ""}"><span class="st">{i+1}</span><span class="row" style="gap:12px;flex-wrap:nowrap">{badge}<b>{n}</b></span><span class="st">{x} XP</span></li>')
    lb = f'<section class="card stack"><span class="kick">Sapphire league, week 42</span><h2 class="disp">Leaderboard</h2><ol class="lb">{"".join(li)}</ol><p class="small muted">Top 3 move up on Sunday. 2 days left.</p>{cap("Precedent: Duolingo leagues.")}</section>'
    grp = f'<section class="card stack"><span class="kick">Study group</span><h3>Göttingen reading circle</h3><p class="small">5 members reading Noether 1918 together. Group goal: 120 cards this week.</p>{xpbar(d, 86, 120).replace("Level 7", "Group cards").replace("XP", "cards").replace("160 cards to level 8.", "34 cards to the group goal.")}<a class="btn sm" href="#">Open the group</a>{cap("Precedent: Duolingo friend quests, Anki shared decks.")}</section>'
    push = f'<div class="push"><img src="../../icons/{d}-glyph.svg" alt=""><div><b>bkt</b><p class="small">Your 23-day streak ends at midnight. 8 minutes keeps it.</p><p class="small muted">now</p></div></div>'
    mail = f'<div class="toast stack" style="gap:4px"><span class="st">Email, 18:00</span><b>Subject: Kenji passed you in the league</b><p class="small">You are 435 XP behind second place. One lesson on entropy is worth 40 XP.</p></div>'
    inapp = f'<div class="toast row" style="justify-content:space-between"><span class="small"><b>Review due.</b> 14 cards from Shannon 1948 are ready.</span><a class="btn sm" href="app-review.html">Review</a></div>'
    notes = f'<section class="card stack"><span class="kick">Reminders</span><h3>Push</h3>{push}<h3>Email</h3>{mail}<h3>In-app</h3>{inapp}{cap("Precedent: Duolingo streak reminders, Anki due count.")}</section>'
    body = f'<div class="split">{lb}<div class="stack" style="gap:var(--s5)">{grp}{notes}</div></div>'
    return head(d, "game social", f"<style>{CSS[d]}</style>") + shell(d, "app-learn", "League and group", body) + end()


def stage(d, sid, msg, extra="", cls=""):
    if d == "d1":
        sq = "".join(f'<i class="sq" style="--i:{i};left:{8+(i*37)%60}%;top:{120+(i*24)%96}px;background:{["#0F62FE","#DA1E28","#161616"][i%3]}"></i>' for i in range(10))
        inner = f'{sq}{mascot(d)}<p class="msg">{msg}</p>'
    else:
        inner = f'<svg class="halo" viewBox="0 0 168 168" aria-hidden="true"><circle cx="84" cy="84" r="80" pathLength="1"/></svg>{mascot(d)}<span class="stamp">{extra or "了"}</span><p class="msg">{msg}</p>'
    return f'<div class="stage {cls}" id="{sid}">{inner}</div>'


def p_celebrate(d):
    m = [("ok", "Correct", "Correct. <b>+10 XP</b>" if d == "d1" else "Correct. +10 XP", "正", "Precedent: Duolingo answer feedback."), ("done", "Lesson complete", "Lesson complete. <b>40 XP</b>" if d == "d1" else "Lesson complete", "済", "Precedent: Brilliant lesson end."), ("lvl", "Level up", "Level <b>8</b>" if d == "d1" else "Level 8", "八", "Precedent: Duolingo level-up, Khan mastery up.")]
    cards = "".join(f'<section class="card stack" id="{k}-card"><span class="kick">{t}</span>{stage(d, k, msg, ex, "lvl" if k == "lvl" else "")}<button class="btn sm" type="button" data-replay="{k}">Replay {t.lower()}</button>{cap(c)}</section>' for k, t, msg, ex, c in m)
    return head(d, "game celebrate", f"<style>{CSS[d]}</style>") + shell(d, "app-learn", "Celebrations", f'<div class="grid" style="--cols:3">{cards}</div>') + REPLAY + end()


def p_summary(d):
    words = [("en", "ltr", "cent", "hundred"), ("es", "ltr", "cien", "hundred"), ("he", "rtl", "מאה", "hundred")]
    wl = "".join(f'<li class="card stack" style="gap:4px"><span class="st">{l}</span><span class="word" dir="{dr}" lang="{l}">{w}</span><span class="small muted">{g}</span></li>' for l, dr, w, g in words)
    st = [("+40", "XP earned"), ("92%", "Accuracy, 11 of 12"), ("3", "Words learned"), ("24", "Day streak")]
    stats = "".join(f'<div><b>{a}</b><span class="small">{b}</span></div>' for a, b in st)
    hero = f'<section class="card stack{" center" if d == "d2" else ""}"><span class="kick">Numbers, lesson 4</span><h2 class="disp">Lesson complete</h2><div class="stats">{stats}</div>{cap("Precedent: Duolingo lesson summary, Anki session stats.")}</section>'
    words_s = f'<section class="stack"><h3>Words learned</h3><ul class="grid" style="--cols:3">{wl}</ul></section>'
    nxt = f'<section class="card stack"><span class="kick">Next lesson</span><h3>Numbers lesson 5: mil means thousand</h3><p class="small muted">6 minutes. Then 14 reviews are due.</p>{xpbar(d, 1880)}<div class="row"><a class="btn" href="app-study-card.html">Start lesson 5</a><a class="btn ghost" href="game-progress.html">See progress</a></div>{cap("Precedent: Brilliant next-lesson path, FSRS review queue.")}</section>'
    return head(d, "game summary", f"<style>{CSS[d]}</style>") + shell(d, "app-learn", "Summary", hero + words_s + nxt) + end()


PAGES = {"game-progress": p_progress, "game-badges": p_badges, "game-social": p_social, "game-celebrate": p_celebrate, "game-summary": p_summary}

if __name__ == "__main__":
    for d in ("d1", "d2"):
        for n, f in PAGES.items():
            open(f"{ROOT}/pages/{d}/{n}.html", "w").write(enforce(d, f(d), 2))
