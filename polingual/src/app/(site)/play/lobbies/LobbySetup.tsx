"use client";

import { Button, Pill } from "@/ui";
import app from "../../app/app.module.css";
import { GAMES, LANG_CHOICES, LANG_SETS, langName, SETUP_MODES, type GameId } from "../langs";
import { FlagSquare } from "../LearnWord";
import styles from "../play.module.css";
import type { LobbiesState } from "./useLobbies";

export function LobbySetup({ s }: { s: LobbiesState }) {
  return (
    <section className={app.stackSm} aria-labelledby="new-lobby">
      <h2 id="new-lobby" className={app.fieldLabel}>Start a lobby</h2>
      <div className={styles.setupModes} role="group" aria-label="Lobby setup">
        {SETUP_MODES.map((m) => (
          <button key={m.id} type="button" className={styles.game} aria-pressed={s.mode === m.id} onClick={() => s.setMode(m.id)} data-testid={`setup-${m.id}`}>
            <b>{m.name}</b>
            <span className={app.small}>{m.blurb}</span>
          </button>
        ))}
      </div>
      {s.mode !== "mix" ? <GamePicker s={s} /> : null}
      <LangPicker s={s} />
      <div className={app.row}>
        <label className={app.field}>
          Rounds
          <select value={s.rounds} onChange={(e) => s.setRounds(Number(e.target.value))}>
            {[5, 6, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      {s.botsOn ? (
        <label className={app.small}>
          <input type="checkbox" checked={s.fill} onChange={(e) => s.setFill(e.target.checked)} data-testid="fill-bots-option" /> Fill empty seats with bots after a few seconds
        </label>
      ) : null}
      <div>
        <Button onClick={() => void s.create()} disabled={s.busy} data-testid="create">
          Start lobby
        </Button>
      </div>
    </section>
  );
}

function GamePicker({ s }: { s: LobbiesState }) {
  const { mode, games, offered } = s;
  const toggle = (id: GameId) => (mode === "single" ? s.setGame(id) : s.setGames((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id])));
  return (
    <div className={styles.games} role="group" aria-label={mode === "single" ? "Game" : "Games in order"}>
      {GAMES.filter((g) => (offered ? offered.includes(g.id) : g.id !== "duel")).map((g) => {
        const pos = games.indexOf(g.id);
        const on = mode === "single" ? s.game === g.id : pos >= 0;
        return (
          <button key={g.id} type="button" className={styles.game} aria-pressed={on} onClick={() => toggle(g.id)} data-testid={`game-${g.id}`}>
            <b>
              {g.name}
              {mode === "sequence" && pos >= 0 ? <span className={styles.order}> #{pos + 1}</span> : null}
            </b>
            <span className={app.small}>{g.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}

function LangPicker({ s }: { s: LobbiesState }) {
  const { langs, setLangs } = s;
  return (
    <div className={app.stackSm} role="group" aria-label="Languages">
      <span className={app.fieldLabel}>Languages</span>
      <div className={styles.chips}>
        {LANG_SETS.map((set) => (
          <Pill key={set.id} aria-pressed={set.targets.join() === langs.join()} onClick={() => setLangs(set.targets)} data-testid={`lang-set-${set.id}`}>
            {set.label}
          </Pill>
        ))}
      </div>
      <div className={styles.chips}>
        {LANG_CHOICES.map((l) => (
          <Pill key={l} aria-pressed={langs.includes(l)} onClick={() => setLangs((xs) => (xs.includes(l) ? xs.filter((x) => x !== l) : xs.length >= 8 ? xs : [...xs, l]))} data-testid={`lang-${l}`}>
            <FlagSquare lang={l} size={18} />
            {langName(l)}
          </Pill>
        ))}
      </div>
    </div>
  );
}
