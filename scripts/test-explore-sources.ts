import fs from "fs";
import os from "os";
import path from "path";
import { unify, HIT_TYPES } from "../src/lib/explore/search";
import { loadSourceIndex, prepare, resetSourceIndex, searchSources, sourceToHit, SOURCE_TYPE, type SourceIndex } from "../src/lib/explore/sources";
import { hitColor } from "../src/lib/explore/modes/globe";
import { hasEmail } from "../src/lib/research-os/advisor-review";
import { pathToFileURL } from "url";

const importEsm = new Function("href", "return import(href)") as (href: string) => Promise<BuildModule>;

type Row = [string, string, string, number | null, string, string];
interface PrimaryStats {
  read: number;
  added: number;
  sameDoi: number;
  sameTitleAuthor: number;
  repeated: number;
  noDoi: number;
  noAuthor: number;
}
interface BuildModule {
  buildIndex: () => { items: unknown[][]; primary: PrimaryStats };
  LICENSE: Record<string, string>;
  scrub: (s: string) => string;
  normDoi: (doi: unknown) => string;
  dedupeKey: (title: unknown, family: unknown) => string;
  mergePrimaryPapers: (existing: { row: Row; doi: string; key: string }[], records: unknown[]) => { rows: Row[]; stats: PrimaryStats };
  readPrimaryPapers: () => { doi?: string | null; title: string }[];
}

const SHANNON_DOI = "10.1002/j.1538-7305.1948.tb01338.x";

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
importEsm(pathToFileURL(path.join(__dirname, "build-explore-sources.mjs")).href).then(({ buildIndex, LICENSE, scrub, normDoi, dedupeKey, mergePrimaryPapers, readPrimaryPapers }) => {
check("scrub removes plain and obfuscated emails", !hasEmail(scrub("write to jane.doe@example.org or bob [at] example [dot] com")));
check("licence table covers every kind", Object.keys(SOURCE_TYPE).every((k) => k in LICENSE));
return loadSourceIndex(tmp).then((p) => {
  check("loader falls back to the local index file", p.length === index.items.length);
  resetSourceIndex();
  return loadSourceIndex(path.join(tmp, "missing")).then((e) => {
    check("loader returns empty when no index exists", e.length === 0);
    const built = buildIndex();
    const kinds = new Set(built.items.map((r: unknown[]) => r[0]));
    check("built index covers all six local sources and the primary papers", ["o", "p", "a", "g", "w", "y", "d"].every((k) => kinds.has(k)), Array.from(kinds).join(","));
    const committed = JSON.parse(fs.readFileSync(path.join("src", "data", "explore-sources.json"), "utf8")) as SourceIndex;
    check("the committed index is the built index", JSON.stringify(committed.items) === JSON.stringify(built.items));
    const primary = built.items.filter((r) => r[0] === "d") as Row[];
    const st = built.primary;
    check("166 primary paper records are read from 36 files", st.read === 166 && readPrimaryPapers().length === 166, JSON.stringify(st));
    check("151 primary papers are added", st.added === 151 && primary.length === 151, JSON.stringify(st));
    check("every record is added or counted as skipped", st.added + st.sameDoi + st.sameTitleAuthor + st.repeated + st.noDoi + st.noAuthor === st.read && st.sameDoi === 9 && st.repeated === 2 && st.noDoi === 2 && st.noAuthor === 2 && st.sameTitleAuthor === 0, JSON.stringify(st));
    check("primary rows keep a lowercase DOI, a year, authors and a doi.org link", primary.every((r) => r[1] === normDoi(r[1]) && /^10\.\d{4,9}\/\S+$/.test(r[1]) && typeof r[3] === "number" && r[5].length > 0 && sourceToHit({ kind: "d", id: r[1], title: r[2], year: r[3], snippet: r[4], by: r[5], score: 1 }).url === `https://doi.org/${r[1]}`));
    check("no primary DOI appears twice", new Set(primary.map((r) => r[1])).size === primary.length);
    const titleKey = (t: string) => t.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
    const openalexTitles = new Set(built.items.filter((r) => r[0] === "o").map((r) => titleKey(String(r[2]))));
    check("no primary paper repeats an existing OpenAlex row", !primary.some((r) => openalexTitles.has(titleKey(r[2]))));
    const shannon = primary.find((r) => r[1] === SHANNON_DOI);
    check("Shannon 1948 is in the index with its year and author", !!shannon && shannon[3] === 1948 && shannon[5] === "Claude E. Shannon" && shannon[2] === "A Mathematical Theory of Communication");
    const shannonHit = searchSources("mathematical theory of communication", prepare({ v: 1, items: built.items as SourceIndex["items"] })).map(sourceToHit)[0];
    check("Shannon 1948 is the first paper for its title", shannonHit?.id === `paper:d/${SHANNON_DOI}` && shannonHit.source === "Primary paper" && !!shannonHit.license);

    const existing = [
      { row: ["o", "W1", "On Computable Numbers", 1937, "", "Alan Turing"] as Row, doi: "10.1/known", key: dedupeKey("On Computable Numbers", "Turing") },
      { row: ["p", "7", "Chemiosmotic coupling.", 1966, "", "P Mitchell"] as Row, doi: "", key: dedupeKey("Chemiosmotic coupling.", "Mitchell") },
    ];
    const record = (title: string, family: string, doi: string | null) => ({ title, doi, year: 1950, venue: { name: "Journal" }, authors: [{ given: "A.", family }, { given: "B.", family: "Second" }] });
    const merged = mergePrimaryPapers(existing, [
      record("A different title", "Other", "https://doi.org/10.1/KNOWN"),
      record("Chemiosmotic Coupling", "Mitchell", "10.1/other"),
      record("Chemiosmotic coupling", "Someone", "10.1/kept"),
      record("Chemiosmotic  coupling!", "Someone", "10.1/second-doi"),
      record("Kept once", "Author", "10.1/once"),
      record("Kept once again", "Author", "10.1/ONCE"),
      record("No identifier", "Author", null),
      { ...record("Notice", "", "10.1/notice"), authors: [] },
    ]);
    check("a record without an author is skipped and counted", merged.stats.noAuthor === 1 && !merged.rows.some((r) => r[1] === "10.1/notice"));
    check("a record with an existing DOI is skipped whatever its title", merged.stats.sameDoi === 1);
    check("a record with an existing title and first author is skipped whatever its DOI", merged.stats.sameTitleAuthor === 1);
    check("the same title under another first author is kept", merged.rows.some((r) => r[1] === "10.1/kept"));
    check("a record repeated inside the yaml files is added once", merged.stats.repeated === 2 && merged.rows.filter((r) => r[1] === "10.1/once").length === 1 && !merged.rows.some((r) => r[1] === "10.1/second-doi"));
    check("a record without a DOI is skipped and counted", merged.stats.noDoi === 1 && merged.stats.added === 2 && merged.rows.length === 2);
    check("merged rows list every author", merged.rows[0][5] === "A. Someone, B. Second" && merged.rows[0][4] === "Journal" && merged.rows[0][3] === 1950);
    check("DOIs are compared without case or resolver prefix", normDoi("https://doi.org/10.1/ABC") === "10.1/abc" && normDoi(" HTTP://dx.doi.org/10.1/x ") === "10.1/x" && normDoi(null) === "");
    check("the title and author key ignores case, accents and punctuation", dedupeKey("Über  die Krümmung!", "Friedmann") === dedupeKey("uber die krummung", "FRIEDMANN") && dedupeKey("Title", "") === "" && dedupeKey("", "Author") === "");
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
