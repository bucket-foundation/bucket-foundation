import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { projector, SPACE_SCHEMA, type AdvisorSpace } from "../../src/lib/research-os/advisors/project";

type Bundle = { space: AdvisorSpace; profiles: Record<string, unknown>[]; counts?: Record<string, unknown> };

export function checkBundle(b: Bundle): string[] {
  const problems: string[] = [];
  if (b?.space?.schema !== SPACE_SCHEMA) problems.push(`space schema is ${b?.space?.schema}, expected ${SPACE_SCHEMA}`);
  try {
    projector(b.space);
  } catch (e) {
    problems.push(e instanceof Error ? e.message : String(e));
  }
  if (!Array.isArray(b?.profiles) || b.profiles.length === 0) problems.push("no profiles");
  for (const p of b?.profiles ?? []) {
    if ("email" in p) problems.push(`profile ${String(p.openalex_id)} carries an email field`);
    if (!Array.isArray(p.scores) || p.scores.length !== b.space?.k) problems.push(`profile ${String(p.openalex_id)} has scores of the wrong length`);
  }
  if (b?.counts?.synthetic) problems.push("this is the synthetic parity fixture");
  return problems;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: load-advisors.ts <bundle.json>");
  const bundle = JSON.parse(readFileSync(file, "utf8")) as Bundle;
  const problems = checkBundle(bundle);
  if (problems.length) throw new Error(problems.slice(0, 10).join("\n"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await svc.rpc("advisor_load", { p_model: bundle.space, p_profiles: bundle.profiles, p_counts: bundle.counts ?? {} });
  if (error) throw new Error(error.message);
  console.log(JSON.stringify({ loaded: data, profiles: bundle.profiles.length }));
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
