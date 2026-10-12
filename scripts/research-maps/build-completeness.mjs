#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { corpus, expect, firstDate, num, readJsonl, sourceInfo, tableAfter, write } from "./corpus.mjs";

const DIR = path.join(corpus(), "progressions");

const DIMENSIONS = [
  { id: "life-stage", row: "Life stage", title: "Life stage", test: "hold a row about the learner after reading", groups: [{ id: "life_stage", title: "Stages of life" }] },
  { id: "purpose", row: "Purpose", title: "Purpose", test: "hold a row after reading", groups: [{ id: "purpose", title: "Purposes of learning" }] },
  { id: "kind", row: "Kind of knowing", title: "Kind of knowing", test: "hold a row after reading", groups: [{ id: "kind_of_knowing", title: "Kinds of knowing" }] },
  { id: "mode", row: "Mode of transmission", title: "Mode of transmission", test: "hold a row after reading", groups: [{ id: "mode_of_transmission", title: "Ways knowledge is passed on" }] },
  { id: "era", row: "Era", title: "Era", test: "hold a row on learning of that era", groups: [{ id: "era", title: "Eras" }] },
  {
    id: "geography-language",
    row: "Geography and language",
    title: "Geography and language",
    test: "hold a row after reading",
    groups: [
      { id: "geography", title: "The 30 most populous countries" },
      { id: "language", title: "The 30 most spoken languages" },
    ],
  },
  {
    id: "domain",
    row: "Domain",
    title: "Domain",
    test: "hold five or more curated verified rows",
    groups: [
      { id: "lcc", title: "Library of Congress classes" },
      { id: "cip", title: "CIP 2020 series" },
      { id: "propaedia", title: "Propaedia divisions" },
      { id: "ocm", title: "Outline of Cultural Materials categories" },
    ],
  },
];

const LIFE_STAGE = {
  infancy: "Infancy, 0 to 3",
  "early-childhood": "Early childhood, 3 to 6",
  primary: "Primary, 6 to 11",
  secondary: "Secondary, 11 to 18",
  tertiary: "Tertiary",
  "working-adult": "Working adult",
  "mid-career-change": "Mid-career change",
  "old-age": "Retirement and old age",
};

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\b(And|Of|The|To|In|For)\b/g, (w) => w.toLowerCase());

function cellOf(row) {
  const domain = row.dimension === "domain";
  const code = domain ? row.cell.split(":")[1] : row.dimension === "geography" || row.dimension === "language" ? row.cell : "";
  const label = row.dimension === "life_stage" ? LIFE_STAGE[row.cell] : row.cell.startsWith("cip:") ? titleCase(row.label) : row.label;
  if (!label) throw new Error(`no label for ${row.cell}`);
  const withheld = row.cell.startsWith("propaedia:") || row.cell.startsWith("ocm:");
  const read = typeof row.adjudicated_learner_rows === "number" ? row.adjudicated_learner_rows : null;
  const kept = domain ? row.curated_verified >= 5 : row.has_adjudicated_row === true;
  return { code, label: withheld ? "" : label, rows: row.rows_total, verified: row.rows_verified, curated: row.curated_verified ?? 0, read, kept };
}

function main() {
  const critic = fs.readFileSync(path.join(DIR, "COMPLETENESS-CRITIC-1.md"), "utf8");
  const frame = readJsonl(path.join(DIR, "completeness-frame.jsonl"));
  const scores = new Map(tableAfter(critic, "\n## Scores\n").map((r) => [r[0], r]));
  const stated = critic.match(/Overall completeness: ([\d.]+) of 10/);
  if (!stated) throw new Error("no overall score line");
  const overall = Number(stated[1]);
  expect("overall score", num(scores.get("Overall")[4]), overall);

  const dimensions = DIMENSIONS.map((d) => {
    const groups = d.groups.map((g) => {
      const rows = d.id === "domain" ? frame.filter((r) => r.dimension === "domain" && r.cell.startsWith(`${g.id}:`)) : frame.filter((r) => r.dimension === g.id);
      return { id: g.id, title: g.title, cells: rows.map(cellOf) };
    });
    const cells = groups.flatMap((g) => g.cells);
    const row = scores.get(d.row);
    const out = {
      id: d.id,
      title: d.title,
      test: d.test,
      score: num(row[4]),
      cells: cells.length,
      anyVerified: cells.filter((c) => c.verified > 0).length,
      kept: cells.filter((c) => c.kept).length,
      groups,
    };
    expect(`${d.id} cells`, out.cells, num(row[1]));
    expect(`${d.id} any verified`, out.anyVerified, num(row[2]));
    expect(`${d.id} kept`, out.kept, num(row[3]));
    return out;
  });

  const whole = frame.find((r) => r.dimension === "kind_of_knowing" && r.cell === "declarative");
  write("completeness.json", {
    date: firstDate(critic),
    source: "progressions/COMPLETENESS-CRITIC-1.md and completeness-frame.jsonl",
    sources: [sourceInfo(path.join(DIR, "COMPLETENESS-CRITIC-1.md"), "progressions/COMPLETENESS-CRITIC-1.md"), sourceInfo(path.join(DIR, "completeness-frame.jsonl"), "progressions/completeness-frame.jsonl")],
    overall,
    corpusRows: whole.rows_total,
    corpusVerified: whole.rows_verified,
    frameCells: frame.length,
    scoredCells: dimensions.reduce((a, d) => a + d.cells, 0),
    dimensions,
  });
}

main();
