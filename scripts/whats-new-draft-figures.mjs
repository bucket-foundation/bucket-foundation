#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public/whats-new");
const W = 1600;
const INK = "#1F1C16";
const MUTED = "#6F6A5E";
const AEGEAN = "#2E6B6B";
const DEEP = "#1F4F4F";
const GOLD = "#B8861E";
const BONE = "#EFE8D4";
const PAPER = "#FBF7EA";
const RULE = "rgba(31,28,22,0.22)";
const SERIF = "Georgia, 'DejaVu Serif', serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => n.toLocaleString("en-US");
const text = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${SERIF}" font-size="${o.size ?? 22}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? INK}" text-anchor="${o.anchor ?? "start"}"${o.spacing ? ` letter-spacing="${o.spacing}"` : ""}>${esc(s)}</text>`;

function frame(height, title, source, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}">
<rect width="${W}" height="${height}" fill="${BONE}"/>
${text(60, 84, title, { size: 40, weight: 700 })}
<rect x="60" y="108" width="${W - 120}" height="2" fill="${RULE}"/>
${body}
${text(60, height - 36, source, { size: 18, fill: MUTED })}
</svg>`;
}

async function write(name, svg) {
  const file = path.join(OUT, `${name}.webp`);
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(file);
  console.log(name, fs.statSync(file).size);
}

function quizFigure() {
  const limits = fs.readFileSync(path.join(ROOT, "src/lib/research-os/work-quiz/limits.ts"), "utf8").match(/QUIZ_QUESTIONS = \{ min: (\d+), max: (\d+) \}/);
  const min = Number(limits[1]);
  const max = Number(limits[2]);
  const cards = Array.from({ length: max }, (_, i) => {
    const x = 60 + i * 300;
    const always = i < min;
    return `<rect x="${x}" y="190" width="270" height="330" rx="10" fill="${always ? DEEP : PAPER}" stroke="${always ? DEEP : INK}" stroke-width="2"${always ? "" : ' stroke-dasharray="10 8"'}/>
${text(x + 135, 380, i + 1, { size: 120, weight: 700, anchor: "middle", fill: always ? BONE : MUTED })}
${text(x + 135, 480, always ? "every day" : "some days", { size: 20, anchor: "middle", fill: always ? BONE : MUTED })}`;
  }).join("\n");
  return frame(660, `The daily quiz holds ${min} to ${max} questions`, "Limits from src/lib/research-os/work-quiz/limits.ts.", cards);
}

function settingsFigure() {
  const panels = [
    ["Work quiz sources", "Which chats the daily quiz may read"],
    ["Installed decks", "The word decks on this computer"],
    ["Word database link", "An optional local database for search"],
    ["This app", "Daily notification and its time, data folder, version"],
  ];
  const body = panels
    .map(([head, line], i) => {
      const y = 200 + i * 118;
      return `<rect x="60" y="${y}" width="${W - 120}" height="98" rx="8" fill="${PAPER}" stroke="${RULE}" stroke-width="1.5"/>
<rect x="60" y="${y}" width="10" height="98" fill="${i === 3 ? GOLD : AEGEAN}"/>
${text(100, y + 44, head, { size: 30, weight: 700 })}
${text(100, y + 78, line, { size: 22, fill: MUTED })}`;
    })
    .join("\n");
  return frame(760, "Settings: four panels, all on this computer", "Drawn from packages/bkt-ui/src/views/Settings.tsx. A diagram of the page.", `${text(60, 160, "Everything here stays on this computer.", { size: 24, fill: MUTED })}\n${body}`);
}

function lessonsFigure() {
  const languages = Number(fs.readFileSync(path.join(ROOT, "packages/bkt/test/word-lessons.test.ts"), "utf8").match(/languages: (\d+)/)[1]);
  const words = Number(fs.readFileSync(path.join(ROOT, "packages/bkt/src/core/words.ts"), "utf8").match(/LESSON_WORDS = (\d+)/)[1]);
  const fields = ["The word", "How it sounds, in IPA", "Part of speech", "Meaning", "Where it comes from"];
  const rows = fields
    .map((f, i) => `<rect x="860" y="${222 + i * 74}" width="640" height="58" rx="6" fill="${PAPER}" stroke="${RULE}" stroke-width="1.5"/>${text(886, 260 + i * 74, f, { size: 26 })}`)
    .join("\n");
  const body = `${text(60, 400, languages, { size: 260, weight: 700, fill: DEEP })}
${text(400, 330, "languages", { size: 54, weight: 700 })}
${text(400, 390, `up to ${words} words in a lesson`, { size: 30, fill: MUTED })}
${text(60, 520, "Each language chosen in Settings gets a deck in Learn.", { size: 26, fill: MUTED })}
${text(860, 190, "Every word shows", { size: 26, weight: 700 })}
${rows}`;
  return frame(680, "Word lessons", "Counts from packages/bkt/test/word-lessons.test.ts and packages/bkt/src/core/words.ts. Words from Wiktionary via Kaikki, CC BY-SA.", body);
}

function decksFigure() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "decks/catalog.json"), "utf8"));
  const decks = catalog.decks.map((d) => ({ name: d.language_name, cards: d.counts.cards })).sort((a, b) => b.cards - a.cards);
  const total = decks.reduce((a, d) => a + d.cards, 0);
  const max = decks[0].cards;
  const half = Math.ceil(decks.length / 2);
  const bar = (d, i) => {
    const col = i < half ? 0 : 1;
    const row = i < half ? i : i - half;
    const x = 60 + col * 770;
    const y = 170 + row * 38;
    const w = Math.max(3, Math.sqrt(d.cards / max) * 380);
    return `${text(x + 200, y + 21, d.name, { size: 20, anchor: "end" })}
<rect x="${x + 214}" y="${y + 4}" width="${w.toFixed(1)}" height="22" rx="3" fill="${AEGEAN}"/>
${text(x + 224 + w, y + 21, fmt(d.cards), { size: 18, fill: MUTED })}`;
  };
  const height = 170 + half * 38 + 90;
  return frame(
    height,
    `${decks.length} word decks, ${fmt(total)} words`,
    `Counts from decks/catalog.json, built ${catalog.built}. Bar length follows the square root of the count. Wiktionary via Kaikki, CC BY-SA.`,
    decks.map(bar).join("\n"),
  );
}

function thresholdsFigure() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/solvability-atlas/thresholds/thresholds.json"), "utf8"));
  const ladder = data.cross_section.leakage_ladder;
  const labels = ["The row itself, the shipped rule", "Its variant family", "Family and near copies at 0.98", "Family and near copies at 0.95", "Family and near copies at 0.90"];
  const x = (v) => 620 + ((v - 0.5) / 0.3) * 860;
  const ticks = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]
    .map((t) => `<line x1="${x(t)}" y1="170" x2="${x(t)}" y2="${190 + ladder.length * 84}" stroke="${RULE}" stroke-width="1"/>${text(x(t), 200 + ladder.length * 84 + 22, t.toFixed(2), { size: 18, anchor: "middle", fill: MUTED })}`)
    .join("\n");
  const rows = ladder
    .map((r, i) => {
      const y = 220 + i * 84;
      return `${text(60, y - 4, labels[i], { size: 24, weight: i === 0 ? 700 : 400 })}
${text(60, y + 24, `${fmt(r.groups)} groups`, { size: 18, fill: MUTED })}
<line x1="${x(r.ci95[0])}" y1="${y}" x2="${x(r.ci95[1])}" y2="${y}" stroke="${i === 0 ? GOLD : AEGEAN}" stroke-width="5" stroke-linecap="round"/>
<circle cx="${x(r.auc)}" cy="${y}" r="10" fill="${i === 0 ? GOLD : DEEP}" stroke="${BONE}" stroke-width="2"/>
${text(x(r.ci95[1]) + 16, y + 7, r.auc.toFixed(3), { size: 22, weight: 700 })}`;
    })
    .join("\n");
  const height = 220 + ladder.length * 84 + 130;
  return frame(
    height,
    "Reach as a predictor of solved, by which neighbours are left out",
    `ROC AUC with 95% intervals over ${fmt(data.cross_section.rows)} problems, ${fmt(data.cross_section.solved)} solved. From tools/solvability-atlas/thresholds/thresholds.json.`,
    `${text(620, 152, "Neighbours excluded from a row's reach", { size: 18, fill: MUTED })}\n${ticks}\n${rows}\n${text(x(0.65), 200 + ladder.length * 84 + 52, "ROC AUC, where 0.5 is chance", { size: 18, anchor: "middle", fill: MUTED })}`,
  );
}

async function shots(base) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const save = async (name, png) => {
    const file = path.join(OUT, `${name}.webp`);
    await sharp(png).resize({ width: W, withoutEnlargement: true }).webp({ quality: 80 }).toFile(file);
    console.log(name, fs.statSync(file).size);
  };
  const coverage = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
  await coverage.goto(`${base}/research/maps/coverage`, { waitUntil: "networkidle", timeout: 120000 });
  await coverage.evaluate(() => document.fonts.ready);
  await save("progressions-coverage", await coverage.locator('[data-scheme="cip"]').screenshot());
  const globe = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await globe.goto(`${base}/explore`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await globe.waitForSelector("canvas", { timeout: 60000 });
  await globe.waitForTimeout(8000);
  await save("explore-globe-parchment", await globe.locator("canvas").first().screenshot());
  await browser.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await write("daily-quiz-3-to-5", quizFigure());
  await write("bkt-settings", settingsFigure());
  await write("word-lessons-27-languages", lessonsFigure());
  await write("word-decks-35", decksFigure());
  await write("solvability-thresholds", thresholdsFigure());
  const i = process.argv.indexOf("--base");
  if (i > 0) await shots(process.argv[i + 1]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
