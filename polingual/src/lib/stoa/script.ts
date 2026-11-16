import { displayNickname, langName, team, type Question, type Snapshot, type Standing } from "./client";

export type Track = "lobby" | "question" | "reveal" | "board" | "finale" | "silent";
export type Sfx = "join" | "open" | "lock" | "tick" | "tock" | "reveal" | "right" | "wrong" | "fanfare" | "whoosh" | "streak" | "climb";
export type Line = { text: string; lang?: string; word?: boolean };
export type Cue = { track?: Track; sfx?: Sfx[]; say?: Line[] };

const ROUND_OPEN = [
  ["Round one. Warm up those brains.", "Here we go. Round one.", "Round one. Eyes on the board."],
  ["Round two. The words get harder.", "Round two. No more warm up.", "On to round two."],
  ["Final round. Everything is on the line.", "Round three. This is where it gets wild.", "Last round. Make it count."],
];
const ALL_RIGHT = ["Everybody got it. Beautiful.", "A clean sweep.", "The whole room nailed it."];
const NONE_RIGHT = ["Nobody saw that one coming.", "Zero. That one was sneaky.", "Ouch. Not a single right answer."];
const MOST_RIGHT = ["Most of you knew that one.", "Strong showing.", "Nice work, room."];
const FEW_RIGHT = ["Only a few got that one.", "A tough one.", "That one split the room."];
const NEW_LEADER = ["{name} takes the lead!", "New leader: {name}!", "{name} jumps to the top!"];
const SAME_LEADER = ["{name} holds on to first.", "{name} is still on top.", "Nobody can catch {name} yet."];

export function pick<T>(list: readonly T[], seed: number): T {
  return list[((seed % list.length) + list.length) % list.length];
}

export function trackFor(phase: Snapshot["room"]["phase"] | undefined): Track {
  if (phase === "lobby") return "lobby";
  if (phase === "question") return "question";
  if (phase === "reveal") return "reveal";
  if (phase === "board") return "board";
  if (phase === "finale") return "finale";
  return "silent";
}

function questionLine(q: Pick<Question, "kind" | "prompt">): Line[] {
  if (q.kind === "which_language") return [{ text: "Which language is this?" }];
  if (q.kind === "translate") return [{ text: `Translate from ${langName(q.prompt.from ?? "")} into ${langName(q.prompt.to ?? "")}.` }];
  return [{ text: `Pick the word for ${q.prompt.home ?? ""}, in ${langName(q.prompt.lang ?? "")}.` }];
}

export function answerWord(q: Pick<Question, "kind" | "prompt" | "options" | "answer">): Line | null {
  if (q.answer == null) return null;
  const option = q.options[q.answer];
  if (!option) return null;
  if (q.kind === "which_language") return { text: q.prompt.word ?? "", lang: option, word: true };
  if (q.kind === "translate") return { text: option, lang: q.prompt.to, word: true };
  return { text: option, lang: q.prompt.lang, word: true };
}

export function revealLines(q: Pick<Question, "kind" | "prompt" | "options" | "answer" | "counts" | "idx">, players: number): Line[] {
  const lines: Line[] = [];
  const word = answerWord(q);
  if (q.kind === "which_language" && q.answer != null) lines.push({ text: `It's ${langName(q.options[q.answer] ?? "")}.` });
  if (word) lines.push(word);
  const counts = q.counts ?? [];
  const answered = counts.reduce((a, b) => a + b, 0);
  const right = q.answer == null ? 0 : counts[q.answer] ?? 0;
  if (answered > 0 && players > 1) {
    const rate = right / Math.max(players, answered);
    lines.push({ text: pick(rate >= 1 ? ALL_RIGHT : right === 0 ? NONE_RIGHT : rate >= 0.6 ? MOST_RIGHT : FEW_RIGHT, q.idx) });
  }
  return lines;
}

export function boardLines(prev: Standing[] | null, next: Standing[], seed: number, teams?: Snapshot["team_standings"]): Line[] {
  if (teams?.length) {
    const t = team(teams[0].team);
    return t ? [{ text: `Team ${t.name} leads with ${teams[0].points} points.` }] : [];
  }
  const top = next[0];
  if (!top) return [];
  const name = displayNickname(top.nickname);
  const changed = prev?.[0] && prev[0].player_id !== top.player_id;
  return [{ text: pick(changed || !prev?.length ? NEW_LEADER : SAME_LEADER, seed).replace("{name}", name) }];
}

export function finaleLines(standings: Standing[], teams?: Snapshot["team_standings"]): Line[] {
  if (teams?.length) {
    const t = team(teams[0].team);
    return t ? [{ text: `And the winner is... Team ${t.name}!` }, { text: "What a game. Thanks for playing." }] : [];
  }
  const [a, b, c] = standings;
  if (!a) return [{ text: "That's the game!" }];
  const lines: Line[] = [];
  if (c) lines.push({ text: `In third place, ${displayNickname(c.nickname)}.` });
  if (b) lines.push({ text: `Second place, ${displayNickname(b.nickname)}.` });
  lines.push({ text: `And the champion is... ${displayNickname(a.nickname)}!` });
  return lines;
}

export function hostCue(prev: Snapshot | null, next: Snapshot): Cue {
  const phase = next.room.phase;
  const was = prev?.room.phase;
  const cue: Cue = { track: trackFor(phase), sfx: [], say: [] };
  if (phase === "lobby" && prev && was === "lobby" && next.room.players > prev.room.players) cue.sfx!.push("join");
  if (phase === "lobby" && was !== "lobby") cue.say!.push({ text: "Welcome to Polingual Live! Grab your phone and join with the code on screen." });
  const q = next.question;
  const newQuestion = phase === "question" && q && (was !== "question" || prev?.question?.idx !== q.idx);
  if (newQuestion && q) {
    cue.sfx!.push("open");
    const roundStart = !prev?.question || prev.question.round !== q.round;
    if (roundStart) cue.say!.push({ text: pick(ROUND_OPEN[Math.min(q.round, 3) - 1] ?? ROUND_OPEN[0], q.idx) });
    cue.say!.push(...questionLine(q));
  } else if (phase === "question" && prev && (next.answered ?? 0) > (prev.answered ?? 0)) cue.sfx!.push("lock");
  if (phase === "reveal" && was !== "reveal" && q) {
    cue.sfx!.push("reveal");
    cue.say!.push(...revealLines(q, next.room.players));
  }
  if (phase === "board" && was !== "board") {
    cue.sfx!.push("whoosh");
    cue.say!.push(...boardLines(prev?.standings ?? null, next.standings, next.room.idx, next.team_standings));
  }
  if (phase === "finale" && was !== "finale") {
    cue.sfx!.push("fanfare");
    cue.say!.push(...finaleLines(next.standings, next.team_standings));
  }
  return cue;
}

export function phoneCue(prev: Snapshot | null, next: Snapshot): Cue {
  const phase = next.room.phase;
  const was = prev?.room.phase;
  const cue: Cue = { sfx: [] };
  const q = next.question;
  if (phase === "question" && q && (was !== "question" || prev?.question?.idx !== q.idx)) cue.sfx!.push("open");
  if (phase === "reveal" && was !== "reveal" && q && q.answer != null) {
    const mine = next.player?.choice;
    if (mine == null) cue.sfx!.push("reveal");
    else if (mine === q.answer) cue.sfx!.push((next.player?.streak ?? 0) >= 3 ? "streak" : "right");
    else cue.sfx!.push("wrong");
  }
  if (phase === "board" && was !== "board") cue.sfx!.push("whoosh");
  if (phase === "finale" && was !== "finale") cue.sfx!.push("fanfare");
  return cue;
}

export function countdownSfx(left: number | null, lastLeft: number | null): Sfx | null {
  if (left == null || left === lastLeft || left <= 0 || left > 5) return null;
  return left <= 3 ? "tock" : "tick";
}

export function rankMoves(prev: Standing[] | null, next: Standing[]): Record<string, number> {
  const moves: Record<string, number> = {};
  if (!prev) return moves;
  const before = new Map(prev.map((s, i) => [s.player_id, i]));
  next.forEach((s, i) => {
    const b = before.get(s.player_id);
    moves[s.player_id] = b == null ? 0 : b - i;
  });
  return moves;
}

export function intensity(players: number): number {
  if (players >= 12) return 3;
  if (players >= 5) return 2;
  if (players >= 1) return 1;
  return 0;
}
