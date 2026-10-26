import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gradeQuestion, present, type Question, type QuestionDeck, type Response } from "../../../src/lib/academy/question-types";

const dir = process.argv[2];
const decks = ["00-learning-to-learn", "02-physics", "06-cosmology"].map((n) => JSON.parse(readFileSync(join(dir, `${n}.json`), "utf8")) as QuestionDeck);

function responses(q: Question): Response[] {
  switch (q.kind) {
    case "pick":
      return q.options.map((_, i) => ({ kind: "pick", choice: i }));
    case "spot-error":
      return q.steps.map((_, i) => ({ kind: "spot-error", step: i }));
    case "calculate": {
      const a = q.answer;
      return [String(a), String(a * 1.01), String(a * 1.03), String(a * 2), String(-a), "1,000", "6.0×10^3", "12%", "", "abc"].map((value) => ({ kind: "calculate", value }));
    }
    case "order": {
      const n = q.steps.length;
      const id = Array.from({ length: n }, (_, i) => i);
      const swap = [...id];
      [swap[0], swap[1]] = [swap[1], swap[0]];
      const tail = [...id];
      [tail[n - 2], tail[n - 1]] = [tail[n - 1], tail[n - 2]];
      return [id, [...id].reverse(), swap, tail, id.slice(1), [0, 0, ...id.slice(2)]].map((order) => ({ kind: "order", order }));
    }
    case "match": {
      const right = Object.fromEntries(q.pairs.map((p) => [p.term, p.meaning]));
      const shifted = Object.fromEntries(q.pairs.map((p, i) => [p.term, q.pairs[(i + 1) % q.pairs.length].meaning]));
      const one = { ...right, [q.pairs[0].term]: q.pairs[1].meaning, [q.pairs[1].term]: q.pairs[0].meaning };
      const partial = Object.fromEntries(q.pairs.slice(0, -1).map((p) => [p.term, p.meaning]));
      return [right, shifted, one, partial, {}].map((pairs) => ({ kind: "match", pairs }));
    }
  }
}

const out = decks.flatMap((d) =>
  d.questions.map((q) => {
    const p = present(q, `parity:${d.branch}`);
    return {
      branch: d.branch,
      id: q.id,
      order: p.order,
      meanings: p.meanings ?? null,
      cases: responses(q).map((r) => ({ r, g: gradeQuestion(q, r) })),
    };
  })
);
writeFileSync(process.argv[3], JSON.stringify(out));
