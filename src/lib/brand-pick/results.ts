import { ASPECTS, ASPECT_IDS, DIRECTIONS, DIRECTION_IDS, type AspectId, type DirectionId } from "./directions";
import type { Answer } from "./answers";
import { bradleyTerry, type Ranked } from "./rank";

export interface DirectionNote {
  aspect: AspectId;
  against: DirectionId;
  chose: boolean | null;
  note: string;
}

export interface Results {
  overall: Ranked[];
  byAspect: Record<AspectId, Ranked[]>;
  answered: Record<AspectId, number>;
  notes: Record<DirectionId, DirectionNote[]>;
}

export function buildResults(answers: Answer[]): Results {
  const byAspect = {} as Record<AspectId, Ranked[]>;
  const answered = {} as Record<AspectId, number>;
  for (const aspect of ASPECT_IDS) {
    const mine = answers.filter((x) => x.aspect === aspect);
    byAspect[aspect] = bradleyTerry(mine);
    answered[aspect] = mine.length;
  }
  const notes = Object.fromEntries(DIRECTION_IDS.map((id) => [id, [] as DirectionNote[]])) as Record<DirectionId, DirectionNote[]>;
  for (const x of answers) {
    if (!x.note) continue;
    for (const [self, other] of [[x.a, x.b], [x.b, x.a]] as const) {
      notes[self].push({ aspect: x.aspect, against: other, chose: x.choice === null ? null : x.choice === self, note: x.note });
    }
  }
  return { overall: bradleyTerry(answers), byAspect, answered, notes };
}

export function pct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function shareSummary(results: Results, date: string): string {
  const lines = [`Bucket brand pick, ${date}`, ""];
  lines.push("Overall: " + results.overall.map((r, i) => `${i + 1}. ${DIRECTIONS[r.id].name} ${pct(r.score)}`).join(", "));
  lines.push("");
  for (const aspect of ASPECT_IDS) {
    if (results.answered[aspect] === 0) continue;
    const top = results.byAspect[aspect].slice(0, 3).map((r) => DIRECTIONS[r.id].name).join(", ");
    lines.push(`${ASPECTS[aspect].label}: ${top}`);
  }
  const winner = results.overall[0];
  const why = winner ? results.notes[winner.id].filter((n) => n.chose).map((n) => n.note) : [];
  if (why.length > 0) {
    lines.push("", `Why ${DIRECTIONS[winner.id].name}:`);
    for (const n of why.slice(0, 5)) lines.push(`- ${n}`);
  }
  return lines.join("\n");
}
