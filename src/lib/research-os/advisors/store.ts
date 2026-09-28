import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { graphService } from "../db";
import { pagedRead } from "../paging";
import type { AdvisorProfile } from "./match";
import { projector, type AdvisorSpace, type Projector } from "./project";

export const DAILY_MATCH_CAP = 40;
export const DECISIONS = ["yes", "no", "maybe"] as const;
export type Decision = (typeof DECISIONS)[number];
export const OPENALEX_ID = /^A[0-9]{1,15}$/;
export const ORCID_ID = /^[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9X]$/;

type SpaceRow = { model_version: string; model: AdvisorSpace };
type ProfileRow = {
  openalex_id: string;
  name: string;
  institution: string;
  ror: string;
  country: string;
  field: string;
  topics: string[];
  links: Record<string, string>;
  scores: number[];
};

export type LoadedSpace = { version: string; projector: Projector; profiles: AdvisorProfile[] };

let cache: { version: string; loadedAt: number; value: LoadedSpace } | null = null;
const CACHE_MS = 5 * 60 * 1000;

let _bucket: SupabaseClient | null = null;
function bucketService(): SupabaseClient {
  if (_bucket) return _bucket;
  _bucket = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    db: { schema: "bucket" },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseClient;
  return _bucket;
}

export function toProfile(r: ProfileRow): AdvisorProfile {
  return {
    openalexId: r.openalex_id,
    name: r.name,
    institution: r.institution,
    ror: r.ror,
    country: r.country,
    field: r.field,
    topics: r.topics ?? [],
    links: r.links ?? {},
    scores: Float64Array.from(r.scores ?? []),
  };
}

export async function activeVersion(svc: SupabaseClient = graphService()): Promise<string | null> {
  const { data, error } = await svc.from("advisor_space").select("model_version").eq("active", true).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { model_version: string } | null)?.model_version ?? null;
}

export async function loadSpace(svc: SupabaseClient = graphService(), now = Date.now()): Promise<LoadedSpace | null> {
  if (cache && now - cache.loadedAt < CACHE_MS) return cache.value;
  const version = await activeVersion(svc);
  if (!version) {
    cache = null;
    return null;
  }
  if (cache && cache.version === version) {
    cache.loadedAt = now;
    return cache.value;
  }
  const { data, error } = await svc.from("advisor_space").select("model_version, model").eq("model_version", version).single();
  if (error) throw new Error(error.message);
  const row = data as SpaceRow;
  const rows = await pagedRead<ProfileRow>((page) =>
    svc
      .from("advisor_public")
      .select("openalex_id, name, institution, ror, country, field, topics, links, scores")
      .eq("model_version", version)
      .eq("hidden", false)
      .order("openalex_id")
      .range(page.from, page.to) as unknown as Promise<{ data: ProfileRow[] | null; error: { message: string } | null }>,
  );
  const value = { version, projector: projector(row.model), profiles: rows.map(toProfile) };
  const k = row.model.k;
  if (value.profiles.some((p) => p.scores.length !== k)) throw new Error("advisor profile scores do not match the model dimension");
  cache = { version, loadedAt: now, value };
  return value;
}

export function dropCache(): void {
  cache = null;
}

export const PAGES_PER_TEXT = 12;
export type MatchQuota = "ok" | "over_cap" | "over_pages";

export function textHash(text: string): string {
  return createHash("sha256").update(text.normalize("NFC").replace(/\s+/g, " ").trim(), "utf8").digest("hex");
}

export async function takeMatch(learnerId: string, text: string, svc: SupabaseClient = graphService()): Promise<MatchQuota> {
  const { data, error } = await svc.rpc("advisor_match_take", {
    p_subject: learnerId,
    p_text_hash: textHash(text),
    p_cap: DAILY_MATCH_CAP,
    p_max_pages: PAGES_PER_TEXT,
  });
  if (error) throw new Error(error.message);
  if (data !== "ok" && data !== "over_cap" && data !== "over_pages") throw new Error(`advisor_match_take returned ${String(data)}`);
  return data;
}

export const OPTOUTS_PER_SOURCE_HOUR = 5;
export const HIDES_PER_DAY = 100;
export type OptOutOutcome = "hidden" | "queued" | "rate_limited";

export function sourceHash(ip: string): string {
  return createHash("sha256").update(`advisor-optout:${ip}`, "utf8").digest("hex");
}

export async function requestOptOut(
  input: { openalexId: string | null; orcid: string | null; contact: string; reason: string; source: string },
  svc: SupabaseClient = graphService(),
): Promise<OptOutOutcome> {
  const { data, error } = await svc.rpc("advisor_request_optout", {
    p_openalex: input.openalexId ?? "",
    p_orcid: input.orcid ?? "",
    p_contact: input.contact,
    p_reason: input.reason,
    p_source_hash: sourceHash(input.source),
    p_per_source_hour: OPTOUTS_PER_SOURCE_HOUR,
    p_hides_per_day: HIDES_PER_DAY,
  });
  if (error) throw new Error(error.message);
  if (data !== "hidden" && data !== "queued" && data !== "rate_limited") throw new Error(`advisor_request_optout returned ${String(data)}`);
  if (data === "hidden") dropCache();
  return data;
}

export async function listSwipes(learnerId: string, svc: SupabaseClient = bucketService()): Promise<{ openalexId: string; decision: Decision; updatedAt: string }[]> {
  const rows = await pagedRead<{ openalex_id: string; decision: Decision; updated_at: string }>((page) =>
    svc
      .from("advisor_swipes")
      .select("openalex_id, decision, updated_at")
      .eq("user_id", learnerId)
      .order("updated_at", { ascending: false })
      .range(page.from, page.to) as unknown as Promise<{ data: { openalex_id: string; decision: Decision; updated_at: string }[] | null; error: { message: string } | null }>,
  );
  return rows.map((r) => ({ openalexId: r.openalex_id, decision: r.decision, updatedAt: r.updated_at }));
}

export async function putSwipe(learnerId: string, openalexId: string, decision: Decision | null, svc: SupabaseClient = bucketService()): Promise<void> {
  if (decision === null) {
    const { error } = await svc.from("advisor_swipes").delete().eq("user_id", learnerId).eq("openalex_id", openalexId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await svc
    .from("advisor_swipes")
    .upsert({ user_id: learnerId, openalex_id: openalexId, decision, updated_at: new Date().toISOString() }, { onConflict: "user_id,openalex_id" });
  if (error) throw new Error(error.message);
}

export async function clearSwipes(learnerId: string, svc: SupabaseClient = bucketService()): Promise<void> {
  const { error } = await svc.from("advisor_swipes").delete().eq("user_id", learnerId);
  if (error) throw new Error(error.message);
}
