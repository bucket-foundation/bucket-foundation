"use client";

import type { Dispatch, SetStateAction } from "react";
import { Button, Pill } from "@/ui";
import app from "../../app/app.module.css";
import { GAMES, LANG_CHOICES, LANG_SETS, langName, SETUP_MODES, type GameId, type SetupMode } from "../langs";
import { FlagSquare } from "../LearnWord";
import styles from "../play.module.css";

export type SetupState = {
  mode: SetupMode;
  setMode: (m: SetupMode) => void;
  game: GameId;
  setGame: (g: GameId) => void;
  games: GameId[];
  setGames: Dispatch<SetStateAction<GameId[]>>;
  langs: string[];
  setLangs: Dispatch<SetStateAction<string[]>>;
  offered: string[] | null;
};

export function SetupFields({ s, compact = false }: { s: SetupState; compact?: boolean }) {
  return (
    <>
      <div className={styles.setupModes} role="group" aria-label="Lobby setup">
        {SETUP_MODES.map((m) => (
          <Button bare key={m.id} className={styles.game} aria-pressed={s.mode === m.id} onClick={() => s.setMode(m.id)} data-testid={`setup-${m.id}`}>
            <b>{m.name}</b>
            {compact ? null : <span className={app.small}>{m.blurb}</span>}
          </Button>
        ))}
      </div>
      {s.mode !== "mix" ? <GamePicker s={s} compact={compact} /> : null}
      <LangPicker s={s} />
    </>
  );
}

function GamePicker({ s, compact }: { s: SetupState; compact: boolean }) {
  const { mode, games, offered } = s;
  const toggle = (id: GameId) => (mode === "single" ? s.setGame(id) : s.setGames((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id])));
  return (
    <div className={styles.games} role="group" aria-label={mode === "single" ? "Game" : "Games in order"}>
      {GAMES.filter((g) => (offered?.length ? offered.includes(g.id) : g.id !== "duel")).map((g) => {
        const pos = games.indexOf(g.id);
        const on = mode === "single" ? s.game === g.id : pos >= 0;
        return (
          <Button bare key={g.id} className={styles.game} aria-pressed={on} onClick={() => toggle(g.id)} data-testid={`game-${g.id}`}>
            <b>
              {g.name}
              {mode === "sequence" && pos >= 0 ? <span className={styles.order}> #{pos + 1}</span> : null}
            </b>
            {compact ? null : <span className={app.small}>{g.blurb}</span>}
          </Button>
        );
      })}
    </div>
  );
}

function LangPicker({ s }: { s: SetupState }) {
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
