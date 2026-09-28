import { spawnSync } from "node:child_process";
import { fusedConceptMastery, MASTERED_THRESHOLD, type ProficiencyState, type StoredCard } from "../../src/lib/academy/mastery";
import { demonstratedKeys } from "../../src/lib/research-os/grip";
import { verdictsFromEvents } from "../../src/lib/research-os/grip-db";

const DB = process.env.RESEARCH_OS_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const MIN_N = 30;

function rows<T>(sql: string): T[] {
  const r = spawnSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", `select coalesce(json_agg(t), '[]') from (${sql}) t`], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout.trim()) as T[];
}

const progress = rows<{ user_id: string; branch: string; data: { cards?: Record<string, StoredCard>; prof?: Record<string, ProficiencyState> } }>("select user_id, branch, data from bucket.academy_progress");
const events = rows<{ user_id: string; props: unknown; created_at: string }>("select user_id, props, created_at from bucket.learn_events where name = 'assess_done'");

const byUser = new Map<string, typeof events>();
for (const e of events) byUser.set(e.user_id, [...(byUser.get(e.user_id) ?? []), e]);

const table = new Map<string, { n: number; practice: number; shown: number; both: number }>();
for (const p of progress) {
  const shown = demonstratedKeys(verdictsFromEvents(byUser.get(p.user_id) ?? []));
  const t = table.get(p.branch) ?? { n: 0, practice: 0, shown: 0, both: 0 };
  for (const [atom, card] of Object.entries(p.data?.cards ?? {})) {
    const practiced = fusedConceptMastery(card, p.data?.prof?.[atom]).mastery >= MASTERED_THRESHOLD;
    const demo = shown.has(`${p.branch}/${atom}`);
    t.n++;
    t.practice += practiced ? 1 : 0;
    t.shown += demo ? 1 : 0;
    t.both += practiced && demo ? 1 : 0;
  }
  table.set(p.branch, t);
}

console.log(`progress rows ${progress.length}, assess events ${events.length}`);
console.log("branch | cards | practice mastered | assessed | both | residual practice minus assessed");
for (const [branch, t] of Array.from(table.entries()).sort()) {
  const residual = t.n ? ((t.practice - t.shown) / t.n).toFixed(3) : "n/a";
  console.log(`${branch} | ${t.n} | ${t.practice} | ${t.shown} | ${t.both} | ${residual}${t.n < MIN_N ? " (n below " + MIN_N + ", too small to read)" : ""}`);
}
