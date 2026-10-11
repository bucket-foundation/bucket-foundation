#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { corpus, firstDate, num, readJsonl, tableAfter, write } from "./corpus.mjs";

const SRC = corpus();
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};
const tally = (rows, key) => {
  const m = new Map();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return m;
};

async function buildTechnologyWaves() {
  const dir = path.join(SRC, "progressions/history-technology");
  const waves = readJsonl(path.join(dir, "waves.jsonl"));
  const waveOf = new Map();
  const nameOf = new Map();
  const perWave = new Map();
  let technologies = 0;
  const lines = readline.createInterface({ input: fs.createReadStream(path.join(dir, "technologies.jsonl")) });
  for await (const line of lines) {
    if (!line) continue;
    const t = JSON.parse(line);
    technologies += 1;
    perWave.set(t.wave, (perWave.get(t.wave) ?? 0) + 1);
    if (t.source === "core") {
      waveOf.set(t.id, t.wave);
      nameOf.set(t.id, t.name);
    }
  }
  const links = readJsonl(path.join(dir, "tech_occupation.jsonl"));
  const training = readJsonl(path.join(dir, "training_response.jsonl"));
  const lags = readJsonl(path.join(dir, "lags.jsonl"));
  const work = (wave, relations) => Array.from(new Set(links.filter((l) => waveOf.get(l.technology_id) === wave && relations.includes(l.relation)).map((l) => l.occupation))).sort();
  const peak = lags.filter((l) => /^(invention|start of trade) to (peak|highest)/.test(l.measure));
  const best = new Map();
  for (const l of peak) if (!best.has(l.occupation) || l.lag_years < best.get(l.occupation).lag_years) best.set(l.occupation, l);
  const timed = training.filter((t) => t.lag_years !== null && t.lag_years !== undefined);
  write("technology-waves.json", {
    date: firstDate(fs.readFileSync(path.join(dir, "SUMMARY.md"), "utf8")),
    source: "progressions/history-technology",
    counts: { technologies, core: waveOf.size, links: links.length, linksVerified: links.filter((l) => l.verified).length, training: training.length, lags: lags.length },
    waves: waves.map((w) => ({
      id: w.id,
      name: w.name,
      from: w.era_from,
      to: w.era_to,
      technologies: perWave.get(w.id) ?? 0,
      made: work(w.id, ["created", "expanded"]),
      ended: work(w.id, ["ended", "shrank"]),
      training: training.filter((t) => t.wave === w.id).length,
      trainingLags: timed.filter((t) => t.wave === w.id).map((t) => t.lag_years).sort((a, b) => a - b),
    })),
    peakLags: Array.from(best.values()).map((l) => ({ occupation: l.occupation, technology: nameOf.get(l.technology_id) ?? "", from: l.from_year, to: l.to_year, years: l.lag_years })).sort((a, b) => a.from - b.from),
    trainingLag: { n: timed.length, median: median(timed.map((t) => t.lag_years)), min: Math.min(...timed.map((t) => t.lag_years)), max: Math.max(...timed.map((t) => t.lag_years)) },
    peakLag: { n: best.size, median: median(Array.from(best.values()).map((l) => l.lag_years)) },
  });
}

function buildForecastBacktest() {
  const dir = path.join(SRC, "progressions/forecast-backtest");
  if (!fs.existsSync(path.join(dir, "results.json")) || !fs.existsSync(path.join(dir, "BACKTEST.md"))) {
    write("forecast-backtest.json", { date: null, source: "progressions/forecast-backtest", origins: [], bls: [], pass: null });
    return;
  }
  const results = JSON.parse(fs.readFileSync(path.join(dir, "results.json"), "utf8"));
  const markdown = fs.readFileSync(path.join(dir, "BACKTEST.md"), "utf8");
  const range = (cell) => {
    const parts = cell.split(",").map((p) => p.trim());
    const bounds = parts[1]?.match(/(-?[\d.]+) to (-?[\d.]+)/);
    return { value: Number(parts[0].replace("+", "")), low: bounds ? Number(bounds[1]) : null, high: bounds ? Number(bounds[2]) : null };
  };
  const origins = tableAfter(markdown, "| Origin | Target |").map(([origin, target, n, damping, naive, damped, ratio, result]) => ({
    origin: num(origin),
    target: num(target),
    occupations: num(n),
    damping: damping === "none" ? null : Number(damping),
    naive: Number(naive),
    damped: Number(damped),
    ratio: range(ratio),
    result: result.split(",")[0],
  }));
  const bls = tableAfter(markdown, "| Window | Occupations | Naive | BLS |")
    .filter((r) => /^\d{4} to \d{4}$/.test(r[0]))
    .map(([window, n, naive, blsCell, , damped]) => ({ origin: num(window), target: num(window.split(" to ")[1]), occupations: num(n), naive: Number(naive), bls: range(blsCell), damped: Number(damped) }));
  write("forecast-backtest.json", {
    date: firstDate(markdown),
    source: "progressions/forecast-backtest",
    origins,
    bls,
    pass: { needed: results.pass.needed, wins: results.pass.wins_count, passed: results.pass.passed, forecastIssued: results.forecast_2034 !== null },
    bootstrapDraws: results.bootstrap_draws,
  });
}

const AGE_BINS = [0, 1, 2, 3, 5, 8, 12, 18, 25, 40, 65, 120];

function buildLifespan() {
  const dir = path.join(SRC, "progressions/lifespan");
  const rows = readJsonl(path.join(dir, "progression.jsonl"));
  const age = (r) => (r.age_from === null || r.age_from === undefined || r.age_from === "None" || Number.isNaN(Number(r.age_from)) ? null : Number(r.age_from));
  const bin = (a) => AGE_BINS.findIndex((edge, i) => i < AGE_BINS.length - 1 && a >= edge && a < AGE_BINS[i + 1]);
  const kinds = Array.from(tally(rows, (r) => r.kind)).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const aged = rows.filter((r) => age(r) !== null);
  const cells = [];
  for (const kind of kinds) {
    for (let b = 0; b < AGE_BINS.length - 1; b += 1) {
      const own = aged.filter((r) => r.kind === kind && bin(age(r)) === b);
      if (own.length) cells.push({ kind, bin: b, rows: own.length, verified: own.filter((r) => r.verified === true || r.verified === "True").length });
    }
  }
  const fields = Array.from(tally(aged, (r) => r.field))
    .map(([field, count]) => ({ field, rows: count, age: median(aged.filter((r) => r.field === field).map(age)) }))
    .sort((a, b) => a.age - b.age || b.rows - a.rows);
  write("lifespan.json", {
    date: firstDate(fs.readFileSync(path.join(dir, "SUMMARY.md"), "utf8")),
    source: "progressions/lifespan/progression.jsonl",
    rows: rows.length,
    aged: aged.length,
    verified: rows.filter((r) => r.verified === true || r.verified === "True").length,
    bins: AGE_BINS,
    kinds,
    cells,
    fields,
  });
}

function buildEvidenceMarket() {
  const dir = path.join(SRC, "integration");
  const markdown = fs.readFileSync(path.join(dir, "CONNECTIONS.md"), "utf8");
  const controlled = num(markdown.match(/\| Independent controlled study of learning \| (\d+) \|/)[1]);
  const players = num(markdown.match(/(\d+) of (\d+) players matched no method/)[2]);
  const unmatched = num(markdown.match(/(\d+) of \d+ players matched no method/)[1]);
  let links = 0;
  for (const line of fs.readFileSync(path.join(dir, "CROSS-INDEX.jsonl"), "utf8").split("\n")) if (line) links += 1;
  write("evidence-market.json", {
    date: firstDate(markdown),
    source: "integration/CONNECTIONS.md and CROSS-INDEX.jsonl",
    players,
    controlled,
    unmatched,
    links,
    levels: tableAfter(markdown, "| Level | Players | Controlled study |").map(([level, count, studies]) => ({ level, players: num(count), controlled: num(studies) })),
    methods: tableAfter(markdown, "| Method | Framework grade |").map(([method, grade, works, products, studies]) => ({ method, grade: grade || null, works: num(works), products: num(products), controlled: num(studies) })),
    unused: tableAfter(markdown, "| Method | Effect on record |").map(([method]) => method),
  });
}

await buildTechnologyWaves();
buildForecastBacktest();
buildLifespan();
buildEvidenceMarket();
