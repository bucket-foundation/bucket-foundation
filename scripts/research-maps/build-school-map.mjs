#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { corpus, expect, firstDate, num, sourceInfo, tableAfter, write } from "./corpus.mjs";

const DIR = path.join(corpus(), "progressions/k12-full");
const DB = path.join(DIR, "k12.sqlite");

const GRADES = ["PK", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const SUBJECTS = [
  ["english language arts", "English language arts"],
  ["mathematics", "Mathematics"],
  ["science", "Science"],
  ["social studies", "Social studies"],
  ["world languages", "World languages"],
  ["arts", "Arts"],
  ["physical education", "Physical education"],
  ["health", "Health"],
  ["computer science and technology", "Computer science and technology"],
  ["career and technical education", "Career and technical education"],
  ["english language development", "English language development"],
  ["early learning", "Early learning"],
  ["social-emotional learning", "Social-emotional learning"],
  ["financial literacy", "Financial literacy"],
  ["library and information", "Library and information"],
  ["other", "Other"],
];

const NATIONAL = [
  "ccss",
  "ncas",
  "dlm-essential-elements",
  "wida",
  "ngss",
  "jumpstart",
  "ncss",
  "head-start-elof",
  "shape-america",
  "actfl",
  "cee",
  "csta",
  "nhes",
  "iste",
  "casel",
  "advance-cte",
  "cctc",
  "civics-standards",
  "geography-standards",
];

const PANELS = [
  { id: "texas", title: "Texas", region: "US state", systems: ["texas-teks"] },
  { id: "california", title: "California", region: "US state", systems: ["california"] },
  { id: "new-york", title: "New York", region: "US state", systems: ["new-york"] },
  { id: "us-national", title: "US national frameworks", region: "19 frameworks pooled", systems: NATIONAL },
  { id: "ap", title: "Advanced Placement", region: "US programme", systems: ["ap"] },
  { id: "australia", title: "Australia", region: "National curriculum, version 9", systems: ["australia-v9"] },
  { id: "ontario", title: "Ontario", region: "Canadian province", systems: ["ontario"] },
  { id: "england", title: "England", region: "National curriculum", systems: ["england-nc"] },
  { id: "finland", title: "Finland", region: "Basic education", systems: ["finland"] },
  { id: "india", title: "India", region: "NCERT subjects by class", systems: ["india-ncert"] },
  { id: "japan", title: "Japan", region: "Courses of Study", systems: ["japan"] },
  { id: "kenya", title: "Kenya", region: "Competency-based curriculum", systems: ["kenya-cbc"] },
  { id: "singapore", title: "Singapore", region: "Primary and secondary subjects", systems: ["singapore"] },
  { id: "cambridge", title: "Cambridge International", region: "IGCSE, AS and A Level", systems: ["cambridge-igcse", "cambridge-as-a-level"] },
  { id: "ib", title: "IB Diploma Programme", region: "International programme", systems: ["ib-dp"] },
];

function query(sql) {
  const res = spawnSync("sqlite3", ["-readonly", "-json", DB, sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (res.status !== 0) throw new Error(`sqlite3 failed: ${res.stderr}`);
  return res.stdout.trim() ? JSON.parse(res.stdout) : [];
}

function main() {
  const summary = fs.readFileSync(path.join(DIR, "SUMMARY.md"), "utf8");
  const stated = new Map(tableAfter(summary, "\n## Counts\n").map((r) => [r[0], r]));
  const bySystem = new Map(query("select system, count(*) as n, sum(verified) as verified from standards group by system").map((r) => [r.system, r]));
  const grid = query("select system, subject, grade, count(*) as n from standard_grades group by system, subject, grade");
  const placed = new Set(PANELS.flatMap((p) => p.systems));
  for (const system of bySystem.keys()) if (!placed.has(system)) throw new Error(`system ${system} is in no panel`);

  let outsideGrades = 0;
  const panels = PANELS.map((p) => {
    const cells = new Map();
    for (const row of grid) {
      if (!p.systems.includes(row.system)) continue;
      const s = SUBJECTS.findIndex(([id]) => id === row.subject);
      const g = GRADES.indexOf(row.grade);
      if (s < 0) throw new Error(`unknown subject ${row.subject}`);
      if (g < 0) {
        outsideGrades += row.n;
        continue;
      }
      const key = s * 100 + g;
      cells.set(key, (cells.get(key) ?? 0) + row.n);
    }
    const rows = p.systems.reduce((a, s) => a + bySystem.get(s).n, 0);
    const verified = p.systems.reduce((a, s) => a + bySystem.get(s).verified, 0);
    return {
      id: p.id,
      title: p.title,
      region: p.region,
      rows,
      verified,
      cells: Array.from(cells.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([key, n]) => [Math.floor(key / 100), key % 100, n]),
    };
  });

  const standards = panels.reduce((a, p) => a + p.rows, 0);
  const verified = panels.reduce((a, p) => a + p.verified, 0);
  expect("standards rows", standards, num(stated.get("standards.jsonl")[1]));
  expect("standards verified", verified, num(stated.get("standards.jsonl")[2]));

  const courses = query(
    "select a.course as name, a.subject as subject, a.n_units as units, (select count(*) from ap_units u where u.course_id = a.id and u.weight is not null and u.weight != '') as weighted from ap a order by a.n_units desc, a.course",
  ).map((c) => ({ name: c.name.replace(/^AP /, ""), subject: SUBJECTS.find(([id]) => id === c.subject)[1], units: c.units, weighted: c.weighted > 0 }));
  expect("AP courses", courses.length, num(stated.get("ap.jsonl")[1]));

  write("school-map.json", {
    date: firstDate(summary),
    source: "progressions/k12-full/k12.sqlite",
    sources: [sourceInfo(DB, "progressions/k12-full/k12.sqlite")],
    grades: GRADES,
    subjects: SUBJECTS.map(([, label]) => label),
    standards,
    verified,
    systems: bySystem.size,
    gradeRows: panels.reduce((a, p) => a + p.cells.reduce((b, c) => b + c[2], 0), 0),
    outsideGrades,
    panels,
    ap: { courses, units: courses.reduce((a, c) => a + c.units, 0), weighted: courses.filter((c) => c.weighted).length },
  });
}

main();
