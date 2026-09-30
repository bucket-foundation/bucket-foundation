import fs from "fs";
import os from "os";
import path from "path";
import { unify, HIT_TYPES } from "../src/lib/explore/search";
import { loadSourceIndex, prepare, resetSourceIndex, searchSources, sourceToHit, SOURCE_TYPE, type SourceIndex } from "../src/lib/explore/sources";
import { hitColor } from "../src/lib/explore/modes/globe";
import { hasEmail } from "../src/lib/research-os/advisor-review";
import { pathToFileURL } from "url";

const importEsm = new Function("href", "return import(href)") as (href: string) => Promise<{ buildIndex: () => { items: unknown[][] }; LICENSE: Record<string, string>; scrub: (s: string) => string }>;

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const index: SourceIndex = {
  v: 1,
  items: [
    ["o", "W1", "Prospect theory and risk", 1979, "decision under risk", "Kahneman"],
    ["p", "100", "Photon quantum fluctuations", 1992, "Physical review", "Sachdev"],
    ["a", "0704.0646", "The Mathematical Universe", 2007, "physics implications of reality", "Tegmark"],
    ["g", "105", "Persuasion", null, "a novel of second chances", "Austen, Jane"],
    ["w", "9", "Anselm", null, "archbishop of Canterbury", ""],
    ["y", "abc", "Water and light lecture", 2023, "photon light water", "Channel"],
  ],
};
const pool = prepare(index);

check("hit types include paper, text and talk", ["paper", "text", "talk"].every((t) => (HIT_TYPES as string[]).includes(t)));
check("source kinds map to three types", SOURCE_TYPE.o === "paper" && SOURCE_TYPE.p === "paper" && SOURCE_TYPE.a === "paper" && SOURCE_TYPE.g === "text" && SOURCE_TYPE.w === "text" && SOURCE_TYPE.y === "talk");

const found = searchSources("photon light", pool);
check("search finds a paper and a talk", found.some((s) => SOURCE_TYPE[s.kind] === "paper") && found.some((s) => SOURCE_TYPE[s.kind] === "talk"));
check("search returns nothing for an empty query", searchSources("", pool).length === 0);
check("search skips non-matching rows", !searchSources("photon", pool).some((s) => s.id === "105"));
check("title match outranks body match", searchSources("water", pool)[0]?.id === "abc");
check("per-type cap holds", searchSources("photon light water risk", pool, 1).length <= 3);

const hits = found.map(sourceToHit);
check("hits carry type-specific ids and urls", hits.every((h) => h.id.startsWith(`${h.type}:`) && !!h.url));
check("colors differ per source type", new Set(["paper", "text", "talk"].map((t) => hitColor({ ...hits[0], type: t as "paper" }))).size === 3);

const excerpts = [{ branch: "02-physics", concept: "quantum", slug: "a", title: "Photon quantum", text: "photon quantum light", score: 2 }];
const unified = unify({ query: "photon light", excerpts, advisors: [], sources: hits });
check("unify returns source hits", unified.some((h) => h.type === "paper") && unified.some((h) => h.type === "talk"));
check("source hit links to nearest excerpt", unified.find((h) => h.type === "paper")!.links.some((l) => l.startsWith("excerpt:")));
check("excerpt links back to the source hit", unified.find((h) => h.type === "excerpt")!.links.some((l) => l.startsWith("paper:") || l.startsWith("talk:")));
check("type filter drops source hits", unify({ query: "photon light", excerpts, advisors: [], sources: hits, types: ["excerpt"] }).every((h) => h.type === "excerpt"));
check("scores stay in [0,1]", unified.every((h) => h.score >= 0 && h.score <= 1));

check("source hits carry source and licence", hits.every((h) => !!h.source && !!h.license));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "explore-src-"));
fs.writeFileSync(path.join(tmp, "explore-sources.local.json"), JSON.stringify(index));
resetSourceIndex();
importEsm(pathToFileURL(path.join(__dirname, "build-explore-sources.mjs")).href).then(({ buildIndex, LICENSE, scrub }) => {
check("scrub removes plain and obfuscated emails", !hasEmail(scrub("write to jane.doe@example.org or bob [at] example [dot] com")));
check("licence table covers every kind", Object.keys(SOURCE_TYPE).every((k) => k in LICENSE));
return loadSourceIndex(tmp).then((p) => {
  check("loader falls back to the local index file", p.length === index.items.length);
  resetSourceIndex();
  return loadSourceIndex(path.join(tmp, "missing")).then((e) => {
    check("loader returns empty when no index exists", e.length === 0);
    const built = buildIndex();
    const kinds = new Set(built.items.map((r: unknown[]) => r[0]));
    check("built index covers all six local sources", ["o", "p", "a", "g", "w", "y"].every((k) => kinds.has(k)), Array.from(kinds).join(","));
    const size = Buffer.byteLength(JSON.stringify(built));
    check("built index stays under the 5 MB commit cap or is gitignored", size <= 5 * 1024 * 1024 || fs.readFileSync(".gitignore", "utf8").includes("explore-sources.local.json"), String(size));
    check("built index holds no email", !built.items.some((r: unknown[]) => hasEmail(`${r[2]} ${r[4]} ${r[5]}`)));
    check("built index holds no markup tags", !built.items.some((r: unknown[]) => /<\/?[a-z][^>]*>/i.test(`${r[2]} ${r[4]}`)));
    check("built rows have short snippets", built.items.every((r: unknown[]) => String(r[4]).length <= 150));
    if (failed) {
      console.error(`${failed} failed`);
      process.exit(1);
    }
    console.log("all passed");
  });
});
});
