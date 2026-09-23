import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { EMBED_MODEL, embedText } from "../../src/lib/research-os/attention";
import { isIdeaNode } from "../../src/lib/research-os/idea";
import { pagedRead } from "../../src/lib/research-os/paging";

type Row = { id: string; title: string; summary: string | null; kind: string; provenanceType: string | null };

function embed(items: { id: string; text: string }[]): Map<string, number[]> {
  if (!items.length) return new Map();
  const res = spawnSync("python3", [path.join(__dirname, "embed-texts.py")], { input: JSON.stringify(items), encoding: "utf8", maxBuffer: 512 * 1024 * 1024, env: { ...process.env, EMBED_MODEL } });
  if (res.status !== 0) throw new Error(`embed-texts.py exited ${res.status}: ${(res.stderr || "").slice(-300)}`);
  return new Map(Object.entries(JSON.parse(res.stdout) as Record<string, number[]>));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } }) as unknown as SupabaseClient;
  const rows = await pagedRead<Row>((page) =>
    svc
      .from("nodes")
      .select("id,title,summary,kind,provenanceType:provenance->>type")
      .eq("visibility", "public")
      .is("superseded_by", null)
      .order("id", { ascending: true })
      .range(page.from, page.to) as unknown as Promise<{ data: Row[] | null; error: { message: string } | null }>,
  );
  const ideas = rows.filter((r) => isIdeaNode({ kind: r.kind, provenanceType: r.provenanceType }));
  const stored = await pagedRead<{ node_id: string; text_hash: string }>((page) =>
    svc
      .from("node_embeddings")
      .select("node_id,text_hash")
      .eq("model", EMBED_MODEL)
      .order("node_id", { ascending: true })
      .range(page.from, page.to) as unknown as Promise<{ data: { node_id: string; text_hash: string }[] | null; error: { message: string } | null }>,
  );
  const have = new Map(stored.map((s) => [s.node_id, s.text_hash]));
  const hash = (t: string) => createHash("sha256").update(`${EMBED_MODEL}\n${t}`).digest("hex").slice(0, 32);
  const todo = ideas.map((r) => ({ id: r.id, text: embedText(r.title, r.summary) })).filter((x) => have.get(x.id) !== hash(x.text));
  const vectors = embed(todo);
  for (let i = 0; i < todo.length; i += 200) {
    const chunk = todo.slice(i, i + 200).map((x) => ({ node_id: x.id, model: EMBED_MODEL, text_hash: hash(x.text), vector: vectors.get(x.id)!, updated_at: new Date().toISOString() }));
    const { error } = await svc.from("node_embeddings").upsert(chunk, { onConflict: "node_id,model" });
    if (error) throw new Error(`node_embeddings: ${error.message}`);
  }
  console.log(`[embed-nodes] ${ideas.length} public ideas, ${todo.length} embedded, ${ideas.length - todo.length} unchanged`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
