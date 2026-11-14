"use client";

import { cssVars } from "@/ui/vars";

import { displayNickname, MARKS, optionLabel, promptView, team, type Mark, type Question, type Standing, type TeamStanding } from "@/lib/stoa/client";
import styles from "./stoa.module.css";
import { Avatar } from "@/ui/avatar";


export function Glyph({ glyph }: { glyph: Mark["glyph"] }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (glyph === "wave") return <svg {...common}><path d="M2 9c3-3 5-3 8 0s5 3 8 0 3-2 4-1" /><path d="M2 16c3-3 5-3 8 0s5 3 8 0 3-2 4-1" /></svg>;
  if (glyph === "spark") return <svg {...common}><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19" /></svg>;
  if (glyph === "leaf") return <svg {...common}><path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16Z" /><path d="M4 20 13 11" /></svg>;
  return <svg {...common}><path d="M16 3a9 9 0 1 0 5 15A7 7 0 0 1 16 3Z" /></svg>;
}

function MarkBadge({ mark }: { mark: Mark }) {
  return (
    <span className={styles.mark}>
      <Glyph glyph={mark.glyph} />
      <span className={styles.letter}>{mark.letter}</span>
    </span>
  );
}

export function Prompt({ q }: { q: Pick<Question, "kind" | "prompt"> }) {
  const v = promptView(q);
  return (
    <div className={styles.prompt} data-testid="prompt">
      <p className={styles.lead} dir="auto">{v.lead}</p>
      <p key={v.word} className={styles.word} dir="auto" lang={q.kind === "pick_word" ? q.prompt.home_lang : q.kind === "translate" ? q.prompt.from : undefined}>{v.word}</p>
      {v.tail ? <p className={styles.tail} dir="auto">{v.tail}</p> : null}
    </div>
  );
}

export type TileState = "idle" | "dim" | "chosen" | "right";

export function Tiles({
  q,
  grid,
  states,
  counts,
  onPick,
  disabled,
}: {
  q: Pick<Question, "kind" | "options" | "prompt">;
  grid?: boolean;
  states?: TileState[];
  counts?: number[] | null;
  onPick?: (i: number) => void;
  disabled?: boolean;
}) {
  return (
    <ul className={`${styles.tiles} ${grid ? styles.grid : ""}`} data-testid="tiles">
      {MARKS.map((mark, i) => {
        const label = optionLabel(q, i);
        const name = q.kind === "pick_word" ? q.prompt.lang : q.kind === "translate" ? q.prompt.to : undefined;
        return (
          <li key={mark.letter} style={cssVars({ "--i": i })}>
            <button
              type="button"
              className={styles.tile}
              data-pigment={mark.pigment}
              data-state={states?.[i] ?? "idle"}
              data-testid={`tile-${mark.letter}`}
              disabled={disabled || !onPick}
              onClick={() => onPick?.(i)}
              style={counts ? cssVars({ "--share": `${Math.round(((counts[i] ?? 0) / Math.max(1, counts.reduce((a, b) => a + b, 0))) * 100)}%` }) : undefined}
              aria-label={[mark.letter, mark.glyph, label, states?.[i] === "right" ? "correct" : states?.[i] === "chosen" ? "your answer" : null].filter(Boolean).join(", ")}
            >
              <MarkBadge mark={mark} />
              <span className={styles.text} dir="auto" lang={name}>{label}</span>
              {counts ? <span className={styles.count}>{counts[i] ?? 0}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Move({ by }: { by: number }) {
  if (!by) return null;
  return (
    <span className={styles.move} data-dir={by > 0 ? "up" : "down"} data-testid="rank-move">
      {by > 0 ? `\u25B2${by}` : `\u25BC${-by}`}
    </span>
  );
}

export function Standings({ rows, me, testId, moves }: { rows: Standing[]; me?: string; testId?: string; moves?: Record<string, number> }) {
  return (
    <ol className={styles.standings} data-testid={testId ?? "standings"}>
      {rows.map((r, i) => (
        <li key={r.player_id} data-me={r.player_id === me} style={cssVars({ "--i": i })}>
          <span className={styles.who}><Avatar seed={r.nickname} size="sm" variant="head" label="" />{displayNickname(r.nickname)}</span>
          <Move by={moves?.[r.player_id] ?? 0} />
          <span>{r.points}</span>
        </li>
      ))}
    </ol>
  );
}

export function TeamStandings({ rows, mine }: { rows: TeamStanding[]; mine?: number | null }) {
  return (
    <ol className={styles.standings} data-testid="team-standings">
      {rows.map((r, i) => {
        const t = team(r.team);
        return (
          <li key={r.team} data-me={r.team === mine} data-pigment={t?.pigment} style={cssVars({ "--i": i })}>
            <span>
              Team {t?.name} <span className={styles.members}>{r.members} {r.members === 1 ? "player" : "players"}{r.unisons ? `, ${r.unisons} in unison` : ""}</span>
            </span>
            <span>{r.points}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TeamTag({ slot }: { slot: number | null | undefined }) {
  const t = team(slot);
  if (!t) return null;
  return <span className={styles.teamTag} data-pigment={t.pigment} data-testid="team-tag">Team {t.name}</span>;
}

export function Brand({ link = true }: { link?: boolean }) {
  const inner = (
    <>
      <img src="/brand/kit/mark.svg" alt="" width={32} height={32} />
      <span>polingual live</span>
    </>
  );
  return link ? (
    <a href="/" className={styles.brand} aria-label="Polingual home">{inner}</a>
  ) : (
    <span className={styles.brand} data-testid="brand-plain">{inner}</span>
  );
}
