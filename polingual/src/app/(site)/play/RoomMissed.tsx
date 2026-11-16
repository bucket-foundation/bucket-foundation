"use client";

import { missedWords, tallyLate, type WebLobbyState } from "@/lib/lobby/client";
import { learnEntry, learnHref } from "@/lib/lobby/learn-index";
import app from "../app/app.module.css";
import styles from "./play.module.css";
import { useLearnIndex } from "./useLearn";

export default function RoomMissed({ lobby, at }: { lobby: WebLobbyState; at: number }) {
  const learnIndex = useLearnIndex();
  const missed = missedWords(lobby).filter((w) => !w.includes(","));
  return (
    <section className={styles.upsell} data-testid="learn-upsell">
      <b>Learn the words you missed</b>
      {lobby.status !== "done" && !tallyLate(lobby, at) ? (
        <p className={app.small} aria-busy="true" data-testid="missed-loading">Counting your answers</p>
      ) : lobby.status !== "done" ? (
        <p className={app.small} data-testid="missed-late">Your answers are saved. Lessons cover every word in this game.</p>
      ) : missed.length ? (
        <ul className={styles.missed}>
          {missed.map((w) => {
            const e = lobby.prompts.flatMap((p) => p.reveal ?? []).find((r) => r.correct && r.word === w);
            return (
              <li key={w}>
                <a href={learnHref(e ? learnEntry(learnIndex, e.lang, e.word, e.meaning) : null)} data-testid="learn-missed">{w}</a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={app.small}>A clean sweep. Lessons take you further.</p>
      )}
      <p className={app.small}>Lessons and courses come with a Polingual subscription.</p>
    </section>
  );
}
