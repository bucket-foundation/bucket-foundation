import type { SupabaseClient } from "@supabase/supabase-js";
import { publicSilver, type PublicSilver, type SilverRow } from "./redact";

const CHUNK = 40;

export async function silverForReview(svc: SupabaseClient, ids: string[]): Promise<Map<string, PublicSilver>> {
  const out = new Map<string, PublicSilver>();
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return out;
  const rows: (SilverRow & { source_revision: string })[] = [];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data, error } = await svc
      .from("silver_items")
      .select("id,source_id,source_revision,kind,locator,text,text_hash,confidence")
      .in("id", unique.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    rows.push(...((data as (SilverRow & { source_revision: string })[]) || []));
  }
  const sources = Array.from(new Set(rows.map((r) => r.source_id)));
  const admissions = new Map<string, { allow_index: boolean; status: string }>();
  for (let i = 0; i < sources.length; i += CHUNK) {
    const { data, error } = await svc
      .from("evidence_source_admissions")
      .select("source_id,source_revision,allow_index,status")
      .in("source_id", sources.slice(i, i + CHUNK));
    if (error) throw new Error(error.message);
    for (const a of (data as { source_id: string; source_revision: string; allow_index: boolean; status: string }[]) || []) {
      admissions.set(`${a.source_id} ${a.source_revision}`, { allow_index: a.allow_index, status: a.status });
    }
  }
  for (const r of rows) out.set(r.id, publicSilver(r, admissions.get(`${r.source_id} ${r.source_revision}`) ?? null));
  return out;
}
