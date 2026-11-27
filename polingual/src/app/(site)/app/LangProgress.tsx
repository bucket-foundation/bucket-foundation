"use client";

import { LANGS, langName } from "@academy/lang-systems";
import { hoursText, type LangProgress } from "@/lib/app/lang-progress";
import styles from "./app.module.css";
import { Badge, Card } from "@/ui";

export default function LangProgressRow({ langs }: { langs: LangProgress[] }) {
  if (!langs.length) return null;
  return (
    <Card as="section" className={styles.langProgress} data-testid="lang-progress" aria-label="Progress by language">
      <p className={styles.label}>Progress by language</p>
      <ul className={styles.progressList}>
        {langs.map((l) => (
          <li key={l.lang} className={styles.progressItem} data-testid="lang-progress-row">
            <span className={styles.progressLang} lang={LANGS[l.lang]?.bcp47}>
              {langName(l.lang)}
            </span>
            <span className={styles.progressNums}>
              <Badge tone="lapis" data-testid="input-hours">
                {hoursText(l.inputHours)} h input
              </Badge>
              <Badge tone="parchment" data-testid="known-words">
                {l.knownWords} known words
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
