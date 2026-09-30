import {
  defaultExplorerState,
  parseExplorerParams,
  writeExplorerParams,
  type ExplorerState,
} from "../src/lib/canon-explorer/url";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!cond) failed++;
}

const bounds = {
  minYear: -40000,
  maxYear: 2025,
  defaultYear: 2020,
  branches: ["01-mathematics", "02-physics", "08-deep-history"],
};

const full: ExplorerState = {
  marker: "euclid-elements",
  view: "circle",
  sort: "year",
  y: -300,
  q: "prime numbers",
  branch: "02-physics",
};
const written = writeExplorerParams(new URLSearchParams(), full, bounds);
const back = parseExplorerParams(written.toString(), bounds);
check("round-trip full state", JSON.stringify(back) === JSON.stringify(full), written.toString());

const def = defaultExplorerState(bounds);
check("defaults write an empty query", writeExplorerParams(new URLSearchParams(), def, bounds).toString() === "");
check("empty query parses to defaults", JSON.stringify(parseExplorerParams("", bounds)) === JSON.stringify(def));

const legacy = parseExplorerParams("?marker=lascaux", bounds);
check("legacy ?marker= link keeps working", legacy.marker === "lascaux" && legacy.view === "globe" && legacy.y === 2020);

const bad = parseExplorerParams("?view=helix&sort=vibes&y=abc&branch=nope&marker=%20", bounds);
check("unknown view falls back to globe", bad.view === "globe");
check("unknown sort falls back to rank", bad.sort === "rank");
check("non-numeric y falls back to default", bad.y === 2020);
check("unknown branch falls back to null", bad.branch === null);
check("blank marker falls back to null", bad.marker === null);

check("y clamps high", parseExplorerParams("?y=99999", bounds).y === 2025);
check("y clamps low", parseExplorerParams("?y=-99999999", bounds).y === -40000);
check("y rejects floats", parseExplorerParams("?y=12.5", bounds).y === 2020);
check("bare branch slug resolves", parseExplorerParams("?branch=physics", bounds).branch === "02-physics");
check("q is trimmed", parseExplorerParams("?q=%20%20atoms%20", bounds).q === "atoms");

const kept = writeExplorerParams(new URLSearchParams("utm_source=x&view=circle"), def, bounds);
check("unrelated params survive, stale keys drop", kept.toString() === "utm_source=x");
check("y is written as an integer", writeExplorerParams(new URLSearchParams(), { ...def, y: 1500.4 }, bounds).get("y") === "1500");

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
