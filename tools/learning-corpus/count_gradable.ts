import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gradeAnswer } from "../../src/lib/academy/assess";

const DECKS = ["00-learning-to-learn", "01-mathematics", "02-physics", "03-chemistry", "04-information", "06-cosmology", "07-mind", "biophysics"];
const root = join(import.meta.dir, "..", "..", "learning", "app", "corpus");

const SHORT = 60;
const total = { atoms: 0, items: 0, numeric: 0, symbolic: 0, open: 0, atomsWithRule: 0, shortRule: 0, atomsWithShortRule: 0 };
for (const deck of DECKS) {
  const { atoms } = JSON.parse(readFileSync(join(root, `${deck}.json`), "utf8")) as { atoms: { quiz?: { answer: string }[] }[] };
  for (const atom of atoms) {
    total.atoms += 1;
    let any = false;
    let anyShort = false;
    for (const item of atom.quiz ?? []) {
      total.items += 1;
      const verdict = gradeAnswer("", item.answer);
      total[verdict.kind] += 1;
      any = any || verdict.gradable;
      const short = verdict.gradable && item.answer.trim().length <= SHORT;
      if (short) total.shortRule += 1;
      anyShort = anyShort || short;
    }
    if (any) total.atomsWithRule += 1;
    if (anyShort) total.atomsWithShortRule += 1;
  }
}
console.log(JSON.stringify({ ...total, ruleGradable: total.numeric + total.symbolic }));
