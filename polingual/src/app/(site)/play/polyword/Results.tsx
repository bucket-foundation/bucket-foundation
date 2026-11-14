"use client";

import { ctasFor, resultsAd, type Account, type Phase } from "@/lib/polyword/policy";
import type { Game, Stats } from "@/lib/polyword/progress";
import { MAX_GUESSES, type Puzzle } from "@/lib/polyword/puzzle";
import { distWidth, winRate } from "@/lib/polyword/view";
import app from "../../app/app.module.css";
import Ad from "../Ad";
import { RevealCard } from "../LearnWord";
import { langName } from "../langs";
import { LearnPanel } from "../Reveal";
import styles from "./polyword.module.css";
import { Countdown } from "./parts";
import { Button, ButtonLink } from "@/ui";

export type ResultsProps = { lang: string; puzzle: Puzzle; guesses: readonly string[]; game: Game | undefined; won: boolean; stats: Stats; rootMeaning: { lang: string; text: string }; isToday: boolean; account: Account; phase: Phase; first: boolean; onShare: () => void; onArchive: () => void; openSignIn: () => void };

function StatsBlock({ stats, won, mine }: { stats: Stats; won: boolean; mine: number | null }) {
  return (
    <>
      <dl className={styles.stats} data-testid="pw-stats">
        <div><dt>Played</dt><dd>{stats.played}</dd></div>
        <div><dt>Win %</dt><dd>{winRate(stats)}</dd></div>
        <div><dt>Streak</dt><dd>{stats.streak}</dd></div>
        <div><dt>Best</dt><dd>{stats.best}</dd></div>
      </dl>
      <ol className={styles.dist} aria-label="Guess distribution">
        {stats.dist.map((n, i) => (
          <li key={i} data-mine={won && mine === i + 1 ? true : undefined}>
            <span>{i + 1}</span>
            <b style={{ width: `${distWidth(n, stats.dist)}%` }}>{n}</b>
          </li>
        ))}
      </ol>
    </>
  );
}

function Ctas({ account, word, openSignIn }: { account: Account; word: string; openSignIn: () => void }) {
  const ctas = ctasFor(account);
  const pro = account === "paid";
  if (!ctas.length) return null;
  return (
    <div className={styles.learn} data-testid="pw-ctas">
      <p>
        <b>{pro ? "Keep the words you met today." : `Learn ${word} and the words around it.`}</b> {pro ? "Your review deck is waiting." : "Polingual teaches one meaning across all your languages at once."}
      </p>
      <div className={app.row}>
        {ctas.map((c) =>
          c.id === "sign-in" ? (
            <Button key={c.id} variant="ghost" size="md" onDark onClick={openSignIn} data-testid={`pw-cta-${c.id}`}>
              {c.label}
            </Button>
          ) : (
            <ButtonLink key={c.id} href={c.href} variant={c.primary ? "primary" : "ghost"} size={c.primary ? "lg" : "md"} data-testid={`pw-cta-${c.id}`}>
              {c.label}
            </ButtonLink>
          ),
        )}
      </div>
    </div>
  );
}

export default function Results(p: ResultsProps) {
  const { lang, puzzle, guesses, won, phase, first, account } = p;
  const ctas = ctasFor(account);
  return (
    <section className={styles.results} aria-labelledby="pw-result" data-testid="pw-results" data-won={won}>
      <h2 id="pw-result" className={styles.resultHead}>
        {won ? (guesses.length === 1 ? "First try!" : `Solved in ${guesses.length}`) : "Next time"}
      </h2>
      <ul className={styles.answer}>
        <RevealCard entry={{ lang, word: puzzle.word, roman: puzzle.roman ?? null, reading: null, meaning: p.rootMeaning.text, gloss: p.rootMeaning.text, correct: won }} index={0} rootLang={p.rootMeaning.lang} />
      </ul>
      <StatsBlock stats={p.stats} won={won} mine={p.game?.archive ? null : guesses.length} />
      <div className={styles.actions}>
        <Button onClick={p.onShare} data-testid="pw-share">
          Share {won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`}
        </Button>
        <Button variant="ghost" size="md" onClick={p.onArchive} data-testid="pw-more">
          Play past puzzles
        </Button>
      </div>
      {p.isToday ? (
        <p className={app.small}>
          Next {langName(lang)} word in <Countdown />. Or try today’s word in another language above.
        </p>
      ) : null}
      <Ctas account={account} word={puzzle.word} openSignIn={p.openSignIn} />
      <LearnPanel cta={!ctas.length} missed={won ? [] : [{ lang, word: puzzle.word, meaning: puzzle.gloss }]} />
      {resultsAd(phase, first, account) ? <Ad placement="results" testId="pw-ad-results" /> : null}
    </section>
  );
}
