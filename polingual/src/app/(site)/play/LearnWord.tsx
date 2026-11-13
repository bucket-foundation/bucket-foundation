"use client";

import { TileFace } from "@/app/tile";
import { flagFor } from "@/lib/flags";
import { bcp47 } from "@/lib/speak";
import { LANGS, readingLabel } from "@academy/lang-systems";
import type { RevealEntry } from "@academy/lobbies";
import { PlayTile } from "../word/Speak";
import { langName } from "./langs";
import styles from "./play.module.css";

export function FlagSquare({ lang, size = 22 }: { lang: string; size?: number }) {
  return <span className={styles.flagSquare} style={{ background: flagFor(lang), width: size, height: size }} aria-hidden="true" />;
}

export function LangCard({ lang, big = false }: { lang: string; big?: boolean }) {
  return (
    <span className={styles.langCard} data-big={big} data-testid="lang-card">
      <FlagSquare lang={lang} size={big ? 30 : 20} />
      <span>{langName(lang)}</span>
    </span>
  );
}

export function entryReading(e: Pick<RevealEntry, "reading" | "roman">): string | undefined {
  return readingLabel(e.reading ?? undefined) ?? e.roman ?? undefined;
}

export function RevealCard({ entry, index }: { entry: RevealEntry; index: number }) {
  const item = { id: `${entry.lang}:${entry.word}:${index}`, text: entry.word, lang: bcp47(entry.lang) };
  const definition = entry.gloss || entry.meaning;
  return (
    <li className={styles.revealCard} data-correct={entry.correct} data-testid="reveal-entry">
      <TileFace
        as="div"
        lang={entry.lang}
        code={entry.lang}
        label={langName(entry.lang)}
        word={entry.word}
        reading={entryReading(entry)}
        rtl={LANGS[entry.lang]?.rtl}
        index={Math.min(index, 3)}
        play={<PlayTile item={item} label={`Hear ${entry.word} in ${langName(entry.lang)}`} />}
      />
      <p className={styles.revealDef} data-testid="reveal-definition">
        {entry.correct ? <b className={styles.revealMark} aria-label="Right answer">✓ </b> : null}
        {definition ? definition : "No entry for this word yet."}
        {entry.meaning && entry.gloss && entry.meaning.toLowerCase() !== entry.gloss.toLowerCase() ? <span className={styles.revealAlt}> · {entry.meaning}</span> : null}
      </p>
    </li>
  );
}
