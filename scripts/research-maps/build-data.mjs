#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const OUT = path.join(ROOT, "src/data/research-maps");

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

const PROGRESSIONS = flag("progressions", path.join(ROOT, "learning/corpus/progressions"));
const BACKBONE_EDGES = flag("backbone-edges", path.join(os.homedir(), "agfarms/.learning-corpus/progressions/backbone/edges.jsonl"));

const jsonl = (text) => text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
const readJsonl = (file) => jsonl(fs.readFileSync(file, "utf8"));

function readZst(file) {
  const res = spawnSync("zstd", ["-dc", file], { encoding: "utf8", maxBuffer: 1 << 30 });
  if (res.status !== 0) throw new Error(`zstd failed on ${file}: ${res.stderr}`);
  return jsonl(res.stdout);
}

function write(name, value) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value) + "\n");
  console.log(name, fs.statSync(path.join(OUT, name)).size, "bytes");
}

const isoDate = (file) => fs.statSync(file).mtime.toISOString().slice(0, 10);
const corpusDate = () => fs.readFileSync(path.join(PROGRESSIONS, "README.md"), "utf8").match(/Built on (\d{4}-\d{2}-\d{2})/)?.[1] ?? isoDate(path.join(PROGRESSIONS, "README.md"));
const num = (cell) => (cell ? Number(cell.replace(/,/g, "")) : 0);

function markdownTable(markdown, heading) {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  if (start < 0) throw new Error(`no section ${heading}`);
  const next = markdown.indexOf("\n## ", start + 4);
  const rows = markdown
    .slice(start, next < 0 ? undefined : next)
    .split("\n")
    .filter((l) => l.startsWith("|"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  return rows.slice(2);
}

function buildEdtech() {
  const updated = flag("players", path.join(os.homedir(), "agfarms/.learning-corpus/market/edtech-players.jsonl"));
  const file = fs.existsSync(updated) ? updated : path.join(ROOT, "research-landscape/market/edtech-players.jsonl");
  const rows = readJsonl(file);
  const evidence = (e) => (e.level === "independent" ? e.evidence_kind ?? "independent" : e.level);
  const players = rows.map((r) => ({
    id: r.id,
    name: r.name,
    segment: r.segment,
    what: r.what,
    learner: r.learner,
    mechanism: r.mechanism,
    price: r.price?.text ?? "",
    efficacy: { level: evidence(r.efficacy), finding: r.efficacy.finding ?? "", design: r.efficacy.design ?? "" },
  }));
  const date = rows.map((r) => r.retrieved).sort().at(-1);
  write("edtech.json", { date, source: "market/edtech-players.jsonl", players });
}

function buildCoverage() {
  const file = path.join(PROGRESSIONS, "COVERAGE.md");
  const markdown = fs.readFileSync(file, "utf8");
  const codes = readJsonl(path.join(PROGRESSIONS, "tables/backbone_codes.jsonl"));
  const socMajor = new Map(codes.filter((c) => c.scheme === "soc2018" && c.grain === "major").map((c) => [c.code.slice(0, 2), c.title]));
  const series = markdownTable(markdown, "CIP Series").map(([code, title]) => ({ code, title }));
  const families = markdownTable(markdown, "CIP Four-Digit Families").map(([code, title, size, rows, verified, edges, programs, books, resources]) => ({
    code,
    title,
    size: num(size),
    rows: num(rows),
    verified: num(verified),
    edges: num(edges),
    programs: num(programs),
    books: num(books),
    resources: num(resources),
  }));
  const minors = markdownTable(markdown, "SOC Minor Groups").map(([code, title, occupations, rows, verified, edges, programs, books, resources]) => ({
    code,
    title,
    size: num(occupations.split("/")[0].trim()),
    rows: num(rows),
    verified: num(verified),
    edges: num(edges),
    programs: num(programs),
    books: num(books),
    resources: num(resources),
  }));
  const majors = [...new Set(minors.map((m) => m.code.slice(0, 2)))].map((code) => ({ code, title: socMajor.get(code) ?? code }));
  write("coverage.json", {
    date: corpusDate(),
    source: "learning/corpus/progressions/COVERAGE.md",
    cip: { series, families },
    soc: { majors, minors },
  });
}

function panel(id, title, note, rows, edges, describe) {
  const ids = new Set(rows.map((r) => r.id));
  const seen = new Set();
  const kept = [];
  for (const e of edges) {
    const key = `${e.src}>${e.dst}`;
    if (!ids.has(e.src) || !ids.has(e.dst) || e.src === e.dst || seen.has(key)) continue;
    seen.add(key);
    kept.push({ src: e.src, dst: e.dst, stated: e.stated === true });
  }
  return { id, title, note, nodes: rows.map((r) => ({ id: r.id, ...describe(r) })), edges: kept };
}

const GRADES = ["k", "1", "2", "3", "4", "5", "6", "7", "8", "hs"];
const GRADE_LABEL = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "High school"];

function buildProgressions() {
  const rows = readZst(path.join(PROGRESSIONS, "tables/progression.jsonl.zst"));
  const edges = readZst(path.join(PROGRESSIONS, "tables/edges.jsonl.zst")).filter((e) => e.type === "prerequisite");
  const schoolMath = rows.filter((r) => r.slice === "school" && r.field === "mathematics");
  const domains = schoolMath.filter((r) => r.framework_id === "school-fw-ccss-math" && (r.notes ?? "").startsWith("Domain node"));
  const ap = schoolMath.filter((r) => ["school-fw-ap-precalculus", "school-fw-ap-calculus-ab", "school-fw-ap-calculus-bc"].includes(r.framework_id));
  const mit = rows.filter((r) => r.slice === "university-stem" && r.id.startsWith("university-stem-mit-18"));
  const interview = rows.filter((r) => r.slice === "interview" && r.field === "computer science");
  const patterns = interview.filter((r) => r.framework_id === "interview-neetcode-roadmap" || r.subfield === "interview patterns");
  const usaco = interview.filter((r) => r.framework_id === "interview-usaco-guide");

  const mathematics = {
    id: "mathematics",
    title: "Mathematics",
    summary: "Kindergarten counting to the graduate core.",
    panels: [
      panel(
        "school",
        "School",
        "Common Core domains by grade. Edges are the Coherence Map arrows between standards, rolled up to domains.",
        domains,
        edges,
        (r) => {
          const grade = GRADES.indexOf(r.id.replace("school-ccss-math-", "").split("-")[0]);
          const label = grade === 9 ? r.topic.replace(/^High School /, "") : r.subfield;
          return { label, band: grade, group: GRADE_LABEL[grade] };
        },
      ),
      panel(
        "advanced-placement",
        "Advanced Placement",
        "College Board unit order for AP Precalculus and AP Calculus.",
        ap,
        edges,
        (r) => ({ label: r.topic.replace(/^AP /, "").replace(/ Unit (\d+):/, " $1:"), band: null, group: r.subfield }),
      ),
      panel(
        "university",
        "University",
        "MIT Course 18 subjects with the prerequisites the subject listing prints.",
        mit,
        edges,
        (r) => ({ label: r.topic.replace(/^MIT /, ""), band: null, group: r.level }),
      ),
    ],
  };

  const algorithms = {
    id: "algorithms",
    title: "Data Structures and Algorithms",
    summary: "The interview slice.",
    panels: [
      panel(
        "patterns",
        "Interview patterns",
        "The NeetCode roadmap and the pattern rows under it.",
        patterns,
        edges,
        (r) => ({ label: r.topic, band: null, group: r.framework_id === "interview-neetcode-roadmap" ? "roadmap" : "pattern" }),
      ),
      panel(
        "usaco",
        "USACO Guide",
        "Competitive programming modules with the prerequisites each module page lists.",
        usaco,
        edges,
        (r) => ({ label: r.topic, band: null, group: r.subfield.replace(/^competitive programming: /, "") }),
      ),
    ],
  };

  write("progressions.json", {
    date: corpusDate(),
    source: "learning/corpus/progressions/tables",
    graphs: [mathematics, algorithms],
  });
}

function buildFlow() {
  const codes = readJsonl(path.join(PROGRESSIONS, "tables/backbone_codes.jsonl"));
  const title = (scheme, grain) => new Map(codes.filter((c) => c.scheme === scheme && c.grain === grain).map((c) => [c.code.slice(0, 2), c.title]));
  const cipTitle = title("cip2020", 2);
  const socTitle = title("soc2018", "major");
  const pairs = new Map();
  let total = 0;
  for (const line of fs.readFileSync(BACKBONE_EDGES, "utf8").split("\n")) {
    if (!line.includes('"major_to_occupation"')) continue;
    const e = JSON.parse(line);
    if (e.type !== "major_to_occupation") continue;
    const key = `${e.src.replace("cip2020:", "").slice(0, 2)}|${e.dst.replace("soc2018:", "").slice(0, 2)}`;
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
    total += 1;
  }
  const links = [...pairs].map(([key, count]) => ({ cip: key.split("|")[0], soc: key.split("|")[1], links: count })).sort((a, b) => a.cip.localeCompare(b.cip) || a.soc.localeCompare(b.soc));
  const tally = (field) => {
    const m = new Map();
    for (const l of links) m.set(l[field], (m.get(l[field]) ?? 0) + l.links);
    return m;
  };
  const sentence = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  write("flow.json", {
    date: isoDate(BACKBONE_EDGES),
    source: "NCES and BLS CIP 2020 to SOC 2018 crosswalk",
    total,
    cip: [...tally("cip")].map(([code, count]) => ({ code, title: sentence(cipTitle.get(code) ?? code), links: count })),
    soc: [...tally("soc")].map(([code, count]) => ({ code, title: socTitle.get(code) ?? code, links: count })),
    links,
  });
}

buildEdtech();
buildCoverage();
buildProgressions();
buildFlow();
