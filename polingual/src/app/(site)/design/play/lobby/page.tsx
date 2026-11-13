"use client";

import { useState } from "react";
import Header from "../Header";
import { FRIENDS, GROUP_BOARD, GROUPS, ME } from "../mock";
import { Avatar, Flag } from "../../../play-kit/parts";
import s from "../design.module.css";

const GAMES = ["Flags", "Same word", "Tiles", "Daily words", "Live"];
const SETS = [
  { id: "romance", langs: ["es", "fr", "it", "pt"] },
  { id: "germanic", langs: ["de", "nl", "sv"] },
  { id: "asia", langs: ["ja", "zh", "ko"] },
  { id: "world", langs: ["es", "de", "ja", "ar"] },
];
const WHO = [
  { id: "public", name: "Anyone", blurb: "Listed on Play home" },
  { id: "friends", name: "Friends", blurb: "Your 4 friends see it" },
  { id: "group", name: "A group", blurb: "Invites the whole group" },
  { id: "private", name: "Code only", blurb: "Share the code yourself" },
];
const SCREEN = [
  { id: "own", name: "Own devices", blurb: "Everyone plays on a phone or laptop" },
  { id: "tv", name: "TV plus phones", blurb: "One big screen, phones as buttons" },
];

export default function LobbyMock() {
  const [game, setGame] = useState("Flags");
  const [set, setSet] = useState("romance");
  const [who, setWho] = useState("group");
  const [group, setGroup] = useState(GROUPS[0].name);
  const [screen, setScreen] = useState("tv");
  const [open, setOpen] = useState(false);

  const players = who === "group" ? GROUP_BOARD.slice(0, 3) : FRIENDS.slice(0, 2).map((f) => ({ handle: f.handle, lang: f.lang, look: f.look, points: 0 }));

  return (
    <>
      <Header />
      <main className={s.main}>
        <p className={s.label}>Start a game</p>
        <h1 className={s.title}>{open ? `${game} room` : "What are we playing?"}</h1>

        {!open && (
          <div className={s.grid2}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <section className={s.card}>
                <h2 style={{ fontSize: 20 }}>Game</h2>
                <div className={s.row} style={{ marginTop: 10 }}>
                  {GAMES.map((g) => <button key={g} className={s.chip} aria-pressed={game === g} onClick={() => setGame(g)}>{g}</button>)}
                </div>
                <h2 style={{ fontSize: 20, marginTop: 16 }}>Languages</h2>
                <div className={s.row} style={{ marginTop: 10 }}>
                  {SETS.map((x) => (
                    <button key={x.id} className={s.chip} aria-pressed={set === x.id} onClick={() => setSet(x.id)}>
                      {x.langs.map((l) => <Flag key={l} lang={l} size={12} />)}
                    </button>
                  ))}
                </div>
              </section>
              <section className={s.card}>
                <h2 style={{ fontSize: 20 }}>Who</h2>
                <div className={s.opts} style={{ marginTop: 10 }}>
                  {WHO.map((w) => (
                    <button key={w.id} className={s.opt} aria-pressed={who === w.id} onClick={() => setWho(w.id)}><b>{w.name}</b><span>{w.blurb}</span></button>
                  ))}
                </div>
                {who === "group" && (
                  <div className={s.row} style={{ marginTop: 12 }}>
                    {GROUPS.map((g) => <button key={g.name} className={s.chip} aria-pressed={group === g.name} onClick={() => setGroup(g.name)}><span className={s.dot} style={{ background: g.color }} />{g.name}</button>)}
                  </div>
                )}
              </section>
              <section className={s.card}>
                <h2 style={{ fontSize: 20 }}>Screen</h2>
                <div className={s.opts} style={{ marginTop: 10 }}>
                  {SCREEN.map((x) => (
                    <button key={x.id} className={s.opt} aria-pressed={screen === x.id} onClick={() => setScreen(x.id)}><b>{x.name}</b><span>{x.blurb}</span></button>
                  ))}
                </div>
              </section>
              <button className={s.cta} onClick={() => setOpen(true)}>{screen === "tv" ? "Open on this screen as TV" : "Create room"}</button>
            </div>

            {who === "group" && (
              <section className={s.card}>
                <div className={s.between}><h2>{group}</h2><span className={s.mono}>THIS WEEK</span></div>
                <p className={s.muted} style={{ margin: "6px 0 12px" }}>Group games count double on this board. Closes Sunday 20:00.</p>
                <ol className={s.feed}>
                  {GROUP_BOARD.map((p, i) => (
                    <li key={p.handle} style={{ borderColor: p.handle === ME.handle ? "var(--lapis)" : undefined }}>
                      <span className={s.mono} style={{ width: 20 }}>{i + 1}</span>
                      <Avatar look={p.look} size={34} />
                      <Flag lang={p.lang} size={12} />
                      <b>{p.handle}</b>
                      <time className={s.mono} style={{ fontSize: 14, color: "var(--tyrian)" }}>{p.points}</time>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}

        {open && (
          <div className={s.grid2}>
            <section className={s.card} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className={s.between}>
                <div>
                  <p className={s.label}>Room code</p>
                  <p className={s.code}>K7M2QX</p>
                </div>
                {who === "group" && <span className={s.tier} style={{ background: GROUPS.find((g) => g.name === group)?.color, color: "#F6EEDC" }}>{group}</span>}
              </div>
              <div className={s.players}>
                {players.map((p) => (
                  <div key={p.handle} className={`${s.player} ${s.pop}`}><Avatar look={p.look} size={56} bounce /><span className={s.row} style={{ gap: 4 }}><Flag lang={p.lang} size={11} />{p.handle}</span></div>
                ))}
                <div className={s.player} data-bot="true"><Avatar look={{ body: "#8A8076", face: "smile", hat: "none", outfit: "plain", plinth: "#EBDDBE" }} size={56} /><span>bot fills in 20 s</span></div>
              </div>
              <div className={s.row}>
                {screen === "tv" ? <a className={s.cta} href="/design/play/tv">Show on TV</a> : <button className={s.cta}>Start</button>}
                <button className={s.ghost}>Invite</button>
                <button className={s.ghost} onClick={() => setOpen(false)}>Back</button>
              </div>
              <p className={s.note}>{who === "group" ? `Everyone in ${group} got a push: "${ME.handle} started ${game}".` : "Friends see this room in Friends playing."}</p>
            </section>
            <section className={s.card}>
              <h2 style={{ fontSize: 20 }}>Chat</h2>
              <ul className={s.feed} style={{ marginTop: 10 }}>
                <li><b>nonna.r</b> I am ready!</li>
                <li><b>sofi</b> 👋</li>
              </ul>
              <div className={s.row} style={{ marginTop: 10 }}>
                {["Good luck", "Ready", "Rematch?", "🎉"].map((q) => <button key={q} className={s.chip}>{q}</button>)}
              </div>
              <p className={s.note} style={{ marginTop: 10 }}>Under-18 players see preset phrases only.</p>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
