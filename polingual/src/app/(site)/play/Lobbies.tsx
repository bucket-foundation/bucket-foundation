"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { normalizeLobbyCode } from "@academy/lobbies";
import { LobbyError, lobbyError, type LobbySummary } from "@/lib/lobby/client";
import app from "../app/app.module.css";
import { GAMES, gameName, LANG_SETS, roundSecondsFor, type GameId } from "./langs";
import { LangCard } from "./LearnWord";
import Nickname from "./Nickname";
import styles from "./play.module.css";
import { savedNickname, usePlay } from "./usePlay";

const LIST_MS = 5000;

export default function Lobbies() {
  const router = useRouter();
  const { state, api, connect } = usePlay();
  const [open, setOpen] = useState<LobbySummary[] | null>(null);
  const [code, setCode] = useState("");
  const [game, setGame] = useState<GameId>("daily");
  const [set, setSet] = useState(LANG_SETS[0].id);
  const [rounds, setRounds] = useState(6);
  const [busy, setBusy] = useState(false);
  const [botsOn, setBotsOn] = useState(false);
  const [fill, setFill] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ready = state.status === "ready";

  const refresh = useCallback(async () => {
    if (!ready) return;
    try {
      const res = await api.listing();
      setOpen(res.lobbies);
      setBotsOn(res.bots);
    } catch (err) {
      setError(lobbyError(err instanceof LobbyError ? err.code : undefined));
    }
  }, [api, ready]);

  useEffect(() => {
    void refresh();
    if (!ready) return;
    const t = window.setInterval(() => void refresh(), LIST_MS);
    return () => window.clearInterval(t);
  }, [refresh, ready]);

  const create = async () => {
    if (state.status !== "ready") return;
    const chosen = LANG_SETS.find((s) => s.id === set) ?? LANG_SETS[0];
    setBusy(true);
    setError(null);
    try {
      const lobby = await api.create({ name: `${state.nickname}'s lobby`, root: chosen.root, targets: chosen.targets, rounds, roundSeconds: roundSecondsFor(game), listed: true, displayName: state.nickname, game, fillBots: botsOn && fill });
      router.push(`/play/${lobby.code}`);
    } catch (err) {
      setError(lobbyError(err instanceof LobbyError ? err.code : undefined));
      setBusy(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeLobbyCode(code);
    if (!c) {
      setError("Codes have 6 letters and numbers.");
      return;
    }
    router.push(`/play/${c}`);
  };

  return (
    <div className={app.stack} data-testid="lobbies">
      <section className={app.stackSm}>
        <p className={app.label}>Free to play</p>
        <h1 className={app.title}>Play with friends</h1>
        <p className={app.muted}>Start a lobby, share the code, and play together from the app or a browser. No account needed.</p>
      </section>

      <a href="/play/polyword" className={styles.daily} data-testid="polyword-link">
        <b>Polyword</b>
        <span className={app.small}>One word a day. Every miss shows its meaning in another language.</span>
      </a>

      {state.status === "loading" ? <p className={app.muted} aria-busy="true">Loading</p> : null}
      {state.status === "error" ? <p className={app.error} role="alert">{state.message}</p> : null}
      {state.status === "needs-name" || state.status === "error" ? <Nickname initial={savedNickname()} onSubmit={(n) => void connect(n)} /> : null}

      {ready ? (
        <>
          <form className={styles.nick} onSubmit={join}>
            <label className={app.field}>
              Join with a code
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={8} autoCapitalize="characters" placeholder="ABC123" data-testid="join-code" />
            </label>
            <button type="submit" className={app.ghost} data-testid="join-go">Join</button>
          </form>

          <section className={app.stackSm} aria-labelledby="new-lobby">
            <h2 id="new-lobby" className={app.fieldLabel}>Start a lobby</h2>
            <div className={styles.games} role="group" aria-label="Game">
              {GAMES.map((g) => (
                <button key={g.id} type="button" className={styles.game} aria-pressed={game === g.id} onClick={() => setGame(g.id)} data-testid={`game-${g.id}`}>
                  <b>{g.name}</b>
                  <span className={app.small}>{g.blurb}</span>
                </button>
              ))}
            </div>
            <div className={app.row}>
              <label className={app.field}>
                Languages
                <select value={set} onChange={(e) => setSet(e.target.value)} data-testid="lang-set">
                  {LANG_SETS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label className={app.field}>
                Rounds
                <select value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
                  {[5, 6, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            {botsOn ? (
              <label className={app.small}>
                <input type="checkbox" checked={fill} onChange={(e) => setFill(e.target.checked)} data-testid="fill-bots-option" /> Fill empty seats with bots after a few seconds
              </label>
            ) : null}
            <div>
              <button type="button" className={app.cta} onClick={() => void create()} disabled={busy} data-testid="create">
                Start lobby
              </button>
            </div>
          </section>

          <section className={app.stackSm} aria-labelledby="open-lobbies">
            <h2 id="open-lobbies" className={app.fieldLabel}>Open lobbies</h2>
            {open === null ? <p className={app.small}>Loading</p> : null}
            {open?.length === 0 ? <p className={app.small}>No open lobbies right now. Start one and share the code.</p> : null}
            <ul className={styles.list}>
              {open?.map((l) => (
                <li key={l.id} className={styles.lobbyRow}>
                  <span>
                    <b>{l.name}</b>
                    {l.standing ? <span className={styles.tag} data-testid="standing-tag"> always on</span> : null}
                    {l.hostHandle ? <span className={styles.handle} data-testid="host-handle"> @{l.hostHandle}</span> : null}
                    <br />
                    <span className={styles.tag}>
                      {gameName(l.game)} · {l.players} playing{l.bots ? ` · ${l.bots} bot${l.bots === 1 ? "" : "s"}` : ""}{l.status === "playing" ? " · in a game" : ""}
                    </span>
                    <span className={styles.langRow}>
                      {l.targets.map((t) => (
                        <LangCard key={t} lang={t} />
                      ))}
                    </span>
                  </span>
                  <button type="button" className={app.ghost} onClick={() => router.push(`/play/${l.code}`)} disabled={l.status !== "lobby" && !l.isMember && !l.standing}>
                    {l.isMember ? "Open" : "Join"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <p className={app.small}>Playing as {state.nickname}{state.identity.kind === "guest" ? ". Sign in on the Learn tab to save streaks and stats." : "."}</p>
        </>
      ) : null}

      {error ? <p className={app.error} role="alert">{error}</p> : null}
    </div>
  );
}
