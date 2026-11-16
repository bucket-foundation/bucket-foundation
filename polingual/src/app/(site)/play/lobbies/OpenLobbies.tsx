"use client";

import { Button } from "@/ui";
import app from "../../app/app.module.css";
import { gameName } from "../langs";
import { LangCard } from "../LearnWord";
import styles from "../play.module.css";
import type { LobbiesState } from "./useLobbies";

export function OpenLobbies({ s }: { s: LobbiesState }) {
  const { open, router } = s;
  return (
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
            <Button variant="ghost" size="md" onClick={() => router.push(`/play/${l.code}`)} disabled={l.status !== "lobby" && !l.isMember && !l.standing}>
              {l.isMember ? "Open" : "Join"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
