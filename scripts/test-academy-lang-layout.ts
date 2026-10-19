import fs from "node:fs";
import path from "node:path";
import { isRootToTarget, linkForms, LINKS_CAP, targetFirst } from "../src/lib/academy/lang-layout";
import { buildLangCorpus, createSystem, exerciseFor, seededRng, type LangCard } from "../src/lib/academy/lang-systems";

let failures = 0;
function ok(c: boolean, m: string) {
  if (c) console.log("  ok  " + m);
  else {
    console.error("  FAIL " + m);
    failures++;
  }
}

const CORPUS = path.join(__dirname, "..", "learning", "app", "corpus");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(CORPUS, f), "utf8"));
const corpus = buildLangCorpus(read("lang-core.json"), read("lang-cognates.json"), read("lang-phrases.json"), read("lang-layers.json"));

const romance = createSystem("en", ["fr", "es", "it"], [], 0);
const hundred = corpus.byId.get("hundred")!;
const links = linkForms(hundred, romance, "fr");
ok(links.map((l) => `${l.lang} ${l.word}`).join(", ") === `es ${hundred.forms.es}, it ${hundred.forms.it}, en ${hundred.forms.en}`, `French cent links Spanish, Italian, then the English root: ${links.map((l) => l.word).join(" / ")}`);
ok(links.length <= LINKS_CAP && !links.some((l) => l.lang === "fr"), "the panel holds at most three forms and never the target itself");

const big = createSystem("en", ["pt", "it", "es", "fr", "de"], [], 0);
const many = linkForms(hundred, big, "fr");
ok(many.length === 3 && many.map((l) => l.lang).join(",") === "de,es,it", "known languages come first, ordered by language code");
ok(JSON.stringify(linkForms(hundred, big, "fr")) === JSON.stringify(many), "the panel is deterministic");

const solo = createSystem("en", ["fr"], [], 0);
const cog = corpus.items.find((i) => i.kind === "word" && i.forms.fr && i.cognateLangs.filter((l) => l !== "en" && l !== "fr").length >= 3)!;
const soloLinks = linkForms(cog, solo, "fr");
const expected = cog.cognateLangs.filter((l) => l !== "en" && l !== "fr" && cog.forms[l]).sort().slice(0, 3);
ok(soloLinks.every((l) => l.why === "cognate") && soloLinks.map((l) => l.lang).join(",") === expected.join(","), "with no other known language the panel fills from cognates by code");

let rootToTarget = 0;
let total = 0;
const card = { reps: 4, lapses: 0, state: "review", due: 0, stability: 10, difficulty: 5 } as unknown as LangCard;
const words = corpus.items.filter((i) => i.kind === "word" && i.forms.fr && i.forms.en).slice(0, 60);
for (let seed = 1; seed <= 40; seed++) {
  for (const item of words) {
    const rng = seededRng(seed * 1000 + words.indexOf(item));
    const ex = targetFirst(corpus, item, exerciseFor(corpus, solo, item, "fr", card, rng), rng);
    total++;
    if (isRootToTarget(ex)) rootToTarget++;
    if (ex.kind === "reverse" && !ex.options?.includes(ex.answer)) ok(false, `reverse options hold the answer for ${item.id}`);
  }
}
const share = rootToTarget / total;
ok(share <= 0.36, `root-to-target prompts are about one in three or fewer (${(share * 100).toFixed(1)}% of ${total})`);

const intro = exerciseFor(corpus, solo, hundred, "fr", undefined, seededRng(1));
ok(targetFirst(corpus, hundred, intro, () => 0.99) === intro, "an intro card is left as it is");

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nlang layout: all passed");
