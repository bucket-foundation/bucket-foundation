import { canonIndex } from "@/lib/canon-search";
import { CANON_FILES } from "./canon-files";
import { buildCorpus, type ExploreCorpus } from "./ranked-core";
import { loadSourceIndex } from "./sources";
import { talkFor } from "./talks";

export * from "./ranked-core";

let cached: { pool: unknown; entries: unknown; corpus: ExploreCorpus } | null = null;

export async function loadExploreCorpus(): Promise<ExploreCorpus> {
  const pool = await loadSourceIndex();
  const entries = canonIndex();
  if (cached && cached.pool === pool && cached.entries === entries) return cached.corpus;
  const corpus = buildCorpus({ rows: pool.map((p) => p.row), entries, files: CANON_FILES, talk: talkFor });
  cached = { pool, entries, corpus };
  return corpus;
}
