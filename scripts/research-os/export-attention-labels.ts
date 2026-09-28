import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_RANK, LEXICAL_FLOOR, PHRASE_ENTRIES } from "../../src/lib/research-os/attention";
import { seeded } from "../../src/lib/research-os/decompose-further";
import { prepare } from "./eval-attention";

const OUT = path.join(__dirname, "ingest", "out");
const COUNT = 20;
const TOP = 10;

export function blindRows<T extends string>(arms: Record<T, string[]>, seed: string): { items: string[]; from: Record<string, T[]> } {
  const from: Record<string, T[]> = {};
  for (const [arm, ids] of Object.entries(arms) as [T, string[]][]) for (const id of ids) (from[id] ??= []).push(arm);
  const items = Object.keys(from).sort();
  const rand = seeded(seed);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return { items, from };
}

async function main() {
  const p = await prepare();
  const rand = seeded("attention-labels");
  const pool = p.held.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const settings = { entries: PHRASE_ENTRIES, floor: LEXICAL_FLOOR, cone: "hide" as const };
  const sheet: { query: number; text: string; items: { item: number; title: string; slug: string }[] }[] = [];
  const key: { query: number; source: string; items: { item: number; slug: string; arms: string[] }[] }[] = [];
  pool.slice(0, COUNT).forEach((q, n) => {
    const arms = {
      embedding: p.embedRank(q).slice(0, TOP),
      product: p.ranked(q, { entries: p.lexicalEntries(q, settings), cone: settings.cone, rank: DEFAULT_RANK.phrase }).slice(0, TOP),
    };
    const { items, from } = blindRows(arms, `labels-${n}`);
    sheet.push({
      query: n + 1,
      text: q.text,
      items: items.map((id, i) => ({ item: i + 1, title: p.snap.byId.get(id)?.title ?? id, slug: p.snap.byId.get(id)?.slug ?? id })),
    });
    key.push({ query: n + 1, source: p.snap.byId.get(q.source)?.slug ?? q.source, items: items.map((id, i) => ({ item: i + 1, slug: p.snap.byId.get(id)?.slug ?? id, arms: from[id] })) });
  });
  mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const sheetFile = path.join(OUT, `attention-labels-${stamp}.json`);
  const keyFile = path.join(OUT, `attention-labels-${stamp}.key.json`);
  writeFileSync(
    sheetFile,
    JSON.stringify(
      {
        how: "For each query, mark every item 2 if a learner needs it to understand the passage or the passage builds on it, 1 if it is on the same topic, 0 otherwise.",
        queries: sheet,
      },
      null,
      1,
    ),
  );
  writeFileSync(keyFile, JSON.stringify({ arms: { embedding: "bge-small kNN from the phrase", product: `default phrase rank, ${DEFAULT_RANK.phrase}` }, key }, null, 1));
  console.log(`[export-attention-labels] ${sheet.length} queries, ${sheet.reduce((a, s) => a + s.items.length, 0)} items; sheet ${path.basename(sheetFile)}, key ${path.basename(keyFile)}`);
}

if (require.main === module)
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
