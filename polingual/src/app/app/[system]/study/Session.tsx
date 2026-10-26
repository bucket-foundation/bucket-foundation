"use client";

import Link from "next/link";
import { useLangSystem } from "@learn/languages/useLangSystem";
import { useLangSession } from "@learn/languages/useLangSession";
import LangExercise, { ReadingsContext } from "@learn/languages/LangExercise";
import { appHref } from "@/lib/app/systems";
import styles from "../../app.module.css";

export default function Session({ systemId }: { systemId: string }) {
  const h = useLangSystem(systemId);
  const s = useLangSession(h);
  const { system, corpus, state } = h;

  if (h.status === "loading" || (h.status === "ready" && s.queue === null)) return <p className={styles.muted} aria-busy="true">Building today&apos;s session</p>;
  if (h.status === "error") return <p className={styles.error}>The session did not load. Reload the page to try again.</p>;
  if (!system || !corpus || !s.queue) {
    return (
      <section className={styles.card}>
        <h1 className={styles.title}>No such language system</h1>
        <Link className={styles.ghost} href={appHref.home}>Your systems</Link>
      </section>
    );
  }

  if (s.queue.length === 0) {
    return (
      <section className={styles.card} data-testid="session-empty">
        <p className={styles.label}>{system.name}</p>
        <h1 className={styles.title}>All done for today</h1>
        <p className={styles.body}>You met today&apos;s new words in every language and nothing is due. Come back tomorrow.</p>
        <Link className={styles.cta} href={appHref.home}>Your systems</Link>
      </section>
    );
  }

  if (s.i >= s.queue.length || !s.ex) {
    return (
      <section className={styles.card} data-testid="session-done">
        <p className={styles.label}>{system.name}</p>
        <h1 className={styles.title}>Session done</h1>
        <p className={styles.body} data-testid="session-score">
          {s.correct} of {s.graded} right · +{s.xpGained} XP · {state.stats.streak} day streak
        </p>
        <div className={styles.row}>
          <button type="button" className={styles.cta} onClick={s.restart}>Another round</button>
          <Link className={styles.ghost} href={appHref.home}>Your systems</Link>
        </div>
      </section>
    );
  }

  const pct = Math.round((s.i / s.queue.length) * 100);
  return (
    <section className={styles.session} data-testid="session">
      <div className={styles.sessionTop}>
        <Link className={styles.small} href={appHref.home}>{system.name}</Link>
        <span className={styles.level} data-testid="counter">
          {s.i + 1} / {s.queue.length} · {state.stats.xp} XP
        </span>
      </div>
      <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Session progress">
        <div style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.sessionBody} data-testid="session-body">
        <ReadingsContext.Provider value={s.readings}>
          <LangExercise key={`${s.i}-${s.entry?.itemId}-${s.entry?.lang}-${s.entry?.stage}`} ex={s.ex} onDone={s.onDone} optionReadings={s.optionReadings} links={s.links} targetLayout={!!h.shared} match={s.match} />
        </ReadingsContext.Provider>
      </div>
      <div className={styles.sessionFoot}>
        <button type="button" className={styles.link} onClick={s.skip} data-testid="skip-exercise">Skip this one</button>
        <label className={styles.toggle}>
          <input type="checkbox" checked={s.readings} onChange={(e) => s.showReadings(e.target.checked)} data-testid="readings-toggle" />
          Readings and IPA
        </label>
      </div>
    </section>
  );
}
