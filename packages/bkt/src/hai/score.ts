import Anthropic from "@anthropic-ai/sdk";
import { seededRandom } from "../grade";
import type { Bank, FrozenItem } from "./bank";
import type { AiAnswer, AiScores } from "./probe";

export const MODEL = "claude-opus-5-5";
export const EFFORT = "low" as const;
export const PRICE_IN_PER_M = 4;
export const PRICE_OUT_PER_M = 20;
export const BATCH_DISCOUNT = 0.5;
export const EST_OUTPUT_TOKENS = 300;
export const MAX_TOKENS = 400;
export const DEFAULT_BUDGET_FACTOR = 1.5;
export const PROMPT_OVERHEAD_TOKENS = 120;
export const LETTERS = ["A", "B", "C", "D"];

export const SYSTEM =
  "You answer one multiple-choice science question. Pick the single best choice. Reply with JSON: the choice letter and a rationale of at most 25 words.";

export const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    choice: { type: "string", enum: LETTERS },
    rationale: { type: "string" },
  },
  required: ["choice", "rationale"],
  additionalProperties: false,
};

export function questionText(item: FrozenItem): string {
  return [item.prompt, "", ...item.choices.map((c, i) => `${LETTERS[i]}. ${c}`)].join("\n");
}

export function selectForScoring(bank: Bank, eligible: Set<string>, pilot: number | null, seed = "hai-pilot"): FrozenItem[] {
  const pool = bank.items.filter((i) => eligible.has(i.id));
  if (pilot === null) return pool;
  const rand = seededRandom(seed);
  const byTier = new Map<string, FrozenItem[]>();
  for (const i of pool) byTier.set(i.tier, [...(byTier.get(i.tier) ?? []), i]);
  const out: FrozenItem[] = [];
  const tiers = [...byTier.keys()].sort();
  for (const t of tiers) {
    const g = byTier.get(t)!;
    const want = Math.round((pilot * g.length) / pool.length);
    for (let n = 0; n < want && g.length; n++) out.push(g.splice(Math.floor(rand() * g.length), 1)[0]);
  }
  return out.slice(0, pilot);
}

export interface CostEstimate {
  items: number;
  inputTokens: number;
  outputTokens: number;
  usd: number;
  usdBatch: number;
  worstUsdBatch: number;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(items: FrozenItem[]): CostEstimate {
  const inputTokens = items.reduce((s, i) => s + estimateTokens(SYSTEM + questionText(i)) + PROMPT_OVERHEAD_TOKENS, 0);
  const outputTokens = items.length * EST_OUTPUT_TOKENS;
  const usd = (inputTokens * PRICE_IN_PER_M + outputTokens * PRICE_OUT_PER_M) / 1e6;
  const worst = (inputTokens * PRICE_IN_PER_M + items.length * MAX_TOKENS * PRICE_OUT_PER_M) / 1e6;
  return { items: items.length, inputTokens, outputTokens, usd, usdBatch: usd * BATCH_DISCOUNT, worstUsdBatch: worst * BATCH_DISCOUNT };
}

export function customId(index: number): string {
  return `i${index}`;
}

export function batchRequests(items: FrozenItem[]) {
  return items.map((item, n) => ({
    custom_id: customId(n),
    params: {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      output_config: { effort: EFFORT, format: { type: "json_schema" as const, schema: ANSWER_SCHEMA } },
      messages: [{ role: "user" as const, content: questionText(item) }],
    },
  }));
}

export function parseAnswer(item: FrozenItem, text: string): AiAnswer {
  let parsed: { choice?: unknown; rationale?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    return { choice: null, correct: false, rationale: "", malformed: true };
  }
  const choice = typeof parsed.choice === "string" ? LETTERS.indexOf(parsed.choice) : -1;
  const valid = choice >= 0 && choice < item.choices.length;
  const out: AiAnswer = {
    choice: valid ? choice : null,
    correct: valid && choice === item.answerIndex,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale.slice(0, 300) : "",
  };
  if (!valid) out.malformed = true;
  return out;
}

export interface Submission {
  batchId: string;
  bankVersion: string;
  model: string;
  itemIds: string[];
  submittedAt: string;
  collectedAt?: string;
}

export async function submit(client: Anthropic, bank: Bank, items: FrozenItem[]): Promise<Submission> {
  const batch = await client.messages.batches.create({ requests: batchRequests(items) });
  return { batchId: batch.id, bankVersion: bank.version, model: MODEL, itemIds: items.map((i) => i.id), submittedAt: new Date().toISOString() };
}

export interface CollectResult {
  scores: AiScores;
  failed: string[];
}

export async function collect(client: Anthropic, bank: Bank, sub: Submission, previous?: AiScores): Promise<CollectResult | { pending: string }> {
  if (sub.bankVersion !== bank.version) throw new Error(`submission is for bank ${sub.bankVersion}, bank is ${bank.version}`);
  const status = await client.messages.batches.retrieve(sub.batchId);
  if (status.processing_status !== "ended") return { pending: status.processing_status };
  const byId = new Map(bank.items.map((i) => [i.id, i]));
  const answers: Record<string, AiAnswer> = { ...(previous?.answers ?? {}) };
  const failed: string[] = [];
  for await (const r of await client.messages.batches.results(sub.batchId)) {
    const itemId = sub.itemIds[Number(r.custom_id.slice(1))];
    const item = itemId ? byId.get(itemId) : undefined;
    if (!item) throw new Error(`result ${r.custom_id} maps to no bank item`);
    if (r.result.type !== "succeeded" || r.result.message.stop_reason === "refusal") {
      failed.push(item.id);
      continue;
    }
    if (r.result.message.stop_reason === "max_tokens") {
      answers[item.id] = { choice: null, correct: false, rationale: "", malformed: true };
      continue;
    }
    const text = r.result.message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    answers[item.id] = parseAnswer(item, text);
  }
  return { scores: { bankVersion: bank.version, model: sub.model, scoredAt: new Date().toISOString(), answers }, failed };
}
