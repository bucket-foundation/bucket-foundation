/**
 * Insight synthesizer — turns (venture, topic, candidate grants) into a
 * fit analysis with rationale + gap detection.
 *
 * v0.1 ships a deterministic mock implementation: scoring is keyword
 * overlap between (topic + venture slug) and grant.topics + summary.
 * That's enough to demo the envelope shape end-to-end.
 *
 * TODO(bkt-???, P2): swap MockSynthesizer for OpenAISynthesizer or
 * AnthropicSynthesizer reading INSIGHT_MODEL from env. Keep the interface.
 */

import type { Grant, InsightRequest, InsightResponse } from "../types.js";

export interface Synthesizer {
  synthesize(req: InsightRequest, candidates: Grant[]): Promise<InsightResponse>;
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

export class MockSynthesizer implements Synthesizer {
  async synthesize(req: InsightRequest, candidates: Grant[]): Promise<InsightResponse> {
    const wantTokens = [...tokens(req.topic), ...tokens(req.venture)];

    const scored = candidates
      .map((g) => {
        const haystack = [g.title, g.summary, ...g.topics, g.eligibility].join(" ");
        const score = overlap(wantTokens, tokens(haystack));
        const norm = Math.min(1, score / Math.max(3, wantTokens.length));
        return { g, score: norm };
      })
      .sort((a, b) => b.score - a.score);

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
      venture: req.venture,
      topic: req.topic,
      summary,
      matches,
      gaps,
    };
  }
}
