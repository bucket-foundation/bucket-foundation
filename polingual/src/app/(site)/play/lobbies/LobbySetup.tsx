"use client";

import { Button } from "@/ui";
import app from "../../app/app.module.css";
import styles from "../play.module.css";
import { SetupFields } from "./SetupFields";
import type { LobbiesState } from "./useLobbies";

export function LobbySetup({ s }: { s: LobbiesState }) {
  return (
    <section className={app.stackSm} aria-labelledby="new-lobby">
      <h2 id="new-lobby" className={app.fieldLabel}>Start a lobby</h2>
      <SetupFields s={s} />
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
      <div className={styles.setupModes} role="group" aria-label="How you join">
        <Button bare className={styles.game} aria-pressed={!s.hostScreen} onClick={() => s.setHostScreen(false)} data-testid="mode-play">
          <b>Play on this device</b>
          <span className={app.small}>You take a seat and answer.</span>
        </Button>
        <Button bare className={styles.game} aria-pressed={s.hostScreen} onClick={() => s.setHostScreen(true)} data-testid="mode-screen">
          <b>Host on this screen</b>
          <span className={app.small}>This screen shows the game for the room. Phones join with the code.</span>
        </Button>
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
