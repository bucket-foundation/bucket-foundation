import type { CanonStore } from "../canon";
import { excerptUrl, searchCanon, searchParams } from "../core/search";
import { OPEN_LICENCE_KINDS } from "../pack/canon";
import type { ChatOptions, Message, Provider, Tool, ToolCall } from "./types";

export const CANON_TOOL_LIMIT = 8;
export const MAX_TOOL_ROUNDS = 4;
export const WITHHELD = "withheld: this passage's licence does not allow sending it to a hosted model; cite it by title and link";

export const CANON_TOOLS: Tool[] = [
  {
    name: "canon_search",
    description: "Search the Bucket canon on this computer. Returns claim ids, titles, links and short excerpts.",
    schema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: CANON_TOOL_LIMIT }, branch: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "canon_get_claim",
    description: "Read one canon claim by id with its evidence passages, each with title, link and licence.",
    schema: { type: "object", properties: { claim_id: { type: "integer" } }, required: ["claim_id"] },
  },
  {
    name: "cite",
    description: "Return the citation and the Math Contract tag for a canon claim id. Use it for every claim you state.",
    schema: { type: "object", properties: { claim_id: { type: "integer" } }, required: ["claim_id"] },
  },
];

export const CANON_SYSTEM = [
  "You are the Bucket agent. Answer from the Bucket canon using the canon tools.",
  "Search first, read the claims you use, and cite each one with the cite tool's tag.",
  "Every quantitative claim carries a Math Contract tag: [bm:Name] for BucketMath, or the [empirical: source, date, command] tag that cite returns.",
  "If a passage is withheld, cite it by title and link and do not guess its text.",
].join(" ");

export function sendable(licenceKind: string | null | undefined, local: boolean): boolean {
  return local || (typeof licenceKind === "string" && OPEN_LICENCE_KINDS.has(licenceKind));
}

const gate = (text: string, licenceKind: string | null | undefined, local: boolean) => (sendable(licenceKind, local) ? text : WITHHELD);

function claimId(input: unknown): number | null {
  const raw = (input as { claim_id?: unknown } | null)?.claim_id;
  const n = typeof raw === "string" && /^\d{1,9}$/.test(raw) ? Number(raw) : raw;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

function search(store: CanonStore, input: unknown, local: boolean) {
  const o = (input ?? {}) as { query?: unknown; limit?: unknown; branch?: unknown };
  if (typeof o.query !== "string" || !o.query.trim()) return { error: "canon_search needs a query" };
  const n = typeof o.limit === "string" && /^\d{1,3}$/.test(o.limit) ? Number(o.limit) : o.limit;
  const limit = typeof n === "number" && Number.isInteger(n) ? Math.min(Math.max(n, 1), CANON_TOOL_LIMIT) : CANON_TOOL_LIMIT;
  const branch = typeof o.branch === "string" && store.branches().includes(o.branch) ? o.branch : undefined;
  const found = searchCanon(store, searchParams(o.query, { limit, branch }), { matchedOnly: true });
  if (!found.ok) return { error: found.message };
  return {
    results: found.results.map((r) => {
      const licence_kind = store.excerptLicence(r.id);
      return { claim_id: r.id, title: r.title, branch: r.branch, url: r.url, licence_kind, excerpt: gate(r.excerpt, licence_kind, local), evidence_count: r.evidence };
    }),
  };
}

function getClaim(store: CanonStore, input: unknown, local: boolean) {
  const id = claimId(input);
  const e = id === null ? null : store.excerpt(id);
  if (!e) return { error: "no canon claim with that id" };
  return {
    claim_id: e.id,
    title: e.title,
    branch: e.branch,
    url: excerptUrl(e),
    source: e.source,
    licence_kind: e.licence_kind,
    text: gate(e.text, e.licence_kind, local),
    evidence: e.evidence.map((p) => ({ title: p.title, author: p.author, url: p.url, kind: p.kind, licence_kind: p.licence_kind, text: gate(p.text, p.licence_kind, local) })),
  };
}

function cite(store: CanonStore, input: unknown) {
  const id = claimId(input);
  const e = id === null ? null : store.excerpt(id);
  if (!e) return { error: "no canon claim with that id" };
  const url = excerptUrl(e);
  const sources = e.evidence.map((p) => ({ title: p.title, url: p.url }));
  return {
    claim_id: e.id,
    citation: `${e.title}. Bucket canon, ${url}`,
    tag: `[empirical: ${e.title} ${url}, canon ${store.version() ?? "unknown"}, bkt canon show ${e.id}]`,
    source: e.source,
    sources,
  };
}

export function runCanonTool(store: CanonStore, call: ToolCall, local: boolean): string {
  const out =
    call.name === "canon_search" ? search(store, call.input, local) : call.name === "canon_get_claim" ? getClaim(store, call.input, local) : call.name === "cite" ? cite(store, call.input) : { error: `no tool named ${call.name}` };
  return JSON.stringify(out);
}

export interface CanonChatResult {
  text: string;
  messages: Message[];
  calls: ToolCall[];
}

export async function canonChat(provider: Provider, store: CanonStore, messages: Message[], opts: ChatOptions = {}): Promise<CanonChatResult> {
  const history = [...messages];
  const calls: ToolCall[] = [];
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    let text = "";
    const pending: ToolCall[] = [];
    const tools = round < MAX_TOOL_ROUNDS ? CANON_TOOLS : [];
    for await (const ev of provider.chat(history, tools, { system: CANON_SYSTEM, ...opts })) {
      if (ev.type === "text") text += ev.text;
      else if (ev.type === "tool_call") pending.push(ev.call);
    }
    if (!pending.length) {
      history.push({ role: "assistant", content: text });
      return { text, messages: history, calls };
    }
    history.push({ role: "assistant", content: text, toolCalls: pending });
    for (const call of pending) {
      calls.push(call);
      history.push({ role: "tool", toolCallId: call.id, content: runCanonTool(store, call, provider.local) });
    }
  }
  return { text: "", messages: history, calls };
}
