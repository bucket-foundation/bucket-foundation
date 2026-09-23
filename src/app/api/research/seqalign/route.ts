import { reject, toolRoute } from "@/lib/research-tools/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, POST, OPTIONS } = toolRoute({
  tool: "seqalign",
  prepare: (body) => {
    const seqA = typeof body.seq_a === "string" ? body.seq_a.trim() : "";
    if (seqA.toLowerCase() === "demo") return body;
    const seqB = typeof body.seq_b === "string" ? body.seq_b.trim() : "";
    if (!seqA || !seqB) return reject('provide two sequences (seq_a, seq_b), or use "demo"');
    return body;
  },
});
