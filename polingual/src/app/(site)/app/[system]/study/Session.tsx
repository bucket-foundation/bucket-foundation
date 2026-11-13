"use client";

import Link from "next/link";
import { useLangSystem } from "@learn/languages/useLangSystem";
import { useLangSession } from "@learn/languages/useLangSession";
import LangExercise, { ReadingsContext } from "@learn/languages/LangExercise";
import { appHref } from "@/lib/app/systems";
import { streakCard } from "@/lib/app/streak";
import StreakCard from "../../StreakCard";
import WordCard, { QuizCard } from "./WordCard";
import styles from "../../app.module.css";
import { useEffect, useState } from "react";
import { isSilent, needsSound, subscribeSilent } from "@/lib/silent";
import { Button, ButtonLink, Card, Meter, SilentSwitch, Stage } from "@/ui";

export default function Session({ systemId }: { systemId: string }) {
  const h = useLangSystem(systemId);
  const s = useLangSession(h);
  const { system, corpus, state } = h;
  const [silent, setSilentState] = useState(false);
  const [deferred, setDeferred] = useState(0);
  useEffect(() => {
    setSilentState(isSilent());
    return subscribeSilent(() => setSilentState(isSilent()));
  }, []);
  const kind = s.ex?.kind;
  const skip = s.skip;
  const at = s.i;
  useEffect(() => {
    if (!silent || !needsSound(kind)) return;
    setDeferred((d) => d + 1);
    skip();
  }, [silent, kind, at, skip]);

  if (h.status === "loading" || (h.status === "ready" && s.queue === null))
    return (
      <p className={styles.muted} aria-busy="true">
        Building today&apos;s session
      </p>
    );
  if (h.status === "error")
    return (
      <Stage ground="paper">
        <p className={styles.error}>The session did not load. Reload the page to try again.</p>
      </Stage>
    );
  if (!system || !corpus || !s.queue) {
    return (
      <Stage ground="paper">
        <Card as="section" className={styles.card}>
          <h1 className={styles.title}>No such language system</h1>
          <ButtonLink variant="ghost" size="md" href={appHref.home}>
            Your systems
          </ButtonLink>
        </Card>
      </Stage>
    );
  }

  if (s.queue.length === 0) {
    return (
      <Stage ground="paper">
        <Card as="section" className={styles.card} data-testid="session-empty">
          <p className={styles.label}>{system.name}</p>
          <h1 className={styles.title}>All done for today</h1>
          <p className={styles.body}>You met today&apos;s new words in every language and nothing is due. Come back tomorrow.</p>
          <ButtonLink href={appHref.home}>Your systems</ButtonLink>
        </Card>
      </Stage>
    );
  }

  if (s.i >= s.queue.length || !s.ex) {
    return (
      <Stage ground="paper">
        <Card as="section" className={styles.card} data-testid="session-done">
          <p className={styles.label}>{system.name}</p>
          <h1 className={styles.title}>Session done</h1>
          <p className={styles.body} data-testid="session-score">
            {s.correct} of {s.graded} right · +{s.xpGained} XP · {state.stats.streak} day streak
          </p>
          <StreakCard card={streakCard([state], Date.now())} />
          <div className={`${styles.row} ${styles.gapTop}`}>
            <Button onClick={s.restart}>Another round</Button>
            <ButtonLink variant="ghost" size="md" href={appHref.home}>
              Your systems
            </ButtonLink>
          </div>
        </Card>
      </Stage>
    );
  }

  const pct = Math.round((s.i / s.queue.length) * 100);
  return (
    <Stage ground="paper" strip={false} tv={false}>
      <section className={styles.session} data-testid="session">
        <div className={styles.sessionTop}>
          <Link className={styles.small} href={appHref.home}>
            {system.name}
          </Link>
          <span className={styles.level} data-testid="counter">
            {s.i + 1} / {s.queue.length} · {state.stats.xp} XP
          </span>
          <SilentSwitch compact />
        </div>
        {silent && deferred ? (
          <p className={styles.small} role="status" data-testid="deferred">
            {deferred === 1 ? "1 listening card waits" : `${deferred} listening cards wait`} until sound is on. Their schedule stays where it was.
          </p>
        ) : null}
        <Meter value={pct} max={100} label="Session progress" />
        <div className={styles.sessionBody} data-testid="session-body">
          <ReadingsContext.Provider value={s.readings}>
            {s.ex?.kind === "intro" ? (
              <WordCard key={`${s.i}-${s.entry?.itemId}`} ex={s.ex} readings={s.readings} onNext={() => s.onDone([])} />
            ) : (
              <QuizCard ex={s.ex} readings={s.readings}>
                <LangExercise
                  key={`${s.i}-${s.entry?.itemId}-${s.entry?.lang}-${s.entry?.stage}`}
                  ex={s.ex}
                  onDone={s.onDone}
                  optionReadings={s.optionReadings}
                  links={s.links}
                  targetLayout={!!h.shared}
                  match={s.match}
                />
              </QuizCard>
            )}
          </ReadingsContext.Provider>
        </div>
        <div className={styles.sessionFoot}>
          <Button variant="quiet" size="sm" onClick={s.skip} data-testid="skip-exercise">
            Skip this one
          </Button>
          <label className={styles.toggle}>
            <input type="checkbox" checked={s.readings} onChange={(e) => s.showReadings(e.target.checked)} data-testid="readings-toggle" />
            Readings and IPA
          </label>
        </div>
      </section>
    </Stage>
  );
}
