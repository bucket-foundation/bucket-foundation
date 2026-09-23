import { NextRequest, NextResponse } from "next/server";
import { complete, localLlmConfig, selectProvider } from "@/lib/llm/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-5";

const LOCAL = localLlmConfig(20);

const MAX_TOKENS = 700;
const MAX_QUESTION_CHARS = 1000;
const MAX_HISTORY_TURNS = 8;
const MAX_GROUNDING_CHARS = 20000;

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
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

  const provider = selectProvider();
  if (!provider) {
    return bad(503, "Tutor isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");
  }

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
    ({ text } = await complete({
      provider,
      system: SYSTEM,
      messages,
      maxTokens: MAX_TOKENS,
      anthropicModel: MODEL,
      local: LOCAL,
    }));
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string; name?: string };
    if (err?.status === 401) return bad(503, "Tutor credentials are invalid on the server.");
    if (err?.status === 429) return bad(429, "Rate limited — please try again in a moment.");
    return bad(502, "Tutor request failed. Please try again.");
  }

  const parsed = parseModelJson(text);
  if (!parsed) {
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

  const citations = validateCitations(parsed.citations, byKey);

  return NextResponse.json(
    {
      reply: parsed.reply,
      confidence: parsed.confidence,
      abstained: parsed.abstained,
      citations,
      grounded_on: g!.title || body.atomId || null,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
