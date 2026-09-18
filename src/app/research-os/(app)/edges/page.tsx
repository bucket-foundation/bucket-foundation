"use client";

/**
 * /research-os/edges, the LLM-proposed prerequisite edge review queue
 * (bkt-ros ros-13, task item 3). Lists every pending graph.edge_proposals
 * row (GET /api/research-os/edges) queued by
 * scripts/research-os/ingest/infer-edges-llm.ts, and lets a signed-in
 * reviewer approve or reject each one (POST /api/research-os/edges). See
 * src/app/api/research-os/edges/route.ts for the full decision rules.
 *
 * The decompose-further queue (learning/research-os/PRIMES.md, slice 2)
 * reviews here too: its proposals group under the node they decompose,
 * the most at stake first, and the base ideas the graph lacks list above
 * them from /api/research-os/node-proposals.
 *
 * Auth reuses the same Supabase email-OTP flow as
 * src/app/research-os/review/page.tsx and workspace/page.tsx. Being
 * signed in is necessary but NOT sufficient: the API gates on
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS
 * allowlist, so a signed-in non-reviewer sees a 403 here instead of the
 * queue.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import SignInGate from "@/components/auth/SignInGate";

interface EdgeProposal {
  id: string;
  fromSlug: string;
  fromTitle: string;
  toSlug: string;
  toTitle: string;
  branch: string;
  confidence: number;
  confidenceSource: string;
  agreement: boolean;
  justification: string;
  secondaryJustification: string | null;
  model: string;
  promptHash: string;
  createdAt: string;
  fromBranch: string | null;
  impact: number;
  crossBranch: boolean;
}

interface NodeProposal {
  id: string;
  key: string;
  title: string;
  branch: string;
  justification: string;
  baseMatch: string | null;
  model: string;
  namedBy: { slug: string; title: string }[];
}

type Source = "all" | "prime_decompose_llm" | "inferred_llm";

export default function ResearchOsEdgesPage() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);

  const [proposals, setProposals] = useState<EdgeProposal[] | null>(null);
  const [nodeProposals, setNodeProposals] = useState<NodeProposal[] | null>(null);
  const [source, setSource] = useState<Source>("all");
  const [queueError, setQueueError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }: { data: { session: { access_token: string } | null } }) => {
      if (data.session) setToken(data.session.access_token);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event: string, session: { access_token: string } | null) => {
      setToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const authHeaders = useCallback((): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {}), [token]);

  const loadQueue = useCallback(async () => {
    if (!token) return;
    setQueueError(null);
    try {
      const qs = source === "all" ? "" : `?source=${source}`;
      const [res, nodeRes] = await Promise.all([
        fetch(`/api/research-os/edges${qs}`, { headers: authHeaders() }),
        fetch("/api/research-os/node-proposals", { headers: authHeaders() }),
      ]);
      const data = await res.json();
      if (!res.ok) {
        setQueueError(res.status === 403 ? "forbidden" : data.error || "load_failed");
        setProposals(null);
        setNodeProposals(null);
        return;
      }
      setProposals(data.proposals);
      const nodeData = await nodeRes.json();
      setNodeProposals(nodeRes.ok ? nodeData.proposals : []);
    } catch {
      setQueueError("network_error");
    }
  }, [token, authHeaders, source]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);


  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
    setProposals(null);
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    const reason = (reasons[id] || "").trim();
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch("/api/research-os/edges", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id, decision, reason: reason || undefined }),
      });
      const data = await res.json();
      setNotice(res.ok ? `${decision === "approved" ? "Approved" : "Rejected"}.` : data.error || "decision_failed");
      if (res.ok) loadQueue();
    } finally {
      setBusyId(null);
    }
  }

  async function decideNode(id: string, decision: "approved" | "rejected") {
    const reason = (reasons[id] || "").trim();
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch("/api/research-os/node-proposals", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ id, decision, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setNotice(data.error || "decision_failed");
      else if (decision === "approved")
        setNotice(`Created ${data.nodeSlug}; ${data.queuedEdges} proposal(s) from it wait below.`);
      else setNotice("Rejected.");
      if (res.ok) loadQueue();
    } finally {
      setBusyId(null);
    }
  }

  // Proposals grouped under the node they decompose, the group with the most at stake first.
  const groups = useMemo(() => {
    const by = new Map<string, { toSlug: string; toTitle: string; branch: string; impact: number; items: EdgeProposal[] }>();
    for (const p of proposals ?? []) {
      if (!by.has(p.toSlug)) by.set(p.toSlug, { toSlug: p.toSlug, toTitle: p.toTitle, branch: p.branch, impact: p.impact, items: [] });
      const g = by.get(p.toSlug)!;
      g.items.push(p);
      g.impact = Math.max(g.impact, p.impact);
    }
    return Array.from(by.values()).sort((a, b) => b.impact - a.impact || a.toTitle.localeCompare(b.toTitle));
  }, [proposals]);

  return (
    <main>
      <div className="max-w-[900px] mx-0 px-0 py-0">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / edges, LLM-proposed prerequisite review · "}
          <Link href="/research-os/review" className="underline decoration-[color:var(--gold)] underline-offset-4">
            teacher review queue
          </Link>
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          edge review queue
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          Candidate prerequisite edges waiting on a reviewer. Two proposers feed it: lexical inference, which asks two
          independently phrased prompts, and the decompose-further queue, where one model names what a node rests on
          and a second model checks each pair (learning/research-os/PRIMES.md). A row the second check did not confirm
          carries a low confidence and the same-section-conflation risk in learning/research-os/PLAN-REVISION-2.md
          section 2c: read the justification before approving. Approving writes the edge at confidence 0.95, source
          &ldquo;teacher.&rdquo; Gated to the RESEARCH_OS_REVIEWER_EMAILS allowlist.
        </p>

        <SignInGate signedIn={Boolean(token)} />

        {notice && <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]">{notice}</p>}

        {queueError === "forbidden" && token && (
          <p className="mt-6 text-[13px] text-red-700">
            This account is not on the reviewer allowlist. Ask an admin to add your email to
            RESEARCH_OS_REVIEWER_EMAILS (see src/lib/research-os/reviewer.ts).
          </p>
        )}
        {queueError && queueError !== "forbidden" && <p className="mt-6 text-[13px] text-red-700">Could not load the queue ({queueError}).</p>}

        {nodeProposals && nodeProposals.length > 0 && (
          <section className="mt-8 flex flex-col gap-3" aria-labelledby="missing-primes">
            <h2 id="missing-primes" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
              missing primes ({nodeProposals.length})
            </h2>
            <p className="text-[13px] text-[color:var(--basalt-2)] max-w-2xl">
              Base ideas the model named while decomposing nodes, the most-named first. Approving one adds it to the graph as a
              tier-0 concept and queues a proposal from it to every node that named it.
            </p>
            {nodeProposals.map((n) => (
              <div key={n.id} className="p-4 bg-[color:var(--bone)]">
                <div className="text-[13px] text-[color:var(--basalt)]">
                  <strong>{n.title}</strong> &middot; {n.branch} &middot; named by {n.namedBy.length}
                  {n.baseMatch && <span className="ml-2 px-1.5 py-0.5 text-[11px] small-caps bg-[color:var(--gold)]/40">{n.baseMatch}</span>}
                </div>
                <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">{n.justification}</p>
                <p className="mt-1 text-[12px] text-[color:var(--basalt-2)]">
                  {n.namedBy.slice(0, 6).map((t) => t.title).join(" · ")}
                  {n.namedBy.length > 6 && ` · and ${n.namedBy.length - 6} more`}
                </p>
                <input
                  value={reasons[n.id] || ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [n.id]: e.target.value }))}
                  placeholder="optional note"
                  className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
                />
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => decideNode(n.id, "approved")}
                    disabled={busyId === n.id}
                    className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                  >
                    add to graph
                  </button>
                  <button
                    onClick={() => decideNode(n.id, "rejected")}
                    disabled={busyId === n.id}
                    className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                  >
                    reject
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {proposals && (
          <section className="mt-8 flex flex-col gap-3" aria-labelledby="pending-edges">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id="pending-edges" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
                pending proposals ({proposals.length})
              </h2>
              <div className="flex gap-2 text-[12px] small-caps" role="group" aria-label="proposer">
                {(
                  [
                    ["all", "all"],
                    ["prime_decompose_llm", "decomposition"],
                    ["inferred_llm", "lexical inference"],
                  ] as [Source, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSource(key)}
                    aria-pressed={source === key}
                    className={`px-2 py-0.5 border border-[color:var(--hairline)] ${source === key ? "bg-[color:var(--gold)]" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {proposals.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
            {groups.map((g) => (
              <div key={g.toSlug} className="p-4 bg-[color:var(--bone)]">
                <div className="text-[14px] text-[color:var(--basalt)]">
                  <Link href={`/research-os/n/${g.toSlug}`} className="underline decoration-[color:var(--gold)] underline-offset-4">
                    <strong>{g.toTitle}</strong>
                  </Link>{" "}
                  &middot; {g.branch}
                  {g.impact > 0 && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; {g.impact} node(s) rest on it</span>}
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {g.items.map((p) => (
                    <div key={p.id} className="pl-3 border-l-2 border-[color:var(--hairline)]">
                      <div className="text-[13px] text-[color:var(--basalt)]">
                        rests on <strong>{p.fromTitle}</strong>
                        {p.fromBranch && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; {p.fromBranch}</span>}
                        {p.crossBranch && <span className="ml-2 px-1.5 py-0.5 text-[11px] small-caps bg-[color:var(--aegean-deep)]/15">across branches</span>}
                      </div>
                      <div className="mt-1 text-[12px] text-[color:var(--basalt-2)]">
                        confidence {p.confidence.toFixed(2)} ({p.confidenceSource})
                        {!p.agreement && <span className="text-red-700"> &middot; not confirmed by the second check, needs closer review</span>}
                        {" · "}
                        {p.model} &middot; prompt {p.promptHash.slice(0, 8)}
                      </div>
                      <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">{p.justification}</p>
                      {p.secondaryJustification && (
                        <p className="mt-1 text-[12px] text-[color:var(--basalt-2)] italic">second check: {p.secondaryJustification}</p>
                      )}
                      <input
                        value={reasons[p.id] || ""}
                        onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                        placeholder="optional note"
                        className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
                      />
                      <div className="mt-2 flex gap-3">
                        <button
                          onClick={() => decide(p.id, "approved")}
                          disabled={busyId === p.id}
                          className="px-3 py-1 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
                        >
                          approve
                        </button>
                        <button
                          onClick={() => decide(p.id, "rejected")}
                          disabled={busyId === p.id}
                          className="px-3 py-1 text-[12px] small-caps border border-[color:var(--hairline)] disabled:opacity-50"
                        >
                          reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
