/**
 * POST /api/research-os/workspace, the four AI actions Locate, Quote, Check,
 * Organize (bkt-ros, task item 4), scoped to the Phase 0 seeded subgraph.
 * Reuses /api/academy/tutor's pattern (grounded, citation-validated,
 * abstains, provider seam, fail-safe JSON parsing) rather than a fifth
 * integration: see src/lib/research-os/llm.ts.
 *
 * The AI never writes the learner's claim or synthesis (task item 4's hard
 * requirement). This is enforced two ways, matching the tutor's S7 "verified
 * in code, not just the prompt" floor:
 *   1. A closed action allow-list: only "locate" | "quote" | "check" |
 *      "organize" are accepted; anything else is 400, before any model call.
 *   2. Locate and Quote never call a model at all (retrieval only, per
 *      RESEARCH-OS-K12-SYSTEM-REVIEW.md section 3's workspace table). Check
 *      grades the learner's OWN explanation against grounding, it never
 *      emits a corrected version of it. Organize only relabels the
 *      learner's OWN input into named slots; its system prompt forbids
 *      adding any fact not already present in that input, and the client
 *      renders Organize's output as an editable draft, never auto-submitted.
 *
 * Request: { action, ...action-specific fields }
 *   locate:   { query, branch? }
 *   quote:    { nodeId }
 *   check:    { nodeId, explanation }
 *   organize: { claim, evidenceNotes, sourceNotes }
 *
 * Auth: Authorization: Bearer <supabase access token>, required for all four
 * (locate/quote are retrieval-only but still identity-scoped for Phase 0
 * simplicity and to keep the same rate-limit boundary as check/organize).
 */
import { NextRequest, NextResponse } from "next/server";
import { callGroundedModel, parseModelJson, selectProvider } from "@/lib/research-os/llm";
import { onCheckResult } from "@/lib/research-os/stages";
import type { Stage } from "@/lib/research-os/types";
import { configured, graphService, verifyLearner, recordEvidence } from "@/lib/research-os/db";
import type { Provenance } from "@/lib/research-os/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

const MAX_CHECK_TOKENS = 500;
const MAX_ORGANIZE_TOKENS = 500;
const MAX_EXPLANATION_CHARS = 2000;

// Crude in-memory per-user rate limit, mirroring /api/academy/tutor. Best
// effort only (serverless instances are ephemeral); a durable limiter
// belongs in the Viatika metering layer (same TODO the tutor route carries).
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
const rlBuckets = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (rlBuckets.get(key) || []).filter((t) => now - t < RL_WINDOW_MS);
  hits.push(now);
  rlBuckets.set(key, hits);
  return hits.length > RL_MAX;
}

function citationLabel(node: { title: string; provenance?: Provenance }): string {
  const p = node.provenance;
  if (!p) return node.title;
  const who = p.author ? `${p.author}` : p.publisher || "";
  const when = p.year ? ` (${p.year})` : "";
  const what = p.title ? `. ${p.title}.` : "";
  return `${who}${when}${what}`.trim() || node.title;
}

interface WorkspaceBody {
  action?: "locate" | "quote" | "check" | "organize";
  query?: string;
  branch?: string;
  nodeId?: string;
  explanation?: string;
  claim?: string;
  evidenceNotes?: string;
  sourceNotes?: string;
}

export async function POST(req: NextRequest) {
  if (!configured()) return bad(503, "research_os_unavailable");

  const learnerId = await verifyLearner(req);
  if (!learnerId) return bad(401, "unauthorized");
  if (rateLimited(learnerId)) return bad(429, "Too many workspace requests. Slow down a moment.");

  let body: WorkspaceBody;
  try {
    body = (await req.json()) as WorkspaceBody;
  } catch {
    return bad(400, "bad_request");
  }

  const svc = graphService();

  switch (body.action) {
    case "locate": {
      const query = (body.query || "").trim().toLowerCase();
      if (!query) return bad(400, "query is required");
      const branch = body.branch || "02-physics";
      const { data, error } = await svc
        .from("nodes")
        .select("id,slug,title,kind,tier,summary,provenance")
        .eq("branch", branch);
      if (error) return bad(500, "locate_failed");
      const hits = (data || [])
        .filter(
          (n: { title: string; summary: string | null }) =>
            n.title.toLowerCase().includes(query) || (n.summary || "").toLowerCase().includes(query),
        )
        .slice(0, 10)
        .map((n: { id: string; slug: string; title: string; kind: string; tier: number; summary: string | null; provenance: Provenance }) => ({
          nodeId: n.id,
          slug: n.slug,
          title: n.title,
          kind: n.kind,
          tier: n.tier,
          summary: n.summary,
          citation: citationLabel(n),
        }));
      return NextResponse.json({ results: hits }, { headers: { "cache-control": "no-store" } });
    }

    case "quote": {
      const nodeId = (body.nodeId || "").trim();
      if (!nodeId) return bad(400, "nodeId is required");
      const { data: node, error } = await svc
        .from("nodes")
        .select("id,slug,title,summary,provenance")
        .eq("id", nodeId)
        .maybeSingle();
      if (error || !node) return bad(404, "node_not_found");
      const p = (node.provenance || {}) as Provenance;
      return NextResponse.json(
        {
          nodeId: node.id,
          // Phase 0 has no full source-text corpus ingested, so the
          // "exact span" Quote returns is the seeded, human-authored
          // summary the node itself carries, paired with its real
          // citation. Full passage-level source extraction is Phase 1
          // ingestion work (review gap analysis, "Standards and textbook
          // ingestion parser").
          quotable_span: node.summary,
          citation: citationLabel({ title: node.title, provenance: p }),
          source: { author: p.author, year: p.year, title: p.title, publisher: p.publisher, doi: p.doi, url: p.url, license: p.license },
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    case "check": {
      const nodeId = (body.nodeId || "").trim();
      const explanation = (body.explanation || "").trim();
      if (!nodeId) return bad(400, "nodeId is required");
      if (!explanation) return bad(400, "explanation is required");
      if (explanation.length > MAX_EXPLANATION_CHARS) return bad(400, "explanation too long");

      const { data: node, error: nodeErr } = await svc
        .from("nodes")
        .select("id,title,summary,provenance")
        .eq("id", nodeId)
        .maybeSingle();
      if (nodeErr || !node) return bad(404, "node_not_found");

      const { data: prereqEdges } = await svc.from("edges").select("from_id").eq("to_id", nodeId).eq("kind", "prerequisite");
      const prereqIds = (prereqEdges || []).map((e: { from_id: string }) => e.from_id);
      let prereqSummaries: { title: string; summary: string | null }[] = [];
      if (prereqIds.length) {
        const { data: prereqNodes } = await svc.from("nodes").select("title,summary").in("id", prereqIds);
        prereqSummaries = prereqNodes || [];
      }

      const allowLabel = citationLabel(node);
      const grounding = [
        `CONCEPT: ${node.title}`,
        `GROUNDING TRUTH: ${node.summary}`,
        ...prereqSummaries.map((p) => `PREREQUISITE (already covered): ${p.title} -- ${p.summary}`),
        `ALLOWED CITATION (copy verbatim if you cite anything, cite nothing else): "${allowLabel}"`,
      ].join("\n\n");

      const provider = selectProvider();
      if (!provider) return bad(503, "Check isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

      const system = `You are the Check tool in Bucket's Research OS workspace. You NEVER write or correct the learner's explanation, you only judge it against the GROUNDING.

HARD RULES:
1. Judge ONLY against the GROUNDING TRUTH and its listed PREREQUISITEs. Never use outside knowledge to decide the verdict.
2. If the explanation is unrelated to the grounding or you cannot judge it from the grounding, set "abstained": true and "result": "unknown".
3. "result" is "support" (the explanation is consistent with and grounded in the material), "contradiction" (it conflicts with the material), or "unknown" (not enough to tell).
4. NEVER rewrite the learner's explanation. Return a short "feedback" string: if support, name what makes it grounded; if contradiction or unknown, ask ONE guiding question or name what part of the grounding to revisit -- never supply the corrected sentence.
5. Cite only the exact ALLOWED CITATION string if you reference the source, and only if you leaned on it. Empty citations array if not.
6. "confidence" is "high" only when the grounding directly and fully settles the verdict; "medium" partial; "low" when stretching (consider abstaining instead).

Respond with ONLY a JSON object, no markdown fences:
{"result": "support"|"contradiction"|"unknown", "confidence": "high"|"medium"|"low", "abstained": boolean, "feedback": string, "citations": string[]}`;

      let text: string;
      try {
        text = await callGroundedModel(
          provider,
          system,
          [{ role: "user", content: `${grounding}\n\n---\nLEARNER'S EXPLANATION: ${explanation}` }],
          MAX_CHECK_TOKENS,
        );
      } catch (e: unknown) {
        const err = e as { status?: number };
        if (err?.status === 401) return bad(503, "Check credentials are invalid on the server.");
        if (err?.status === 429) return bad(429, "Rate limited, try again in a moment.");
        return bad(502, "check_failed");
      }

      interface CheckOut {
        result: "support" | "contradiction" | "unknown";
        confidence: "high" | "medium" | "low";
        abstained: boolean;
        feedback: string;
        citations: string[];
      }
      const parsed = parseModelJson<CheckOut>(text);
      const safe: CheckOut = parsed ?? {
        result: "unknown",
        confidence: "low",
        abstained: true,
        feedback: "I had trouble grounding a verdict. Try rephrasing your explanation.",
        citations: [],
      };
      const citations = (safe.citations || []).filter((c) => c.trim() === allowLabel);

      const { data: existingState } = await svc
        .from("learner_node_state")
        .select("stage")
        .eq("learner_id", learnerId)
        .eq("node_id", nodeId)
        .maybeSingle();
      const currentStage = ((existingState?.stage as Stage | undefined) ?? "access") as Stage;
      const transition = onCheckResult(currentStage, {
        result: safe.result,
        confidence: safe.confidence,
        abstained: safe.abstained,
      });
      await recordEvidence(learnerId, nodeId, transition.nextStage, transition.event as unknown as Record<string, unknown>);

      return NextResponse.json(
        {
          result: safe.result,
          confidence: safe.confidence,
          abstained: safe.abstained,
          feedback: safe.feedback,
          citations,
          stage: transition.nextStage,
        },
        { headers: { "cache-control": "no-store" } },
      );
    }

    case "organize": {
      const claim = (body.claim || "").trim();
      const evidenceNotes = (body.evidenceNotes || "").trim();
      const sourceNotes = (body.sourceNotes || "").trim();
      if (!claim && !evidenceNotes && !sourceNotes) return bad(400, "at least one field is required");

      const provider = selectProvider();
      if (!provider) return bad(503, "Organize isn't enabled yet (set LLM_BASE_URL or ANTHROPIC_API_KEY).");

      const system = `You are the Organize tool. You relabel the learner's OWN notes into a claim/evidence/sources scaffold. You NEVER add a fact, number, or claim that is not already present in their notes, you only sort and label what they wrote.

HARD RULES:
1. "claim" is the learner's claim text, copied or lightly trimmed for clarity, never rewritten in substance.
2. "evidence" is an array of the distinct evidence points found in their evidence notes, each copied or lightly trimmed, never invented.
3. "sources" is an array of the distinct sources found in their source notes, each copied or lightly trimmed, never invented.
4. If a field is empty in the input, return an empty result for it and do not fabricate content to fill it.
5. Never generate a new sentence that is not a light trim of something the learner wrote.

Respond with ONLY a JSON object, no markdown fences:
{"claim": string, "evidence": string[], "sources": string[]}`;

      let text: string;
      try {
        text = await callGroundedModel(
          provider,
          system,
          [
            {
              role: "user",
              content: `CLAIM NOTES: ${claim || "(none)"}\n\nEVIDENCE NOTES: ${evidenceNotes || "(none)"}\n\nSOURCE NOTES: ${sourceNotes || "(none)"}`,
            },
          ],
          MAX_ORGANIZE_TOKENS,
        );
      } catch {
        return bad(502, "organize_failed");
      }

      interface OrganizeOut {
        claim: string;
        evidence: string[];
        sources: string[];
      }
      const parsed = parseModelJson<OrganizeOut>(text);
      const safe: OrganizeOut = parsed ?? {
        claim: claim,
        evidence: evidenceNotes ? [evidenceNotes] : [],
        sources: sourceNotes ? [sourceNotes] : [],
      };

      return NextResponse.json(safe, { headers: { "cache-control": "no-store" } });
    }

    default:
      return bad(400, "action must be one of locate, quote, check, organize");
  }
}
