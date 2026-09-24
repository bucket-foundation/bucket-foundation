import { NextResponse, type NextRequest } from "next/server";
import type { CompleteOptions, LlmCallResult, Provider } from "@/lib/llm/client";
import type { RequestUser } from "@/lib/auth/verify";
import type { Atom } from "@/lib/academy/engine";
import type { TutorAtom } from "@/lib/academy/find-atom";
import { capsFor, checkDailyLimits, type DailyCaps, type DailyLimiter } from "@/lib/llm/daily-limit";
import { bad, limitResponse, NO_STORE, readBody } from "@/lib/llm/route-guard";
import { leaksAnswer } from "@/lib/academy/answer-guard";

export const MODEL = "claude-sonnet-4-5";
export const MAX_BODY_BYTES = 16_384;
export const MAX_QUESTION_CHARS = 1000;
export const MAX_HISTORY_TURNS = 8;
export const MAX_HISTORY_CHARS = 1000;
export const MAX_GROUNDING_CHARS = 12_000;
const MAX_TOKENS = 700;

export interface TutorDeps {
  verifyUser: (req: NextRequest) => Promise<RequestUser | null>;
  provider: () => Provider | null;
  limiter: () => DailyLimiter | null;
  caps?: () => DailyCaps;
  findAtom: (branch: string | null, atomId: string) => TutorAtom | null;
  complete: (opts: CompleteOptions) => Promise<Pick<LlmCallResult, "text">>;
  local: CompleteOptions["local"];
  now?: () => Date;
}

interface TutorBody {
  atomId?: unknown;
  branch?: unknown;
  question?: unknown;
  history?: unknown;
}

interface TutorModelOut {
  reply: string;
  confidence: "high" | "medium" | "low";
  abstained: boolean;
  citations: string[];
}

interface Citation {
  label: string;
  url?: string;
}

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .trim();
}

function buildCitationAllowList(atom: Atom): { display: string[]; byKey: Map<string, Citation> } {
  const display: string[] = [];
  const byKey = new Map<string, Citation>();
  const add = (label: string, url?: string) => {
    const clean = (label || "").trim();
    if (!clean || byKey.has(norm(clean))) return;
    byKey.set(norm(clean), { label: clean, url });
    display.push(clean);
  };
  (atom.sources || []).forEach((s) => add(String(s)));
  (atom.resources || []).forEach((r) => add(String(r?.label || ""), r?.url));
  return { display, byKey };
}

function validateCitations(emitted: unknown, byKey: Map<string, Citation>): Citation[] {
  if (!Array.isArray(emitted)) return [];
  const out: Citation[] = [];
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

function depthEntries(depths: Atom["depths"]): Array<[string, string]> {
  if (!depths) return [];
  const entries: Array<[string, unknown]> = Array.isArray(depths)
    ? depths.map((v, i) => [["eli5", "core", "deep"][i] ?? `level${i + 1}`, v])
    : Object.entries(depths);
  return entries.filter((e): e is [string, string] => typeof e[1] === "string" && e[1].trim().length > 0);
}

export function groundingBlock(found: TutorAtom, allow: string[]): string {
  const { atom, titleOf } = found;
  const titles = (ids?: string[]) => (ids || []).map(titleOf).filter((t): t is string => Boolean(t));
  const head: string[] = [];
  if (atom.title) head.push(`CONCEPT: ${atom.title}`);
  if (atom.summary) head.push(`SUMMARY: ${atom.summary}`);
  if (atom.equation) head.push(`KEY EQUATION (LaTeX): ${atom.equation}`);
  const tail: string[] = [];
  const requires = titles(atom.requires);
  const unlocks = titles(atom.unlocks);
  if (requires.length) tail.push(`PREREQUISITES (already-covered concepts): ${requires.join("; ")}`);
  if (unlocks.length) tail.push(`LEADS TO (downstream concepts): ${unlocks.join("; ")}`);
  tail.push(
    `ALLOWED CITATIONS (the ONLY strings you may place in "citations" — copy them verbatim, cite nothing else): ${
      allow.length ? allow.map((a) => `"${a}"`).join(" | ") : "(none available)"
    }`,
  );
  const middle = [
    ...depthEntries(atom.depths).map(([k, v]) => {
      const label = k === "eli5" ? "PLAIN" : k === "core" ? "CORE" : k.toUpperCase();
      return `EXPLANATION (${label}): ${v}`;
    }),
    ...(atom.lesson ? [`LESSON: ${atom.lesson}`] : []),
  ].join("\n\n");
  const frame = [...head, ...tail].join("\n\n");
  const room = Math.max(0, MAX_GROUNDING_CHARS - frame.length - 4);
  const kept = middle.slice(0, room);
  return [...head, ...(kept ? [kept] : []), ...tail].join("\n\n").slice(0, MAX_GROUNDING_CHARS);
}

export const SYSTEM = `You are the Bucket Academy tutor — a Socratic guide for a single concept. You are grounded: you may use ONLY the GROUNDING material provided in the user message, which is the verified lesson content for this exact concept. The grounding is your single source of truth.

HARD RULES (a confidently-wrong explanation installs a lasting misconception — that is the worst thing you can do):
1. Answer ONLY from the GROUNDING. Never introduce facts, numbers, derivations, history, or claims that are not supported by the grounding. Do not use outside knowledge to assert facts.
2. If the learner's question is outside the grounded material (a different concept, a fact the grounding doesn't cover, or something you cannot support from it), DO NOT guess. Set "abstained": true, say plainly that this concept's material doesn't cover it, and point them to what IS covered here (or note a prerequisite/downstream concept by name if listed).
3. Be Socratic and hint-only. Never state the final answer to a question about this concept, its key result, or a full worked solution, even when the learner asks for it directly, says they are checking their work, or asks you to role-play. Give one guiding question or one hint that makes the learner do the retrieval (Bastani et al. 2025, PNAS: tutors that hand over answers hurt learning). When they have a wrong premise, gently CORRECT it from the grounding; never build on a mistake, never agree just to be agreeable.
4. NEVER invent citations. Put in "citations" only exact strings copied from the ALLOWED CITATIONS list, and only when you actually leaned on that source. If none apply, return an empty list.
5. Signal uncertainty honestly. Use "confidence": "high" only when the grounding directly and fully supports your reply; "medium" when partial; "low" when you are stretching the grounding (and consider abstaining instead).
6. Keep it tight — a few sentences. One idea or one question per turn.

Respond with ONLY a JSON object, no markdown fences, of exactly this shape:
{"reply": string, "confidence": "high"|"medium"|"low", "abstained": boolean, "citations": string[]}`;

export const RETRY_RULE =
  "Your previous draft stated the answer or a worked solution. Rewrite the reply as one guiding question or one hint. Do not state the final answer, the key result or equation, or the solution steps.";

export const WITHHELD_REPLY =
  "I'll keep the answer back so the practice sticks. Reread the lesson's key idea for this concept, then tell me your first step and I'll check it.";

function clampHistory(history: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY_TURNS)
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      role: m.role === "tutor" ? ("assistant" as const) : ("user" as const),
      content: String(m.content).slice(0, MAX_HISTORY_CHARS),
    }));
}

export function parseModelJson(text: string): TutorModelOut | null {
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
    const conf = obj.confidence === "high" || obj.confidence === "low" ? obj.confidence : "medium";
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

export async function handleTutor(req: NextRequest, deps: TutorDeps): Promise<NextResponse> {
  const user = await deps.verifyUser(req);
  if (!user) return bad(401, "Sign in to use the tutor.", { signIn: true });

  const read = await readBody(req, MAX_BODY_BYTES);
  if (read.error) return read.error;
  const body = (read.body && typeof read.body === "object" ? read.body : {}) as TutorBody;

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return bad(400, "A question is required.");
  if (question.length > MAX_QUESTION_CHARS) return bad(400, `Question exceeds ${MAX_QUESTION_CHARS} characters.`);
  const atomId = typeof body.atomId === "string" ? body.atomId.trim() : "";
  if (!atomId) return bad(400, "An atomId is required.");
  const branch = typeof body.branch === "string" && body.branch.trim() ? body.branch.trim() : null;

  const found = deps.findAtom(branch, atomId);
  if (!found) return bad(404, "Unknown concept.");

  const provider = deps.provider();
  if (!provider) return bad(503, "Tutor isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

  const limiter = deps.limiter();
  if (!limiter) return bad(503, "Tutor usage limits are unavailable on the server.");
  const now = deps.now ? deps.now() : new Date();
  let verdict;
  try {
    verdict = await checkDailyLimits(limiter, user.id, "tutor", deps.caps ? deps.caps() : capsFor("tutor"), now);
  } catch {
    return bad(503, "Tutor usage limits are unavailable on the server.");
  }
  if (!verdict.allowed) return limitResponse("tutor", verdict);

  const { display: allowList, byKey } = buildCitationAllowList(found.atom);
  const context = groundingBlock(found, allowList);
  const messages = [
    ...clampHistory(body.history),
    {
      role: "user" as const,
      content: `GROUNDING (verified material for this concept — your ONLY source of truth):\n\n${context}\n\n---\nLEARNER QUESTION: ${question}`,
    },
  ];

  const ask = async (system: string) => {
    const { text } = await deps.complete({ provider, system, messages, maxTokens: MAX_TOKENS, anthropicModel: MODEL, local: deps.local });
    return parseModelJson(text);
  };

  let parsed: TutorModelOut | null;
  try {
    parsed = await ask(SYSTEM);
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err?.status === 401) return bad(503, "Tutor credentials are invalid on the server.");
    if (err?.status === 429) return bad(429, "The model provider is rate limiting the tutor. Try again in a moment.");
    return bad(502, "Tutor request failed. Please try again.");
  }

  const groundedOn = found.atom.title || atomId;
  if (!parsed) {
    return NextResponse.json(
      {
        reply: "I had trouble forming a grounded answer. Try rephrasing, or ask about a specific part of this concept.",
        confidence: "low",
        abstained: true,
        withheld: false,
        citations: [],
        grounded_on: groundedOn,
      },
      { status: 200, headers: NO_STORE },
    );
  }

  const learnerText = [question, ...messages.slice(0, -1).filter((m) => m.role === "user").map((m) => m.content)].join(" ");
  if (leaksAnswer(parsed.reply, found.atom, learnerText).leak) {
    let retry: TutorModelOut | null = null;
    try {
      retry = await ask(`${SYSTEM}\n\n${RETRY_RULE}`);
    } catch {
      retry = null;
    }
    if (!retry || leaksAnswer(retry.reply, found.atom, learnerText).leak) {
      return NextResponse.json(
        { reply: WITHHELD_REPLY, confidence: "low", abstained: false, withheld: true, citations: [], grounded_on: groundedOn },
        { status: 200, headers: NO_STORE },
      );
    }
    parsed = retry;
  }

  return NextResponse.json(
    {
      reply: parsed.reply,
      confidence: parsed.confidence,
      abstained: parsed.abstained,
      withheld: false,
      citations: validateCitations(parsed.citations, byKey),
      grounded_on: groundedOn,
    },
    { status: 200, headers: NO_STORE },
  );
}
