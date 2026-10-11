#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { corpus, firstDate, write } from "./corpus.mjs";

const DIR = path.join(corpus(), "progressions/history-occupations");
const SOURCE = path.join(DIR, "history.sqlite");

function query(sql) {
  const res = spawnSync("sqlite3", ["-readonly", "-json", SOURCE, sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (res.status !== 0) throw new Error(`sqlite3 failed: ${res.stderr}`);
  return res.stdout.trim() ? JSON.parse(res.stdout) : [];
}

const CENSUS_MEASURE = {
  1950: "column 1950 (1950 class.)",
  1960: "column 1960 (1960 class.)",
  1970: "column 1970 (14+)",
};
const CENSUS_FAMILY = { D184: "white", D185: "white", D186: "white", D187: "white", D190: "manual", D191: "manual", D192: "manual", D194: "service", D195: "service", D197: "farm", D198: "farm" };
const socFamily = (code) => {
  const major = Number(code.slice(0, 2));
  if (major === 45) return "farm";
  if (major >= 47) return "manual";
  if (major >= 31 && major <= 39) return "service";
  return "white";
};

function censusPanel() {
  const rows = query("select code, title, year, employment, measure from series where scheme = 'histstat-major-group'").filter((r) => {
    const wanted = CENSUS_MEASURE[r.year];
    return wanted ? r.measure.endsWith(wanted) : true;
  });
  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
  const groups = Object.keys(CENSUS_FAMILY).map((code) => {
    const mine = rows.filter((r) => r.code === code);
    return { code, title: mine[0].title, family: CENSUS_FAMILY[code], employment: years.map((y) => mine.find((r) => r.year === y).employment) };
  });
  return { years, groups, rows: groups.length * years.length, measure: "experienced civilian labor force" };
}

function oewsPanel() {
  const rows = query("select scheme, code, title, year, employment from series where measure like '%level=major' and scheme in ('soc-2000', 'soc-2010', 'soc-2018')");
  const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
  const latest = years[years.length - 1];
  const codes = Array.from(new Set(rows.map((r) => r.code))).sort();
  const groups = codes.map((code) => {
    const mine = rows.filter((r) => r.code === code);
    return {
      code: code.slice(0, 2),
      title: mine.find((r) => r.year === latest).title.replace(/ Occupations$/, ""),
      family: socFamily(code),
      employment: years.map((y) => mine.find((r) => r.year === y).employment),
    };
  });
  return { years, groups, rows: rows.length, measure: "wage and salary employment" };
}

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function tally(rows, field) {
  const counts = new Map();
  for (const r of rows) {
    if (r[field] == null) continue;
    const key = `${r[field]}|${r.kind}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts)
    .map(([key, count]) => ({ year: Number(key.split("|")[0]), kind: key.split("|")[1], count }))
    .sort((a, b) => a.year - b.year || a.kind.localeCompare(b.kind));
}

function lifecycle() {
  const rows = query(
    "select kind, title, code, first_attested_year, peak_year, peak_employment, last_attested_year, last_employment, last_to_peak_share_ratio, near_extinct, residual_category, status, counts, evidence, projected_pct_change_2024_34 from lifecycles",
  );
  const statuses = {};
  for (const r of rows) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
  const kinds = {};
  for (const r of rows) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;

  const pool = rows
    .filter((r) => r.kind !== "onet_soc" && (r.status === "extinct" || r.near_extinct) && r.peak_employment && !r.residual_category && !/all other|, other|n\.e\.c|miscellaneous/i.test(r.title))
    .sort((a, b) => b.peak_employment - a.peak_employment);
  const seen = new Set();
  const extinct = [];
  for (const r of pool) {
    const key = norm(r.title.toLowerCase().replace(/s\b/g, ""));
    if (seen.has(key)) continue;
    seen.add(key);
    const counts = r.counts ? Object.keys(JSON.parse(r.counts)).map(Number) : [];
    extinct.push({
      title: r.title,
      basis: r.kind === "census_lineage" ? "census" : "oews",
      first: r.first_attested_year,
      peak: r.peak_year,
      peakEmployment: Math.round(r.peak_employment),
      last: counts.length ? Math.max(...counts) : r.last_attested_year,
      lastEmployment: Math.round(r.last_employment),
      ratio: r.last_to_peak_share_ratio,
      gone: r.status === "extinct",
    });
    if (extinct.length === 50) break;
  }

  const emerging = rows.filter((r) => r.status === "emerging" && (r.kind === "soc_oews" || r.kind === "onet_soc"));
  const newSoc = new Set(emerging.filter((r) => r.kind === "soc_oews").map((r) => r.code));
  const listed = (r) => (r.evidence.includes("new and emerging list") ? 0 : 1);
  const candidates = emerging
    .filter((r) => !(r.kind === "onet_soc" && r.code.endsWith(".00") && newSoc.has(r.code.slice(0, 7))))
    .sort((a, b) => listed(a) - listed(b) || (a.kind === "soc_oews" ? 0 : 1) - (b.kind === "soc_oews" ? 0 : 1) || b.first_attested_year - a.first_attested_year || (b.last_employment ?? 0) - (a.last_employment ?? 0));
  const newest = candidates.slice(0, 50).map((r) => ({
    title: r.title,
    scheme: r.kind === "soc_oews" ? "SOC 2018" : "O*NET-SOC 2019",
    first: r.first_attested_year,
    employment: r.last_employment == null ? null : Math.round(r.last_employment),
    change: r.projected_pct_change_2024_34,
  }));

  return {
    lineages: rows.length,
    kinds,
    statuses,
    born: tally(rows, "first_attested_year"),
    peaked: tally(rows.filter((r) => r.peak_year != null), "peak_year"),
    ended: tally(rows.filter((r) => r.status === "extinct"), "last_attested_year"),
    extinctPool: pool.length,
    extinct,
    emergingPool: candidates.length,
    newest,
  };
}

const [{ titles }] = query("select count(*) as titles from titles");
const [{ series }] = query("select count(*) as series from series");

const value = {
  date: firstDate(fs.readFileSync(path.join(DIR, "SUMMARY.md"), "utf8")),
  source: "history-occupations/history.sqlite",
  counts: { titles, series },
  census: censusPanel(),
  oews: oewsPanel(),
  lifecycle: lifecycle(),
};

write("occupations-history.json", value);
