/**
 * POST /api/academy/tutor, a GROUNDED, SAFE Socratic tutor for a single Bucket
 * Academy concept (epic bkt-jh0, bead bkt-5jj).
 *
 * In a teaching product a confidently-wrong explanation installs a durable
 * misconception, the worst possible failure mode. This route therefore
 * implements the S1, S7 AI-tutor safety floor from
 * `learning/research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md` §6, with the
 * non-negotiables enforced IN CODE at the route level (S7:
 * verification is external, layered, and enforced in code rather than in the system
 * prompt). It mirrors the conventions of the sibling `generate` route
 * (`@anthropic-ai/sdk`, `ANTHROPIC_API_KEY`, `NextResponse.json`, the `bad()`
 * helper, capped tokens, 503 when the key is absent, the Viatika-metering TODO).
 *
 * S1 RAG grounding to verified content. The tutor answers ONLY from the
 * grounding the client sends, the atom's own verified lesson material
 * (title, summary, lesson, depths, equation) plus the titles of its graph
 * neighbours. No parametric free-generation of facts. The grounding IS the
 * corpus the Academy already ships and renders to the learner.
 * S2 Tight context + abstain on weak retrieval. If the question is outside the
 * grounded material the tutor must SAY SO and point to what IS covered,
 * rather than guess. Empty grounding => 400 (no safe answer is possible);
 * over-long grounding is rejected.
 * S3 Closed-set, validated citations, zero free-generation. The model may
 * cite only from a closed allow-list (the atom's real `sources` +
 * `resources`). Every citation the model emits is validated against that
 * allow-list at render time; unresolvable ones are dropped (never shown).
 * Citations are returned as a separate, server-validated array, the client
 * renders links only from it, never by parsing model prose.
 * S4 Uncertainty signalling + abstention as the safe failure mode. The model
 * returns an explicit `confidence` ("high"|"medium"|"low") and an
 * `abstained` flag; abstention is encouraged and rewarded.
 * S5 (eval suite), spec'd by People; the structured JSON contract here
 * (atomic answer + claim→citation mapping + abstain flag) is exactly what a
 * FActScore/citation-validity suite consumes. Wiring the CI block is a
 * follow-up bead; the response shape is ready for it today.
 * S6 Anti-sycophancy + per-turn re-check. The system prompt instructs the
 * tutor to CORRECT a wrong premise rather than build on it, and the
 * grounding (S1) is re-supplied on every turn, so each turn is
 * independently grounded (pedagogical harm compounds over a session).
 * S7 Never trust model confidence as a safety signal, citation validation,
 * grounding-presence checks, the abstain gate, rate limiting and a
 * fail-safe abstaining fallback on unparseable output all live in code.
 *
 * Request body (JSON):
 * { atomId, branch, question, history?, grounding }
 * grounding = { title, summary, lesson?, equation?, depths?, sources?,
 * resources?, requires?(titles), unlocks?(titles) }
 * Response (200): { reply, confidence, abstained, citations:[{label,url?}], grounded_on }
 * Errors: 400 bad input · 429 rate-limited · 502 tutor_failed · 503 not configured.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { selectProvider } from "./provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Current as of 2026-06. Sonnet is enough for a grounded Socratic turn, the
// grounding does the factual work, and this keeps per-turn cost low.
const MODEL = "claude-sonnet-4-5";

// ---- LLM provider seam --------------------------------------------------
// DEFAULT is the LOCAL GPU LLM via an OpenAI-compatible endpoint. In prod that
// is the bearer-protected auth-shim + cloudflared tunnel in front of a
// llama.cpp server running Qwen2.5-Coder-7B-Instruct on Gian's AMD RX 7700S
// (Vulkan GPU offload, ~13 tok/s, the system Ollama could only do CPU because
// its build ships no Vulkan/ROCm backend). Set LLM_BASE_URL (e.g.
// https://<tunnel>/v1) + LLM_API_KEY (the shim bearer) to enable it. The hosted
// Anthropic path stays as an ALTERNATIVE when ANTHROPIC_API_KEY is set and
// LLM_BASE_URL is not, same S1, S7 safety runs in code either way. If neither is
// configured => 503 (dark). All factual safety is enforced in code (S7), so the
// model behind the seam is interchangeable.
const LLM_BASE_URL = process.env.LLM_BASE_URL?.replace(/\/+$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "qwen2.5-coder-7b";
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_S || 20) * 1000;

// Provider selection lives in ./provider (testable; Next.js forbids non-handler
// exports from a route file). Local LLM is the default; Anthropic is the fallback.

/** Call the local OpenAI-compatible chat endpoint. Returns the assistant text,
 * or throws an error tagged with `.status` for the caller's catch (mirrors the
 * Anthropic error contract so the existing 401/429/502 handling applies). */
async function callLocalLLM(
  system: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const resp = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        stream: false,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const err = new Error(`local LLM HTTP ${resp.status}`) as Error & { status?: number };
      err.status = resp.status;
      throw err;
    }
    const data = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return (data.choices?.[0]?.message?.content || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

// Tight caps, a Socratic turn is a hint or a question (keeps
// responses tight, bounds cost, and limits the blast radius of any error).
const MAX_TOKENS = 700;
const MAX_QUESTION_CHARS = 1000;
const MAX_HISTORY_TURNS = 8;
const MAX_GROUNDING_CHARS = 20000; // reject absurd payloads (S2: tight context)

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

// ---- crude in-memory per-IP rate limit (best-effort; resets on cold start) ----
// Serverless instances are ephemeral, so this is a best-effort soft guard;
// a durable limiter belongs in the Viatika metering layer (TODO below).
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20; // 20 tutor turns / minute / IP
const rlBuckets = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rlBuckets.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  hits.push(now);
  rlBuckets.set(ip, hits);
  if (rlBuckets.size > 5000) {
    rlBuckets.forEach((v, k) => {
      if (v.every((t) => now - t >= RL_WINDOW_MS)) rlBuckets.delete(k);
    });
  }
  return hits.length > RL_MAX;
}

interface Resource {
  label?: string;
  url?: string;
}
interface Grounding {
  title?: string;
  summary?: string;
  lesson?: string;
  equation?: string;
  depths?: Record<string, string>;
  sources?: string[];
  resources?: Resource[];
  requires?: string[];
  unlocks?: string[];
}
interface TutorBody {
  atomId?: string;
  branch?: string;
  question?: string;
  history?: Array<{ role: "user" | "tutor"; content: string }>;
  grounding?: Grounding;
}
interface TutorModelOut {
  reply: string;
  confidence: "high" | "medium" | "low";
  abstained: boolean;
  citations: string[];
}

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

/** Build the closed-set citation allow-list from the atom's real sources +
 * resources (the ONLY set the model may cite from, S3). */
function buildCitationAllowList(g: Grounding): {
  display: string[];
  byKey: Map<string, { label: string; url?: string }>;
} {
  const display: string[] = [];
  const byKey = new Map<string, { label: string; url?: string }>();
  const add = (label: string, url?: string) => {
    const clean = (label || "").trim();
    if (!clean) return;
    if (!byKey.has(norm(clean))) {
      byKey.set(norm(clean), { label: clean, url });
      display.push(clean);
    }
  };
  (g.sources || []).forEach((s) => add(String(s)));
  (g.resources || []).forEach((r) => add(String(r?.label || ""), r?.url));
  return { display, byKey };
}

/** Validate model-emitted citations against the closed set (S3). Drops anything
 * that does not resolve, fabricated references never reach the client. */
function validateCitations(
  emitted: unknown,
  byKey: Map<string, { label: string; url?: string }>,
): Array<{ label: string; url?: string }> {
  if (!Array.isArray(emitted)) return [];
  const out: Array<{ label: string; url?: string }> = [];
  const seen = new Set<string>();
  for (const c of emitted) {
    const hit = byKey.get(norm(String(c)));
    if (hit && !seen.has(norm(hit.label))) {
      seen.add(norm(hit.label));
      out.push(hit);
    }
  }
  return out;
}

/** Assemble the grounding context block, only verified atom material goes in. */
function groundingBlock(g: Grounding, allow: string[]): string {
  const parts: string[] = [];
  if (g.title) parts.push(`CONCEPT: ${g.title}`);
  if (g.summary) parts.push(`SUMMARY: ${g.summary}`);
  if (g.equation) parts.push(`KEY EQUATION (LaTeX): ${g.equation}`);
  if (g.depths) {
    for (const [k, v] of Object.entries(g.depths)) {
      if (v && typeof v === "string") {
        const label = k === "eli5" ? "PLAIN" : k === "core" ? "CORE" : k.toUpperCase();
        parts.push(`EXPLANATION (${label}): ${v}`);
      }
    }
  }
  if (g.lesson) parts.push(`LESSON: ${g.lesson}`);
  if (g.requires?.length)
    parts.push(`PREREQUISITES (already-covered concepts): ${g.requires.join("; ")}`);
  if (g.unlocks?.length)
    parts.push(`LEADS TO (downstream concepts): ${g.unlocks.join("; ")}`);
  parts.push(
    `ALLOWED CITATIONS (the ONLY strings you may place in "citations" — copy them verbatim, cite nothing else): ${
      allow.length ? allow.map((a) => `"${a}"`).join(" | ") : "(none available)"
    }`,
  );
  return parts.join("\n\n");
}

const SYSTEM = `You are the Bucket Academy tutor — a Socratic guide for a single concept. You are grounded: you may use ONLY the GROUNDING material provided in the user message, which is the verified lesson content for this exact concept. The grounding is your single source of truth.

HARD RULES (a confidently-wrong explanation installs a lasting misconception — that is the worst thing you can do):
1. Answer ONLY from the GROUNDING. Never introduce facts, numbers, derivations, history, or claims that are not supported by the grounding. Do not use outside knowledge to assert facts.
2. If the learner's question is outside the grounded material (a different concept, a fact the grounding doesn't cover, or something you cannot support from it), DO NOT guess. Set "abstained": true, say plainly that this concept's material doesn't cover it, and point them to what IS covered here (or note a prerequisite/downstream concept by name if listed).
3. Be Socratic: prefer a guiding question or a hint that makes the learner do the retrieval, over just handing them the answer. Do not be a crutch. When they have a wrong premise, gently CORRECT it from the grounding — never build on a mistake, never just agree to be agreeable.
4. NEVER invent citations. Put in "citations" only exact strings copied from the ALLOWED CITATIONS list, and only when you actually leaned on that source. If none apply, return an empty list.
5. Signal uncertainty honestly. Use "confidence": "high" only when the grounding directly and fully supports your reply; "medium" when partial; "low" when you are stretching the grounding (and consider abstaining instead).
6. Keep it tight — a few sentences. One idea or one question per turn.

Respond with ONLY a JSON object, no markdown fences, of exactly this shape:
{"reply": string, "confidence": "high"|"medium"|"low", "abstained": boolean, "citations": string[]}`;

function clampHistory(
  history: TutorBody["history"],
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY_TURNS)
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      role: m.role === "tutor" ? ("assistant" as const) : ("user" as const),
      content: String(m.content).slice(0, 2000),
    }));
}

function parseModelJson(text: string): TutorModelOut | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof obj.reply !== "string") return null;
    const conf =
      obj.confidence === "high" || obj.confidence === "low" ? obj.confidence : "medium";
    return {
      reply: obj.reply,
      confidence: conf,
      abstained: obj.abstained === true,
      citations: Array.isArray(obj.citations) ? obj.citations : [],
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  if (rateLimited(ip)) {
    return bad(429, "Too many tutor requests. Slow down a moment.");
  }

  let body: TutorBody;
  try {
    body = (await req.json()) as TutorBody;
  } catch {
    return bad(400, "Request body must be JSON.");
  }

  const question = (body?.question || "").trim();
  if (!question) return bad(400, "A question is required.");
  if (question.length > MAX_QUESTION_CHARS)
    return bad(400, `Question exceeds ${MAX_QUESTION_CHARS} characters.`);

  // S1/S2: refuse to run ungrounded. No grounding => no safe answer is possible.
  const g = body?.grounding;
  const hasGrounding =
    !!g &&
    !!(g.title || g.summary || g.lesson || g.equation || (g.depths && Object.keys(g.depths).length));
  if (!hasGrounding) {
    return bad(400, "Tutor requires the concept's grounding material. None was provided.");
  }
  if (JSON.stringify(g).length > MAX_GROUNDING_CHARS) {
    return bad(400, "Grounding payload too large.");
  }

  // 503 when NO provider is configured, same graceful contract as the generate
  // route. Local LLM (LLM_BASE_URL) is the default; Anthropic is the fallback.
  // The UI reads this and shows a "tutor not enabled yet" state without breaking.
  const provider = selectProvider();
  if (!provider) {
    return bad(503, "Tutor isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");
  }

  // TODO(bkt-jh0): route this spend through Viatika via `@/lib/meter` meterUsage()
  //, pre-charge an estimate and true-up from response.usage. Org standard is that
  // ALL metered AI spend flows through the Viatika vendor API (CLAUDE.md #6). Left
  // as a hook for v1, matching the sibling generate route.

  const { display: allowList, byKey } = buildCitationAllowList(g!);
  const context = groundingBlock(g!, allowList);

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...clampHistory(body.history),
    {
      role: "user",
      content: `GROUNDING (verified material for this concept — your ONLY source of truth):\n\n${context}\n\n---\nLEARNER QUESTION: ${question}`,
    },
  ];

  let text = "";
  try {
    if (provider === "local") {
      // Default path: local GPU LLM via OpenAI-compatible endpoint. Same SYSTEM
      // prompt + grounding; all S1, S7 validation below runs identically.
      text = await callLocalLLM(SYSTEM, messages);
    } else {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages: messages as Anthropic.MessageParam[],
      });
      text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    }
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string; name?: string };
    if (err?.status === 401) return bad(503, "Tutor credentials are invalid on the server.");
    if (err?.status === 429) return bad(429, "Rate limited — please try again in a moment.");
    // Timeout / network error to the local LLM, or any other failure: fail safe.
    return bad(502, "Tutor request failed. Please try again.");
  }

  const parsed = parseModelJson(text);
  if (!parsed) {
    // Fail safe (S7): if we can't trust the structure, we don't trust the content.
    return NextResponse.json(
      {
        reply:
          "I had trouble forming a grounded answer. Try rephrasing, or ask about a specific part of this concept.",
        confidence: "low",
        abstained: true,
        citations: [],
        grounded_on: g!.title || body.atomId || null,
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }

  // S3: validate every citation against the closed set; drop fabrications.
  const citations = validateCitations(parsed.citations, byKey);

  return NextResponse.json(
    {
      reply: parsed.reply,
      confidence: parsed.confidence,
      abstained: parsed.abstained,
      citations, // [{label,url?}], server-validated, closed-set only
      grounded_on: g!.title || body.atomId || null,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
