/**
 * Insight synthesizer, turns (venture, topic, candidate grants) into a
 * fit analysis with rationale + gap detection.
 *
 * Two implementations:
 * - MockSynthesizer: deterministic keyword-overlap. Default. No API key
 * needed; tests/CI use this.
 * - AnthropicSynthesizer: real Claude call via @anthropic-ai/sdk. Selected
 * by INSIGHT_SYNTH=anthropic + ANTHROPIC_API_KEY. Emits a feed402 §3.2
 * sibling `provenance` block on the envelope (model_id, candidates,
 * prompt_sha256, ts) so a downstream agent can audit the synthesis.
 *
 * Bead: bkt-x2b.
 */

import { createHash } from "node:crypto";
import type {
  Grant,
  InsightRequest,
  InsightResponse,
  SynthesisProvenance,
} from "../types.js";

export interface SynthesisResult {
  insight: InsightResponse;
  /** Optional, only populated by real-model synthesizers. */
  provenance?: SynthesisProvenance;
}

export interface Synthesizer {
  synthesize(req: InsightRequest, candidates: Grant[]): Promise<SynthesisResult>;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function overlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  let hits = 0;
  for (const t of a) if (setB.has(t)) hits++;
  return hits;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Deterministic keyword-overlap ranker. Used both standalone (Mock) and
 * as the pre-ranker for the LLM (so input tokens stay bounded). */
function rankByOverlap(req: InsightRequest, candidates: Grant[]) {
  const wantTokens = [...tokens(req.topic), ...tokens(req.venture)];
  return candidates
    .map((g) => {
      const haystack = [g.title, g.summary, ...g.topics, g.eligibility].join(" ");
      const score = overlap(wantTokens, tokens(haystack));
      const norm = Math.min(1, score / Math.max(3, wantTokens.length));
      return { g, score: norm };
    })
    .sort((a, b) => b.score - a.score);
}

export class MockSynthesizer implements Synthesizer {
  async synthesize(req: InsightRequest, candidates: Grant[]): Promise<SynthesisResult> {
    const scored = rankByOverlap(req, candidates);

    const matches = scored
      .filter((s) => s.score > 0)
      .slice(0, 5)
      .map(({ g, score }) => ({
        grant_id: g.id,
        fit_score: Number(score.toFixed(3)),
        rationale: `Topical overlap with "${req.topic}": tags ${g.topics.join(", ")}; funder ${g.funder}.`,
        deadline: g.deadline,
        days_until_deadline: daysUntil(g.deadline),
      }));

    const gaps: string[] = [];
    if (matches.length === 0) gaps.push(`No grant in current corpus matches topic="${req.topic}".`);
    if (!matches.some((m) => m.days_until_deadline != null && m.days_until_deadline < 90)) {
      gaps.push("No near-term (<90d) deadlines in matches — pipeline is not deadline-pressured.");
    }
    if (!matches.some((m) => m.fit_score >= 0.5)) {
      gaps.push("Best fit score <0.5 — consider broadening topic or expanding ingestion.");
    }

    const summary =
      matches.length === 0
        ? `No matching grants for venture "${req.venture}" on topic "${req.topic}". See gaps.`
        : `${matches.length} candidate grant(s) for "${req.venture}" on "${req.topic}". Top fit: ${matches[0].grant_id} (score ${matches[0].fit_score}).`;

    return {
      insight: {
        venture: req.venture,
        topic: req.topic,
        summary,
        matches,
        gaps,
      },
    };
  }
}

// ---------- Anthropic ----------

/**
 * Loose typing for the Anthropic SDK so this file type-checks even when the
 * package isn't installed yet (it's a runtime dep). The constructor is given
 * the real type via dynamic import.
 */
type AnthropicClient = {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      system?: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    }): Promise<{
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    }>;
  };
};

export interface AnthropicSynthesizerOpts {
  apiKey: string;
  model?: string;
  /** Top-K candidates to send the model. Hard input-token cap. */
  topK?: number;
  /** Output token cap. */
  maxOutputTokens?: number;
  /** Tier price USD; calls projected to exceed 10x this are downgraded. */
  tierPriceUsd?: number;
  /** Fallback used if budget is exceeded or the API errors. */
  fallback?: Synthesizer;
}

/**
 * Rough-and-conservative cost model. Claude Sonnet 4.5 list price as of
 * 2026-04: $3 / 1M input tokens, $15 / 1M output tokens. Numbers are
 * intentionally pessimistic, this is a budget guard.
 */
const COST_PER_INPUT_TOKEN_USD = 3 / 1_000_000;
const COST_PER_OUTPUT_TOKEN_USD = 15 / 1_000_000;

function estimateTokens(text: string): number {
  // ~4 chars/token rule-of-thumb, rounded up.
  return Math.ceil(text.length / 4);
}

function buildPrompt(req: InsightRequest, top: Grant[]): { system: string; user: string } {
  const system = [
    "You are a grants analyst for AGFarms / Bucket Foundation.",
    "Given a venture slug, a topic, and a small list of candidate grants,",
    "rank them by fit and produce a concise summary + per-grant rationale.",
    "Output STRICT JSON only, no markdown fences, matching this shape:",
    `{
  "summary": "string (2-3 sentences)",
  "matches": [
    {"grant_id": "string", "fit_score": 0.0-1.0, "rationale": "1 sentence"}
  ],
  "gaps": ["string", ...]
}`,
    "Use only grant_ids from the candidates list. Order matches by fit_score desc.",
  ].join("\n");

  const candidatesBlock = top
    .map((g, i) => {
      return [
        `[${i}] id=${g.id}`,
        `  funder: ${g.funder}`,
        `  title: ${g.title}`,
        `  topics: ${g.topics.join(", ")}`,
        `  deadline: ${g.deadline ?? "rolling"}`,
        `  amount: ${g.amount_min_usd ?? "?"}–${g.amount_max_usd ?? "?"} USD`,
        `  eligibility: ${g.eligibility}`,
        `  summary: ${g.summary.slice(0, 400)}`,
      ].join("\n");
    })
    .join("\n\n");

  const user = `venture: ${req.venture}\ntopic: ${req.topic}\n\ncandidates:\n${candidatesBlock}`;
  return { system, user };
}

interface ModelOutput {
  summary: string;
  matches: Array<{ grant_id: string; fit_score: number; rationale: string }>;
  gaps: string[];
}

function parseModelJson(text: string): ModelOutput {
  // Strip code fences if the model adds them despite instructions.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned);
  if (typeof parsed !== "object" || parsed == null) throw new Error("non-object JSON");
  if (typeof parsed.summary !== "string") throw new Error("missing summary");
  if (!Array.isArray(parsed.matches)) throw new Error("missing matches");
  if (!Array.isArray(parsed.gaps)) parsed.gaps = [];
  return parsed as ModelOutput;
}

export class AnthropicSynthesizer implements Synthesizer {
  private client: AnthropicClient | null = null;
  private readonly model: string;
  private readonly topK: number;
  private readonly maxOutputTokens: number;
  private readonly tierPriceUsd: number;
  private readonly fallback: Synthesizer;
  private readonly apiKey: string;

  constructor(opts: AnthropicSynthesizerOpts) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? "claude-sonnet-4-5";
    this.topK = opts.topK ?? 8;
    this.maxOutputTokens = opts.maxOutputTokens ?? 600;
    this.tierPriceUsd = opts.tierPriceUsd ?? 0.002;
    this.fallback = opts.fallback ?? new MockSynthesizer();
  }

  private async getClient(): Promise<AnthropicClient> {
    if (this.client) return this.client;
    // Dynamic import so the package is only required at runtime when used.
    const mod: { default: new (cfg: { apiKey: string }) => AnthropicClient } = await import(
      "@anthropic-ai/sdk"
    );
    this.client = new mod.default({ apiKey: this.apiKey });
    return this.client;
  }

  async synthesize(req: InsightRequest, candidates: Grant[]): Promise<SynthesisResult> {
    // 1. Pre-rank by keyword overlap and trim to topK to bound input tokens.
    const ranked = rankByOverlap(req, candidates);
    const top = ranked.slice(0, this.topK).map((r) => r.g);

    // No candidates → cheap fallback, no API call.
    if (top.length === 0) {
      return this.fallback.synthesize(req, candidates);
    }

    const { system, user } = buildPrompt(req, top);
    const promptText = system + "\n\n" + user;
    const promptSha = createHash("sha256").update(promptText).digest("hex");

    // 2. Budget guard. Reject (and downgrade) when projected cost is >10x tier price.
    const inputTokensEst = estimateTokens(promptText);
    const projectedCost =
      inputTokensEst * COST_PER_INPUT_TOKEN_USD +
      this.maxOutputTokens * COST_PER_OUTPUT_TOKEN_USD;
    const budgetCap = this.tierPriceUsd * 10;
    if (projectedCost > budgetCap) {
      console.warn(
        `[AnthropicSynthesizer] budget exceeded: projected $${projectedCost.toFixed(5)} > cap $${budgetCap.toFixed(5)} ` +
          `(input_tokens_est=${inputTokensEst}, model=${this.model}); downgrading to MockSynthesizer.`,
      );
      return this.fallback.synthesize(req, candidates);
    }

    // 3. Call the model.
    let modelOut: ModelOutput;
    try {
      const client = await this.getClient();
      const resp = await client.messages.create({
        model: this.model,
        max_tokens: this.maxOutputTokens,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = resp.content
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("\n")
        .trim();
      if (!text) throw new Error("empty model response");
      modelOut = parseModelJson(text);
    } catch (e) {
      console.error(
        `[AnthropicSynthesizer] model call failed (${(e as Error).message}); downgrading to MockSynthesizer.`,
      );
      return this.fallback.synthesize(req, candidates);
    }

    // 4. Assemble InsightResponse, backfill deadline + days_until from the
    // candidate set. The model can hallucinate ids; filter to known ones.
    const candById = new Map(candidates.map((g) => [g.id, g]));
    const matches = modelOut.matches
      .filter((m) => candById.has(m.grant_id))
      .map((m) => {
        const g = candById.get(m.grant_id)!;
        const score = Math.max(0, Math.min(1, Number(m.fit_score) || 0));
        return {
          grant_id: m.grant_id,
          fit_score: Number(score.toFixed(3)),
          rationale: String(m.rationale ?? "").slice(0, 500),
          deadline: g.deadline,
          days_until_deadline: daysUntil(g.deadline),
        };
      });

    const provenance: SynthesisProvenance = {
      model_id: this.model,
      candidates: top.map((g, i) => ({
        id: g.id,
        score: Number((ranked[i]?.score ?? 0).toFixed(3)),
      })),
      prompt_sha256: promptSha,
      ts: new Date().toISOString(),
    };

    return {
      insight: {
        venture: req.venture,
        topic: req.topic,
        summary: modelOut.summary,
        matches,
        gaps: modelOut.gaps,
      },
      provenance,
    };
  }
}

/** Selector. Reads INSIGHT_SYNTH (default `mock`). */
export function synthesizerFromEnv(tierPriceUsd: number): {
  synth: Synthesizer;
  label: string;
} {
  const which = (process.env.INSIGHT_SYNTH ?? "mock").toLowerCase();
  if (which === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      console.warn(
        "[grants-gateway] INSIGHT_SYNTH=anthropic but ANTHROPIC_API_KEY is unset; using MockSynthesizer.",
      );
      return { synth: new MockSynthesizer(), label: "mock (anthropic requested, no key)" };
    }
    const synth = new AnthropicSynthesizer({
      apiKey: key,
      model: process.env.ANTHROPIC_MODEL,
      tierPriceUsd,
    });
    return { synth, label: `anthropic (${process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5"})` };
  }
  return { synth: new MockSynthesizer(), label: "mock" };
}
