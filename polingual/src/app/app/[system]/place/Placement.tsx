"use client";

import Link from "next/link";
import { langName } from "@academy/lang-systems";
import { levelLabel } from "@academy/placement-cefr";
import { useLangSystem } from "@learn/languages/useLangSystem";
import { useCefrPlacement } from "@learn/languages/useCefrPlacement";
import LangExercise from "@learn/languages/LangExercise";
import { appHref } from "@/lib/app/systems";
import styles from "../../app.module.css";

export default function Placement({ systemId, lang: requested }: { systemId: string; lang: string | null }) {
  const h = useLangSystem(systemId);
  const run = useCefrPlacement(h, requested);
  const { system } = h;

  if (h.status === "loading") return <p className={styles.muted} aria-busy="true">Loading placement</p>;
  if (h.status === "error") return <p className={styles.error}>Placement did not load. Reload the page to try again.</p>;
  if (!system || !run.lang) {
    return (
      <section className={styles.card}>
        <h1 className={styles.title}>No such language system</h1>
        <Link className={styles.ghost} href={appHref.home}>Your systems</Link>
      </section>
    );
  }
  const lang = run.lang;

  if (run.result) {
    const nextLang = system.targets.find((t) => t !== lang && system.placement[t] === undefined);
    const known = run.result.placeIds.length;
    const level = levelLabel(run.result);
    return (
      <section className={styles.card} data-testid="placement-done" data-level={run.result.level}>
        <p className={styles.label}>Placement · {langName(lang)}</p>
        <h1 className={styles.title}>Level {level}</h1>
        <p className={styles.body}>
          {run.answers.length} questions. {known ? `${known} words you got right start as known.` : "You start from the first words."}
          {run.result.mapping === "none" ? " This language has no CEFR exam, so the level is a Polingual band." : " Levels map Polingual word bands to CEFR. No exam has checked them yet."}
        </p>
        <ul className={styles.bands} data-testid="bands">
          {run.result.bands.map((b) => (
            <li key={b.band}>
              {b.band}: {b.right} of {b.asked} right, {b.passed ? "passed" : "not passed"}
            </li>
          ))}
        </ul>
        {h.saveState === "local-only" || h.saveState === "failed" ? <p className={styles.small}>Saved on this device. It syncs when the connection comes back.</p> : null}
        <div className={styles.row}>
          {nextLang ? (
            <Link className={styles.cta} href={appHref.place(system.id, nextLang)}>Place {langName(nextLang)}</Link>
          ) : (
            <Link className={styles.cta} href={appHref.study(system.id)}>Start today</Link>
          )}
          <Link className={styles.ghost} href={appHref.home}>Your systems</Link>
        </div>
      </section>
    );
  }

  if (!run.question) return <p className={styles.muted} aria-busy="true">Picking the next question</p>;

  return (
    <section className={`${styles.card} ${styles.wide}`} data-testid="placement">
      <p className={styles.label}>Placement · {langName(system.root)} to {langName(lang)}</p>
      <p className={styles.small} data-testid="counter">Question {run.answers.length + 1} · level {run.band}</p>
      <div className={styles.exercise}>
        <LangExercise key={`${run.answers.length}`} ex={run.question.ex} optionReadings={run.readings} onDone={(r) => run.answer(r.every((x) => x.rating > 1))} />
      </div>
      <button type="button" className={styles.link} onClick={() => run.answer(false)} data-testid="skip">
        I do not know
      </button>
    </section>
  );
}
