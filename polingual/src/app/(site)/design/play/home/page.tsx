import Header from "../Header";
import { COUNTERS, FEED, FRIENDS, GROUPS, ROOMS } from "../mock";
import { Avatar, Flag } from "../../../play-kit/parts";
import s from "../design.module.css";
import { ButtonLink, Card, buttonClass } from "@/ui";

const GAME_TILES = [
  { name: "Flags", blurb: "Name the language", color: "#D9381E" },
  { name: "Same word", blurb: "One meaning, many tongues", color: "#26428B" },
  { name: "Tiles", blurb: "Tap before it falls", color: "#1E7A5A" },
  { name: "Daily words", blurb: "Today's set", color: "#E9A23B" },
  { name: "Live", blurb: "Big screen, phones", color: "#5B1A4A" },
];

const KIND_COLOR: Record<string, string> = { win: "#E9A23B", group: "#26428B", streak: "#D9381E", room: "#1E7A5A", rank: "#5B1A4A" };

export default function HomeMock() {
  return (
    <>
      <Header />
      <main className={s.main}>
        <section className={s.hero}>
          <div className={s.row} style={{ position: "relative", zIndex: 1 }}>
            <span className={s.pulse} aria-hidden />
            <span className={s.mono} style={{ fontSize: 13, letterSpacing: ".1em" }}>LIVE NOW</span>
          </div>
          <h1 className={s.title} style={{ position: "relative", zIndex: 1 }}>The world is playing.</h1>
          <div className={s.counters}>
            {COUNTERS.map((c) => (
              <div key={c.label} className={s.counter}><b>{c.value}</b><span>{c.label}</span></div>
            ))}
          </div>
          <div className={s.row} style={{ position: "relative", zIndex: 1 }}>
            <ButtonLink href="/design/play/lobby">Quick play</ButtonLink>
            <ButtonLink href="/design/play/lobby" variant="ghost" size="md" style={{ borderColor: "var(--parchment)", color: "var(--parchment)" }}>Start a game</ButtonLink>
            <ButtonLink href="/design/play/controller" variant="ghost" size="md" style={{ borderColor: "var(--parchment)", color: "var(--parchment)" }}>Join with code</ButtonLink>
          </div>
        </section>

        <section className={s.games} aria-label="Games">
          {GAME_TILES.map((g) => (
            <a key={g.name} href="/design/play/lobby" className={s.game} style={{ background: g.color }}>
              <b>{g.name}</b>
              <span>{g.blurb}</span>
            </a>
          ))}
        </section>

        <Card as="section">
          <div className={s.between}>
            <h2>Friends playing</h2>
            <ButtonLink href="/design/play/profile" variant="ghost" size="md">Invite</ButtonLink>
          </div>
          <div className={s.friends} style={{ marginTop: 12 }}>
            {FRIENDS.map((f) => (
              <div key={f.handle} className={s.friend} style={{ opacity: f.online ? 1 : 0.55 }}>
                <Avatar look={f.look} size={64} bounce={f.online} />
                <div className={s.row} style={{ gap: 6, justifyContent: "center" }}><Flag lang={f.lang} size={12} /><b>{f.handle}</b></div>
                <small>{f.online ? f.where : "Offline"}</small>
                {f.online && <ButtonLink href="/design/play/lobby" variant="secondary" size="sm">Join</ButtonLink>}
              </div>
            ))}
          </div>
        </Card>

        <div className={s.grid2}>
          <Card as="section">
            <div className={s.between}><h2>Rooms filling</h2><span className={s.mono}>37 open</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {ROOMS.map((r) => (
                <a key={r.code} href="/design/play/lobby" className={s.room} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <b style={{ fontFamily: "Fredoka", fontSize: 18, color: "var(--tyrian)" }}>{r.game}</b>
                    <div className={s.row} style={{ gap: 4 }}>{r.langs.map((l) => <Flag key={l} lang={l} size={12} />)}</div>
                  </div>
                  <div className={s.meter}><i style={{ width: `${(r.filled / r.size) * 100}%` }} /></div>
                  <span className={s.mono}>{r.filled}/{r.size}</span>
                  {r.friends > 0 && <span className={s.tier} data-small style={{ background: "var(--maya)", color: "var(--tyrian-deep)" }}>friend</span>}
                </a>
              ))}
            </div>
          </Card>

          <Card as="section">
            <h2>Happening now</h2>
            <ul className={s.feed} style={{ marginTop: 12 }}>
              {FEED.map((e, i) => (
                <li key={i} className={s.pop} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className={s.dot} style={{ background: KIND_COLOR[e.kind] }} aria-hidden />
                  <Flag lang={e.lang} size={14} />
                  <span><b>{e.who}</b> {e.text}</span>
                  <time>{e.ago}</time>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card as="section">
          <div className={s.between}><h2>My groups</h2><ButtonLink href="/design/play/lobby" variant="ghost" size="md">Play with a group</ButtonLink></div>
          <div className={s.opts} style={{ marginTop: 12 }}>
            {GROUPS.map((g) => (
              <a key={g.name} href="/design/play/lobby" className={buttonClass({ variant: "secondary", size: "md", className: s.opt })} style={{ "--b-line": g.color } as import("react").CSSProperties}>
                <b>{g.name}</b>
                <span>{g.members} members, {g.online} online</span>
                <span className={s.mono} style={{ color: g.color }}>You are #{g.rank} this week</span>
              </a>
            ))}
          </div>
        </Card>

        <Card style={{ minHeight: 90, display: "grid", placeItems: "center", borderStyle: "dashed", background: "rgba(255,255,255,.5)" }}>
          <span className={s.mono} style={{ fontSize: 12, color: "var(--ink-2)" }}>AD SLOT, FREE TIER ONLY</span>
        </Card>
      </main>
    </>
  );
}
