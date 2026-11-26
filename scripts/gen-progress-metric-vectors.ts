import fs from "node:fs";
import path from "node:path";
import { inputDays, inputSeconds, langMetrics, streakFromDays } from "../src/lib/academy/progress-metric";

const H = 3_600_000;
const D = 86_400_000;
const now = Date.UTC(2026, 10, 26, 18);
const ex = (at: number, seconds: number, cov: number, lang = "es", extra: object = {}) => ({ kind: "exposure", lang, reviewed_at: at, tz: "America/New_York", seconds, coverage_pred: cov, lemmas_seen: [] as string[], taps: [] as string[], ...extra });
const ses = (started: number, ended: number, lang = "es", tz = "America/New_York") => ({ kind: "session", lang, reviewed_at: ended, tz, started, ended });

const rowCases = [
  { name: "coverage at the bar counts, below it does not", lang: "es", rows: [ex(now - H, 120, 0.9), ex(now - H, 600, 0.89), ex(now - H, 60, 1)] },
  { name: "other languages and review rows are ignored", lang: "es", rows: [ex(now - H, 200, 0.95, "fr"), { kind: "review", reviewed_at: now, tz: "UTC" }, ex(now - 2 * H, 3600, 0.95)] },
  { name: "session with 5 minutes of input marks its day", lang: "es", rows: [ses(now - H, now - H + 600_000), ex(now - H + 100_000, 200, 0.95), ex(now - H + 200_000, 100, 0.92)] },
  { name: "session with 299 seconds does not count", lang: "es", rows: [ses(now - H, now - H + 600_000), ex(now - H + 100_000, 299, 0.95), ex(now - 3 * H, 500, 0.95)] },
  { name: "low coverage input does not fill a session", lang: "es", rows: [ses(now - H, now), ex(now - H / 2, 400, 0.5)] },
  { name: "session day uses the row time zone", lang: "es", rows: [ses(Date.UTC(2026, 10, 26, 3), Date.UTC(2026, 10, 26, 4), "es", "America/Los_Angeles"), ex(Date.UTC(2026, 10, 26, 3, 30), 400, 0.95), ses(now - 3 * D, now - 3 * D + 900_000, "es", "UTC"), ex(now - 3 * D + 1000, 300, 1)] },
];

const streakCases = [
  { name: "empty", days: [] as string[], today: "2026-11-26" },
  { name: "today and two before", days: ["2026-11-24", "2026-11-25", "2026-11-26"], today: "2026-11-26" },
  { name: "ends yesterday", days: ["2026-11-24", "2026-11-25"], today: "2026-11-26" },
  { name: "gap breaks it", days: ["2026-11-22", "2026-11-24"], today: "2026-11-26" },
  { name: "across a month end", days: ["2026-10-30", "2026-10-31", "2026-11-1"], today: "2026-11-1" },
  { name: "across a year end", days: ["2025-12-31", "2026-1-1"], today: "2026-1-2" },
];

const cards = { "es:casa": { stability: 30, lastReview: now - 2 * D }, "es:perro": { stability: 1, lastReview: now - 10 * D }, "es:gato": { stability: 50, lastReview: now - D }, "fr:chat": { stability: 50, lastReview: now - D } };
const metricCases = [
  { name: "cards only", lang: "es", cards, rows: [] as ReturnType<typeof ex>[] },
  { name: "a recent tap drops a card to unknown", lang: "es", cards, rows: [ex(now - H, 1800, 0.95, "es", { lemmas_seen: ["casa", "gato", "luna"], taps: ["gato"] })] },
  { name: "input hours round down to a tenth", lang: "es", cards: {}, rows: [ex(now - H, 3599, 0.95), ex(now - H, 359, 0.9), ex(now - H, 2000, 0.1)] },
];

const out = {
  version: 1,
  now,
  rows: rowCases.map((c) => ({ ...c, expect: { inputSeconds: inputSeconds(c.rows, c.lang), inputDays: inputDays(c.rows, c.lang) } })),
  streak: streakCases.map((c) => ({ ...c, expect: streakFromDays(c.days, c.today) })),
  metrics: metricCases.map((c) => ({ ...c, expect: langMetrics(c.lang, c.cards, c.rows, now) })),
};
fs.writeFileSync(path.join(__dirname, "..", "src/lib/academy/progress-metric-vectors.json"), JSON.stringify(out, null, 2) + "\n");
