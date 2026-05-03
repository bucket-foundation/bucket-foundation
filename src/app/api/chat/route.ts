// src/app/api/chat/route.ts
// POST /api/chat — streaming SSE proxy to Anthropic with feed402 tool use.
// All grounding goes through feed402 citation envelopes — no ungrounded answers.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { meterUsage } from "@/lib/meter";
import {
  searchPubmed,
  searchOpenalex,
  searchPatents,
  getCitationEnvelope,
} from "@/lib/feed402-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Current as of 2026-05.
const MODEL = "claude-sonnet-4-5";

// Conservative pre-charge — refunded/topped up after the real token count
// comes back from the SDK. TODO(bkt-q7k+4): post-call true-up.
const ESTIMATED_COST_USD = 0.02;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "feed402_search_pubmed",
    description:
      "Search PubMed via the feed402 protocol. Returns citation envelopes (snippets + canonical URLs only — no full text). Use for biomedical primary research.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "feed402_search_openalex",
    description:
      "Search OpenAlex via feed402. Use for cross-disciplinary primary literature (math, physics, CS, etc.).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "feed402_search_patents",
    description:
      "Search the patent corpus via feed402. Use for prior art, applied science, engineering disclosures.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "feed402_get_citation_envelope",
    description:
      "Fetch the full feed402 citation envelope for a canonical URL. Use to confirm a source before citing it.",
    input_schema: {
      type: "object",
      properties: {
        canonical_url: { type: "string" },
      },
      required: ["canonical_url"],
    },
  },
];

interface ChatBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

async function runTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  // TODO(bkt-q7k+5): real fetch via feed402-client (currently stubbed network).
  try {
    if (name === "feed402_search_pubmed") {
      return await searchPubmed(String(input.query), Number(input.limit) || 5);
    }
    if (name === "feed402_search_openalex") {
      return await searchOpenalex(String(input.query), Number(input.limit) || 5);
    }
    if (name === "feed402_search_patents") {
      return await searchPatents(String(input.query), Number(input.limit) || 5);
    }
    if (name === "feed402_get_citation_envelope") {
      return await getCitationEnvelope(String(input.canonical_url));
    }
  } catch (err) {
    return { error: (err as Error).message, tool: name, input };
  }
  return { error: "unknown_tool", tool: name };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId =
    (session?.user as { id?: string } | undefined)?.id ||
    session?.user?.email ||
    null;
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const meter = await meterUsage(userId, ESTIMATED_COST_USD);
  if (!meter.ok) {
    return new Response(
      JSON.stringify({ error: "metering_failed", reason: meter.reason }),
      { status: 402, headers: { "content-type": "application/json" } },
    );
  }

  const body = (await req.json()) as ChatBody;
  if (!body?.messages?.length) {
    return new Response(JSON.stringify({ error: "no_messages" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const anthropic = new Anthropic({ apiKey });

  const SYSTEM = `You are bucket.foundation's research chat. Every claim you make about primary research MUST be backed by a feed402 citation envelope returned from one of your tools. If you cannot find a citation, say so explicitly. Never fabricate sources. Honor the canon thesis: foundations only — axioms, real math, rules, laws, principles, primary derivations.`;

  // We stream via a manual SSE bridge so we can fan tool_use events
  // back into the model in a loop. Multiple turns: model -> tools -> model.
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const conversation: Anthropic.MessageParam[] = body.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Cap at 4 tool-use rounds to avoid runaway loops.
        for (let turn = 0; turn < 4; turn++) {
          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 2048,
            system: SYSTEM,
            tools: TOOLS,
            messages: conversation,
          });

          for (const block of response.content) {
            if (block.type === "text") {
              send("text", { delta: block.text });
            } else if (block.type === "tool_use") {
              send("tool_use", { name: block.name, input: block.input });
            }
          }

          if (response.stop_reason !== "tool_use") {
            send("done", { stop_reason: response.stop_reason });
            controller.close();
            return;
          }

          // Push assistant turn + tool results, then loop.
          conversation.push({ role: "assistant", content: response.content });
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type === "tool_use") {
              const result = await runTool(
                block.name,
                block.input as Record<string, unknown>,
              );
              send("tool_result", { name: block.name, result });
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            }
          }
          conversation.push({ role: "user", content: toolResults });
        }

        send("done", { stop_reason: "max_turns" });
        controller.close();
      } catch (err) {
        send("error", { message: (err as Error).message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
