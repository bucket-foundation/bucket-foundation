"use client";

import { useEffect, type ReactNode } from "react";
import { bcp47, cancelSpeech, say } from "@/lib/speak";
import { langDir, langName, type Exercise, type Reading } from "@/lib/academy/lang-systems";
import { Button, FlagTile, Sticker } from "@/ui";
import { flagTileStyles } from "@/ui/FlagTile";
import styles from "../../app.module.css";

const HIDDEN = new Set(["listen", "type-heard", "spell-heard"]);

function readingText(r: Reading | undefined, on: boolean): string | undefined {
  if (!on || !r) return undefined;
  return r.ipa ? `/${r.ipa.replace(/^\/|\/$/g, "")}/` : r.roman ?? r.kana;
}

function HeroTile({ word, lang, reading, plain }: { word: string; lang: string; reading?: string; plain?: boolean }) {
  return (
    <div className={styles.wordStage}>
      <Sticker name="seal" side="right" x="2px" y="0px" size={44} rotate={10} />
      <Sticker name="torn-label" anchor="bottom" x="0px" y="0px" size={72} rotate={-6} />
      <FlagTile
        as="div"
        className={styles.wordTile}
        lang={lang}
        code={lang.toUpperCase()}
        label={langName(lang)}
        word={word}
        reading={reading}
        plain={plain}
        rtl={langDir(lang) === "rtl"}
        play={<button type="button" className={flagTileStyles.play} aria-label={`Play ${plain ? "the word" : word}`} onClick={() => say(word, bcp47(lang))} />}
      />
    </div>
  );
}

export function QuizCard({ ex, readings, children }: { ex: Exercise; readings: boolean; children: ReactNode }) {
  useEffect(() => () => cancelSpeech(), [ex]);
  if (ex.kind === "match" || !ex.prompt) return <>{children}</>;
  const hidden = HIDDEN.has(ex.kind);
  return (
    <div className={styles.quizCard}>
      <div className={styles.quizBody}>{children}</div>
      <div className={styles.quizTile}>
        <HeroTile word={hidden ? "?" : ex.prompt} lang={ex.promptLang} reading={hidden ? undefined : readingText(ex.promptReading, readings)} plain={hidden} />
      </div>
    </div>
  );
}

export default function WordCard({ ex, readings, onNext }: { ex: Exercise; readings: boolean; onNext: () => void }) {
  useEffect(() => {
    say(ex.answer, bcp47(ex.answerLang), { auto: true });
    return () => cancelSpeech();
  }, [ex]);
  const ipa = readingText(ex.answerReading, readings);
  return (
    <section className={styles.wordCard} data-testid="exercise" data-kind={ex.kind} data-lang={ex.lang}>
      <span className={styles.wordKind}>New word · {langName(ex.answerLang)}</span>
      <HeroTile word={ex.answer} lang={ex.answerLang} reading={ipa} />
      <dl className={styles.wordRows}>
        <div>
          <dt>{langName(ex.promptLang)}</dt>
          <dd lang={ex.promptLang} dir={langDir(ex.promptLang)} data-testid="intro-meaning">
            {ex.prompt}
          </dd>
        </div>
        {ipa ? (
          <div>
            <dt>Say it</dt>
            <dd data-testid="intro-reading">{ipa}</dd>
          </div>
        ) : null}
        <div>
          <dt>Script</dt>
          <dd>
            {langName(ex.answerLang)} · {ex.answer.length} letters
          </dd>
        </div>
        {ex.family?.length ? (
          <div data-testid="family">
            <dt>Same root</dt>
            <dd>{ex.family.map((f) => `${f.word} (${langName(f.lang)})`).join(" · ")}</dd>
          </div>
        ) : null}
        {ex.note ? (
          <div>
            <dt>Note</dt>
            <dd>{ex.note}</dd>
          </div>
        ) : null}
      </dl>
      <div className={styles.wordDock}>
        <Button block onClick={onNext} data-testid="next">
          Got it
        </Button>
      </div>
    </section>
  );
}
