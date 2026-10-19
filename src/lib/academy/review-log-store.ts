import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeState, type Depth, type EngineState } from "./engine";
import type { Rating } from "./fsrs";
import type { AppendResult, AppendRow, FoldState, StoredReview } from "./review-log-server";

const PAGE = 1000;

interface LogRow {
  review_id: string;
  branch: string;
  card_id: string;
  rating: number;
  level: string;
  reviewed_at: string;
  tz: string;
  atoms_version: string;
  device_id: string;
  seq: number | string;
}

const COLUMNS = "review_id,branch,card_id,rating,level,reviewed_at,tz,atoms_version,device_id,seq";

export function toStored(r: LogRow): StoredReview {
  return {
    review_id: r.review_id,
    branch: r.branch,
    card_id: r.card_id,
    rating: r.rating as Rating,
    level: r.level as Depth,
    reviewed_at: Date.parse(r.reviewed_at),
    tz: r.tz,
    atoms_version: r.atoms_version,
    device_id: r.device_id,
    seq: Number(r.seq),
  };
}

export function bucketService(url: string, key: string): SupabaseClient {
  return createClient(url, key, { db: { schema: "bucket" }, auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseClient;
}

export function reviewLogStore(svc: () => SupabaseClient) {
  return {
    async appendReviews(uid: string, rows: AppendRow[]): Promise<AppendResult[]> {
      const { data, error } = await svc().rpc("append_reviews", { p_user: uid, p_rows: rows });
      if (error) throw new Error(error.message);
      return ((data as { review_id: string; status: AppendResult["status"]; seq: number | string }[]) || []).map((r) => ({ review_id: r.review_id, status: r.status, seq: Number(r.seq) }));
    },

    async readLog(uid: string, sinceSeq: number, limit: number): Promise<StoredReview[]> {
      const { data, error } = await svc().from("academy_review_log").select(COLUMNS).eq("user_id", uid).gt("seq", sinceSeq).order("seq", { ascending: true }).limit(limit);
      if (error) throw new Error(error.message);
      return ((data as LogRow[]) || []).map(toStored);
    },

    async readBranch(uid: string, branch: string, opts: { afterSeq?: number; limit?: number } = {}): Promise<{ baseline: EngineState | null; rows: StoredReview[] }> {
      const base = await svc().from("academy_review_baseline").select("data").eq("user_id", uid).eq("branch", branch).maybeSingle();
      if (base.error) throw new Error(base.error.message);
      const rows: StoredReview[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await svc().from("academy_review_log").select(COLUMNS).eq("user_id", uid).eq("branch", branch).gt("seq", opts.afterSeq ?? 0).order("seq", { ascending: true }).range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        const page = (data as LogRow[]) || [];
        rows.push(...page.map(toStored));
        if (page.length < PAGE || (opts.limit !== undefined && rows.length >= opts.limit)) break;
      }
      const data = (base.data as { data: unknown } | null)?.data;
      return { baseline: data ? normalizeState(data) : null, rows };
    },

    async writeFold(uid: string, branch: string, data: EngineState, seq: number, foldKey: string): Promise<boolean> {
      const { data: ok, error } = await svc().rpc("write_progress_fold", { p_user: uid, p_branch: branch, p_data: data, p_seq: seq, p_fold_key: foldKey });
      if (error) throw new Error(error.message);
      return ok === true;
    },

    async readFold(uid: string, branch: string): Promise<FoldState | null> {
      const { data, error } = await svc().from("academy_progress").select("data,log_seq,fold_key").eq("user_id", uid).eq("branch", branch).maybeSingle();
      if (error) throw new Error(error.message);
      const row = data as { data: unknown; log_seq: number | string | null; fold_key: string | null } | null;
      return row ? { data: row.data ? normalizeState(row.data) : null, log_seq: row.log_seq === null ? null : Number(row.log_seq), fold_key: row.fold_key } : null;
    },

    async noteCapped(uid: string, branch: string, note: string): Promise<void> {
      const { error } = await svc().rpc("note_fold_capped", { p_user: uid, p_branch: branch, p_note: note });
      if (error) throw new Error(error.message);
    },

    async noteSkips(uid: string, branch: string, ids: string[], note: string): Promise<void> {
      const { error } = await svc().rpc("note_fold_skips", { p_user: uid, p_branch: branch, p_ids: ids, p_note: note });
      if (error) throw new Error(error.message);
    },
  };
}
