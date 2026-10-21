import math, re, os

SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pages456.py")).read()
exec(SRC.split('for i in ("d4", "d5", "d6"):')[0])
import made56

from paths import DIRECTIONS_DIR
LOGOS = DIRECTIONS_DIR + "/logos"


def star(cx, cy, r1, r2, n, rot=-90):
    pts = []
    for k in range(2 * n):
        r = r1 if k % 2 == 0 else r2
        a = math.radians(rot + k * 180 / n)
        pts.append(f"{cx + r * math.cos(a):.1f},{cy + r * math.sin(a):.1f}")
    return " ".join(pts)


def arc(cx, cy, r, frac):
    if frac >= 1:
        return f'<circle cx="{cx}" cy="{cy}" r="{r}"/>'
    a = math.radians(-90 + 360 * frac)
    x, y = cx + r * math.cos(a), cy + r * math.sin(a)
    return f'<path d="M{cx} {cy - r}A{r} {r} 0 {1 if frac > .5 else 0} 1 {x:.1f} {y:.1f}"/>'


def badge_d5(k, state, frac):
    n = [8, 10, 12, 6, 16, 8][k]
    c = D["d5"]["c"]
    on = state == "earned"
    ln = c["acc"] if on else c["muted"]
    fill = c["hl"] if on else "none"
    cons = "".join(f'<line x1="60" y1="60" x2="{60 + 52 * math.cos(math.radians(j * 360 / n)):.1f}" y2="{60 + 52 * math.sin(math.radians(j * 360 / n)):.1f}"/>' for j in range(n))
    inner = star(60, 60, 34, 34 * math.cos(math.pi / n * 2) / math.cos(math.pi / n) if n > 4 else 14, n)
    ring = ""
    if state == "progress":
        ring = f'<g fill="none" stroke="{c["hl"]}" stroke-width="5" stroke-linecap="round">{arc(60, 60, 54, frac)}</g>'
    return (f'<svg viewBox="0 0 120 120" width="112" height="112" aria-hidden="true"><g fill="none" stroke="{c["muted"]}" stroke-width=".6" opacity=".45"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="34"/>{cons}</g>'
            f'<circle cx="60" cy="60" r="46" fill="none" stroke="{ln}" stroke-width="2"/><polygon points="{inner}" fill="{fill}" stroke="{ln}" stroke-width="2" stroke-linejoin="round"/>'
            f'<polygon points="{star(60, 60, 10, 4, 4)}" fill="{c["acc"] if on else c["muted"]}"/>{ring}</svg>')


def badge_d6(k, state, frac):
    on = state == "earned"
    col = ["#FF5F00", "#1D4ED8", "#E1251B", "#F2C400", "#1D4ED8", "#FF5F00"][k]
    f = col if on else "none"
    st = "#111" if on else "#3F3D39"
    sh = [f'<circle cx="60" cy="60" r="30" fill="{f}" stroke="{st}" stroke-width="2"/>',
          f'<rect x="32" y="32" width="56" height="56" fill="{f}" stroke="{st}" stroke-width="2"/>',
          f'<path d="M60 28 92 88H28Z" fill="{f}" stroke="{st}" stroke-width="2"/>',
          f'<circle cx="46" cy="60" r="18" fill="{f}" stroke="{st}" stroke-width="2"/><rect x="62" y="42" width="36" height="36" fill="{"#111" if on else "none"}" stroke="{st}" stroke-width="2"/>',
          f'<rect x="28" y="52" width="64" height="16" fill="{f}" stroke="{st}" stroke-width="2"/><circle cx="60" cy="38" r="10" fill="{"#111" if on else "none"}" stroke="{st}" stroke-width="2"/>',
          f'<path d="M30 88 60 32 90 88Z" fill="none" stroke="{st}" stroke-width="2"/><circle cx="60" cy="68" r="14" fill="{f}" stroke="{st}" stroke-width="2"/>'][k]
    ring = ""
    if state == "progress":
        ring = f'<g fill="none" stroke="#FF5F00" stroke-width="6">{arc(60, 60, 54, frac)}</g>'
    ticks = "".join(f'<line x1="60" y1="4" x2="60" y2="10" transform="rotate({j * 22.5} 60 60)"/>' for j in range(16))
    return (f'<svg viewBox="0 0 120 120" width="112" height="112" aria-hidden="true"><rect x="2" y="2" width="116" height="116" rx="8" fill="#EDEBE6" stroke="#111" stroke-width="2"/>'
            f'<g stroke="#111" stroke-width="2">{ticks}</g>{sh}{ring}</svg>')


BADGES = [("First root", "Learn one root in six scripts", "earned", 1), ("Week streak", "Study 7 days in a row", "earned", 1),
          ("Perfect lesson", "Finish a lesson with no mistakes", "progress", .6), ("Citation", "Cite your first canon entry", "progress", .3),
          ("Shannon reader", "Master all Information entries", "locked", 0), ("Polyglot", "Reach level 3 in four languages", "locked", 0)]


def mascot(i, cls="mascot"):
    s = open(f"{LOGOS}/{i}-mascot.svg").read()
    s = re.sub(r'\swidth="\d+"\sheight="\d+"', "", s, 1).replace('aria-label="mark"', f'aria-label="{D[i]["name"]} mascot" class="{cls}"', 1)
    return s


def cap(t):
    return f'<p class="xs muted precedent">Precedent: {t}</p>'


def ring(i, frac, label):
    c = D[i]["c"]
    st = c["acc"] if i == "d5" else "#FF5F00"
    bgs = c["line"] if i == "d5" else "#111"
    return (f'<svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="{label}"><circle cx="60" cy="60" r="48" fill="none" stroke="{bgs}" stroke-width="{4 if i == "d5" else 2}" opacity="{.6 if i == "d5" else 1}"/>'
            f'<g fill="none" stroke="{st}" stroke-width="10" stroke-linecap="{"round" if i == "d5" else "butt"}">{arc(60, 60, 48, frac)}</g>'
            f'<text x="60" y="66" text-anchor="middle" font-size="20" font-weight="700" fill="{c["text"]}" font-family="{D[i]["mono"].strip(chr(39))}">{int(frac * 30)}/30</text></svg>')


GCSS = """.gm{display:grid;gap:var(--s5)}.gm .card{min-width:0}.statrow{display:flex;gap:var(--s5);flex-wrap:wrap;align-items:center}.big{font:700 var(--t6)/var(--l6) var(--disp)}
.days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--s2);margin-top:var(--s3)}.days span{display:flex;flex-direction:column;align-items:center;gap:var(--s1);font-size:var(--t1);line-height:var(--l1);color:var(--muted)}.days i{width:32px;height:32px;display:block;border:2px solid var(--line);border-radius:var(--dot,50%)}.days i.on{background:var(--acc);border-color:var(--acc)}.days i.fz{background:var(--hl);border-color:var(--hl)}
.xpbar{height:16px;background:color-mix(in srgb,var(--muted) 25%,transparent);border-radius:var(--r);overflow:hidden}.xpbar i{display:block;height:100%;background:var(--acc)}
.badges{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--s4)}.badge{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--s2)}.badge .st{font:600 var(--t1)/var(--l1) var(--mono);text-transform:uppercase;letter-spacing:.08em}
.mmap{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s2)}.mmap div{min-height:56px;padding:var(--s2);border-radius:var(--r);font-size:var(--t1);line-height:var(--l1);border:1px solid var(--line)}
.lvl0{background:transparent;color:var(--muted)}.lvl1{background:color-mix(in srgb,var(--acc) 20%,var(--surf));color:var(--text)}.lvl2{background:color-mix(in srgb,var(--acc) 45%,var(--surf));color:var(--text)}.lvl3{background:var(--acc);color:var(--onacc)}
.lead li{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:var(--s3);align-items:center;min-height:48px;border-bottom:1px solid var(--line)}.lead{list-style:none;margin:0;padding:0}.lead li.me{font-weight:700}.zone{font:600 var(--t1)/var(--l1) var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:var(--s2) 0}
.notif{display:grid;grid-template-columns:40px minmax(0,1fr);gap:var(--s3);align-items:start}.notif .ic{width:40px;height:40px}
.phone{max-width:360px;border-radius:24px;padding:var(--s4);background:color-mix(in srgb,var(--bg) 60%,#000);color:#F5F5F5}.phone .notif p{color:#F5F5F5}.phone .xs{color:#D0D0D0}
.mail{font-family:var(--body);border:1px solid var(--line);border-radius:var(--r);padding:var(--s4);background:var(--surf)}
.stage{position:relative;min-height:280px;display:grid;place-items:center;overflow:hidden;border-radius:var(--r)}.stage .mascot{width:120px;height:120px;position:relative;z-index:2}.stage .fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.stage .msg{position:relative;z-index:2;font:700 var(--t4)/var(--l4) var(--disp);text-align:center}
.sumgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--s4)}.words{display:flex;gap:var(--s3);flex-wrap:wrap}
@media (max-width:720px){.badges{grid-template-columns:repeat(2,minmax(0,1fr))}.mmap{grid-template-columns:repeat(2,minmax(0,1fr))}.sumgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.days i{width:28px;height:28px}}"""

FX = {
"d5": """.fx .gt{opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(.4)}
.play .fx .gt{animation:grow 520ms cubic-bezier(0,0,0,1) forwards;animation-delay:calc(var(--ring) * 60ms)}
@keyframes grow{to{opacity:1;transform:none}}
.play .mascot{animation:spin8 720ms cubic-bezier(0,0,0,1)}@keyframes spin8{0%{transform:rotate(-45deg) scale(.8)}100%{transform:none}}
.play .msg{animation:fadein 480ms cubic-bezier(0,0,0,1) both;animation-delay:240ms}@keyframes fadein{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
.lvlup .xpbar i{transition:width 900ms cubic-bezier(0,0,0,1)}""",
"d6": """.fx .pr{opacity:0}
.play .fx .pr{animation:stp 320ms steps(4,end) forwards;animation-delay:calc(var(--i) * 80ms)}
@keyframes stp{to{opacity:1}}
.play .mascot{animation:hop 480ms steps(4,end)}@keyframes hop{0%{transform:translateY(0)}50%{transform:translateY(-16px)}100%{transform:translateY(0)}}
.play .msg{animation:stp2 240ms steps(4,end) both;animation-delay:160ms}@keyframes stp2{from{opacity:0}to{opacity:1}}
.dial{transition:transform 120ms linear}"""}

RM = "@media (prefers-reduced-motion:reduce){.fx .gt,.fx .pr{opacity:1!important;transform:none!important;animation:none!important}.play .mascot,.play .msg{animation:none!important}}"


def fx(i, kind):
    c = D[i]["c"]
    out = []
    if i == "d5":
        s, R = 60, 30
        rows, cols = 6, 12
        for r in range(rows):
            for q in range(cols):
                cx, cy = q * s + 30, r * s + 30
                ring = max(abs(q - cols // 2), abs(r - rows // 2))
                col = [c["acc"], c["hl"], c["acc"]][["correct", "complete", "level"].index(kind)]
                out.append(f'<g class="gt" style="--ring:{ring}"><rect x="{cx - R / 1.414:.1f}" y="{cy - R / 1.414:.1f}" width="{R * 1.414:.1f}" height="{R * 1.414:.1f}" fill="none" stroke="{col}" stroke-width="1.5"/>'
                           f'<rect x="{cx - R / 1.414:.1f}" y="{cy - R / 1.414:.1f}" width="{R * 1.414:.1f}" height="{R * 1.414:.1f}" fill="none" stroke="{col}" stroke-width="1.5" transform="rotate(45 {cx} {cy})"/>'
                           + (f'<polygon points="{star(cx, cy, 8, 3, 4)}" fill="{c["hl"]}"/>' if (q + r) % 2 == 0 else "") + '</g>')
        return f'<svg class="fx" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{"".join(out)}</svg>'
    cols = ["#FF5F00", "#1D4ED8", "#E1251B", "#F2C400", "#111"]
    k = 0
    for r in range(4):
        for q in range(9):
            x, y = 40 + q * 80, 40 + r * 90
            if (q + r + ["correct", "complete", "level"].index(kind)) % 3:
                continue
            col = cols[(q + r) % 5]
            shape = [f'<circle cx="{x}" cy="{y}" r="16" fill="{col}"/>', f'<rect x="{x - 14}" y="{y - 14}" width="28" height="28" fill="{col}"/>', f'<path d="M{x} {y - 16} {x + 16} {y + 14}H{x - 16}Z" fill="{col}"/>'][(q * 7 + r) % 3]
            out.append(shape.replace("/>", f' class="pr" style="--i:{k % 9}"/>', 1))
            k += 1
    return f'<svg class="fx" viewBox="0 0 720 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">{"".join(out)}</svg>'


def pg_progress(i):
    d = D[i]
    days = "".join(f'<span><i class="{"fz" if n == 4 else "on" if n < 6 else ""}" aria-hidden="true"></i>{x}</span>' for n, x in enumerate("MTWTFSS"))
    body = f'''<div class="gm">
<section class="card stack"><p class="lab">Streak</p><div class="statrow"><span class="big">12</span><div><p class="h3">day streak</p><p class="sm muted">1 streak freeze used on Friday. 1 left.</p></div></div><div class="days" role="img" aria-label="This week: studied Monday to Thursday, freeze on Friday, studied Saturday, Sunday open">{days}</div><div class="row"><button class="btn ghost">Equip a freeze · 200 XP</button></div>{cap("Duolingo streak freeze")}</section>
<div class="grid g2"><section class="card stack"><p class="lab">Level 7 · 1,840 XP</p><div class="xpbar" role="progressbar" aria-label="XP to level 8" aria-valuenow="84" aria-valuemin="0" aria-valuemax="100"><i style="width:84%"></i></div><p class="sm muted">160 XP to level 8. Level 8 opens the Information branch quiz.</p><div class="card lvlcard stack" style="border-color:var(--acc)"><p class="lab">Level up</p><p class="h3">Level 7 reached on 14 October</p><p class="sm muted">Mastery of Spanish numbers rose from Familiar to Proficient.</p></div>{cap("Khan Academy mastery levels")}</section>
<section class="card stack" style="align-items:center;text-align:center"><p class="lab">Daily goal</p>{ring(i, 22 / 30, "Daily goal: 22 of 30 XP")}<p class="sm muted">8 XP to today's goal. One review session covers it.</p><a class="btn" href="app-review.html">Review 10 cards</a>{cap("Brilliant daily goal")}</section></div></div>'''
    return head(i, "bkt progress game", GCSS) + shell(i, "cite", "Streak and XP", "Progress", body)


def pg_badges(i):
    art = badge_d5 if i == "d5" else badge_d6
    lab = {"earned": "Earned", "progress": "In progress", "locked": "Locked"}
    items = "".join(f'<li class="card badge">{art(k, s, f)}<p class="st" style="color:{"var(--acc)" if s == "earned" and i == "d5" else "var(--text)" if s == "earned" else "var(--muted)"}">{lab[s]}{f" · {int(f * 100)}%" if s == "progress" else ""}</p><p class="h3" style="font-size:var(--t3);line-height:var(--l3)">{t}</p><p class="xs muted">{x}</p></li>' for k, (t, x, s, f) in enumerate(BADGES))
    es = [("uno", 3), ("dos", 3), ("cien", 2), ("mil", 1), ("hola", 3), ("gracias", 2), ("casa", 1), ("agua", 0)]
    inf = [("Shannon 1948", 3), ("Nyquist 1928", 2), ("Hartley 1928", 2), ("Kolmogorov 1965", 1), ("Landauer 1961", 1), ("Turing 1936", 0), ("Huffman 1952", 0), ("Bennett 1973", 0)]
    names = ["Not started", "Familiar", "Proficient", "Mastered"]
    mm = lambda L, lang="": "".join(f'<div class="lvl{v}"{f" lang={lang}" if lang else ""}><b>{n}</b><br>{names[v]}</div>' for n, v in L)
    leg = "".join(f'<span class="row xs" style="gap:var(--s1)"><span class="lvl{v}" style="width:16px;height:16px;border:1px solid var(--line);border-radius:var(--r);display:inline-block"></span>{n}</span>' for v, n in enumerate(names))
    body = f'''<div class="gm"><section class="stack"><p class="lab">Badges · {"girih medallions on compass construction" if i == "d5" else "Bauhaus primitives on a 16-detent dial"}</p><ul class="badges" style="list-style:none;margin:0;padding:0">{items}</ul>{cap("Duolingo achievements")}</section>
<div class="grid g2"><section class="card stack"><p class="lab">Mastery map · Spanish</p><div class="mmap">{mm(es, "es")}</div><div class="row">{leg}</div>{cap("Khan Academy mastery levels")}</section>
<section class="card stack"><p class="lab">Mastery map · Information branch</p><div class="mmap">{mm(inf)}</div>{cap("Brilliant progress path")}</section></div></div>'''
    return head(i, "bkt badges", GCSS) + shell(i, "cite", "Badges and mastery", "Progress", body)


def pg_social(i):
    people = [("1", "Mira K.", "1,240"), ("2", "Tomás R.", "1,105"), ("3", "Ada R.", "980"), ("4", "Yusuf A.", "910"), ("5", "Lena B.", "870"), ("6", "Noor H.", "640"), ("7", "Sam W.", "410")]
    rows = "".join(f'<li class="{"me" if n == "Ada R." else ""}"><span class="lab">{r}</span><span>{n}{" · you" if n == "Ada R." else ""}</span><span class="sm">{x} XP</span></li>' + ('<li class="zone" style="display:block;min-height:0">Promotion zone above · demotion zone below</li>' if r == "5" else "") for r, n, x in people)
    glyph = f'<img class="ic" src="../../icons/{i}-brand.svg" alt="" width="40" height="40">'
    body = f'''<div class="grid g2" style="align-items:start"><section class="card stack"><p class="lab">Sapphire league · week 42 · 3 days left</p><h2 class="h3">League table</h2><ol class="lead">{rows}</ol>{cap("Duolingo leagues")}</section>
<div class="stack" style="--s4:var(--s5)"><section class="card stack"><p class="lab">Study group · Roots club</p><p class="h3">4 of 5 met today's goal</p><div class="xpbar" role="progressbar" aria-label="Group goal" aria-valuenow="80" aria-valuemin="0" aria-valuemax="100"><i style="width:80%"></i></div><p class="sm muted">Group quest: 500 XP together by Sunday. 410 so far.</p><button class="btn ghost">Nudge Sam</button>{cap("Duolingo friends quest")}</section>
<section class="stack"><p class="lab">Push notification</p><div class="phone"><div class="notif">{glyph}<div><p class="sm"><b>bkt</b> · now</p><p class="sm">Your 12-day streak ends at midnight. One 3-minute review keeps it.</p></div></div></div></section>
<section class="stack"><p class="lab">Email snippet</p><div class="mail stack"><p class="xs muted">From bkt &lt;learn@bucket.foundation&gt; · Weekly recap</p><p><b>You reviewed 184 cards this week.</b></p><p class="sm muted">Retention 91%. 18 cards due tomorrow. Mira passed you in the league by 260 XP.</p><a class="btn" href="app-review.html">Start review</a></div>{cap("Anki review stats")}</section>
<section class="card stack"><p class="lab">In-app reminder</p><div class="notif">{glyph}<div class="stack" style="--s4:var(--s2)"><p class="sm"><b>Daily goal at 22 of 30 XP</b></p><p class="sm muted">A short quiz on Spanish numbers finishes it.</p><div class="row"><a class="btn" href="app-quiz.html">Take the quiz</a><button class="btn ghost">Remind me at 8 pm</button></div></div></div></section></div></div>'''
    return head(i, "bkt social", GCSS) + shell(i, "cite", "League and reminders", "Social", body)


def pg_celebrate(i):
    moments = [("correct", "Correct answer", "Correct. cien is one hundred.", "Duolingo answer feedback"),
               ("complete", "Lesson complete", "Lesson complete. +30 XP", "Brilliant lesson complete"),
               ("level", "Level up", "Level 8 reached", "Khan Academy level up")]
    cards = "".join(f'''<section class="card stack moment" id="m-{k}"><div class="row" style="justify-content:space-between"><h2 class="h3">{t}</h2><button class="btn ghost replay" data-m="m-{k}">Replay</button></div><div class="stage play">{fx(i, k)}<div class="stack" style="text-align:center;justify-items:center;display:grid">{mascot(i)}<p class="msg" role="status">{msg}</p></div></div>{cap(p)}</section>''' for k, t, msg, p in moments)
    js = """<script>document.querySelectorAll('.replay').forEach(b=>b.addEventListener('click',()=>{const s=document.querySelector('#'+b.dataset.m+' .stage');s.classList.remove('play');void s.offsetWidth;s.classList.add('play')}))</script>"""
    body = f'<div class="grid g3" style="align-items:start">{cards}</div>{js}'
    return head(i, "bkt celebrations", GCSS + FX[i] + RM) + shell(i, "home", "Celebrations", "Learn", body)


def pg_summary(i):
    words = f'{w("fr", "cent", "chip")}{w("es", "cien", "chip")}{w("he", "מאה", "chip")}'
    stats = [("XP earned", "+30"), ("Accuracy", "92%"), ("Streak", "13 days"), ("Time", "4 min")]
    tiles = "".join(f'<div class="card stack"><p class="lab">{a}</p><p class="big">{b}</p></div>' for a, b in stats)
    body = f'''<div class="gm" style="max-width:880px;margin:0 auto"><section class="card stack" style="text-align:center;justify-items:center;display:grid">{mascot(i)}<h2 class="h2">Lesson complete</h2><p class="muted">Root hundred, lesson 4 of 6</p></section>
<div class="sumgrid">{tiles}</div>
<section class="card stack"><p class="lab">Words learned</p><div class="words">{words}</div><p class="sm muted">11 of 12 answers right. You missed εκατό once; it returns in tomorrow's review.</p>{cap("Anki review stats")}</section>
<section class="card stack"><p class="lab">Next lesson</p><p class="h3">Root thousand: mil, mille, אלף</p><p class="sm muted">Unlocked on your path. About 5 minutes.</p><div class="row"><a class="btn" href="app-study-card.html">Start next lesson</a><a class="btn ghost" href="app-learn.html">Back to Learn</a></div>{cap("Brilliant progress path")}</section></div>'''
    return head(i, "bkt lesson summary", GCSS + ".mascot{width:96px;height:96px}") + shell(i, "home", "Summary", "Learn", body)


GAME = {"game-progress": pg_progress, "game-badges": pg_badges, "game-social": pg_social, "game-celebrate": pg_celebrate, "game-summary": pg_summary}

if __name__ == "__main__":
    for i in ("d5", "d6"):
        for p, fn in GAME.items():
            html = made56.post(i, p, fn(i))
            assert "—" not in html and "–" not in html
            open(f"{ROOT}/{i}/{p}.html", "w").write(html)
