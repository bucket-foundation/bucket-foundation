import data from "@/data/founding-works.json";
import { matchFounding, type FoundingMatch, type FoundingRow } from "./rank";
import { sourceHitId, sourceUrl, type SourceKind } from "./sources";

export type Env = Record<string, string | undefined>;

export const UNVERIFIED_FLAG = "EXPLORE_FOUNDING_UNVERIFIED";
const OPEN_VERCEL_ENVS = ["preview", "development"];
const OPEN_NODE_ENVS = ["development", "test"];

export const FOUNDING_ROWS = (data as { rows: FoundingRow[] }).rows;
const WORK_KINDS = (data as { work_kinds: Record<string, SourceKind> }).work_kinds;
const TIER_LABEL: Record<string, string> = { founding: "Founding work", landmark: "Landmark paper" };

export function unverifiedFoundingAllowed(env: Env = process.env): boolean {
  if (env[UNVERIFIED_FLAG]?.trim() !== "1") return false;
  const vercel = env.VERCEL_ENV?.trim();
  if (vercel) return OPEN_VERCEL_ENVS.includes(vercel);
  return OPEN_NODE_ENVS.includes(env.NODE_ENV?.trim() ?? "");
}

export interface FoundingCard {
  hit_id: string | null;
  label: string;
  concept: string;
  title: string;
  author: string;
  year: number;
  url: string | null;
  checked: boolean;
  dispute_note: string | null;
}

export interface Founding {
  card: FoundingCard;
  hitId: string | null;
  bonus: number;
}

export function foundingCard(m: FoundingMatch, kinds: Record<string, SourceKind> = WORK_KINDS): Founding {
  const kind = kinds[m.row.work.kind];
  const hitId = kind ? sourceHitId(kind, m.row.work.id) : null;
  return {
    hitId,
    bonus: m.bonus,
    card: {
      hit_id: hitId,
      label: TIER_LABEL[m.row.tier] ?? TIER_LABEL.landmark,
      concept: m.row.concept,
      title: m.row.work.title,
      author: m.row.work.author,
      year: m.row.work.year,
      url: kind ? sourceUrl(kind, m.row.work.id) : null,
      checked: m.approved,
      dispute_note: m.row.disputed ? m.row.dispute_reason ?? "The attribution of this work is disputed." : null,
    },
  };
}

export function foundingFor(query: string, env: Env = process.env, rows: FoundingRow[] = FOUNDING_ROWS): Founding | null {
  const m = matchFounding(query, rows, unverifiedFoundingAllowed(env));
  return m ? foundingCard(m) : null;
}
