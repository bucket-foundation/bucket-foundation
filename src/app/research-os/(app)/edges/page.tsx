"use client";

/**
 * /research-os/edges, the review of what the graph's makeup should be:
 * proposed prerequisite and rests-on edges from lexical inference and the
 * decompose-further queue, missing base ideas, and nodes called
 * irreducible (learning/research-os/PRIMES.md). The rules live in
 * src/lib/research-os/inference/review-actions.ts behind
 * /api/research-os/edges, /api/research-os/node-proposals, and
 * /api/research-os/irreducible.
 *
 * Signing in is necessary and not sufficient: the APIs gate on
 * src/lib/research-os/reviewer.ts, so a signed-in non-reviewer sees a 403.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import SignInGate from "@/components/auth/SignInGate";

type Verification = "confirmed" | "refuted" | "unchecked" | null;
type Kind = "derives_from" | "prerequisite";

interface EdgeProposal {
  id: string;
  fromSlug: string;
  fromTitle: string;
  fromSummary: string | null;
  fromBranch: string | null;
  toSlug: string;
  toTitle: string;
  branch: string;
  confidence: number;
  confidenceSource: string;
  agreement: boolean;
  verification: Verification;
  origin: "proposer" | "missing_matched" | "base_idea" | null;
  justification: string;
  secondaryJustification: string | null;
  model: string;
  promptHash: string;
  impact: number;
  crossBranch: boolean;
  inCycle: boolean;
  refd: number | null;
  priority: number;
}

interface NodeProposal {
  id: string;
  key: string;
  title: string;
  branch: string;
  branchToCreate: string;
  justification: string;
  summary: string | null;
  aliases: string[];
  possibleDuplicates: { slug: string; title: string; similarity: number }[];
  baseMatch: string | null;
  model: string;
  namedBy: { slug: string; title: string; reason: string | null }[];
}

interface Irreducible {
  id: string;
  slug: string;
  title: string;
  branch: string | null;
  summary: string | null;
  justification: string;
  model: string;
  dependents: number;
}

type Source = "all" | "prime_decompose_llm" | "inferred_llm";

const VERIFICATION_TEXT: Record<string, { text: string; className: string }> = {
  confirmed: { text: "the second check agreed", className: "text-[color:var(--aegean-deep)]" },
  refuted: { text: "the second check disagreed, read both reasons", className: "text-red-700" },
  unchecked: { text: "not checked by a second model yet", className: "text-[color:var(--basalt-3)]" },
};

/** How to read a RefD score: which article's neighbourhood leans on the other. */
const REFD_TEXT = (x: number) =>
  x > 0.02
    ? "the target's linked articles refer to this factor more than the reverse, which supports it"
    : x < -0.02
      ? "this factor's linked articles refer to the target more, which points the other way"
      : "the links lean neither way";

const ORIGIN_TEXT: Record<string, string> = {
  missing_matched: "The proposer called this idea missing; it already has this node.",
  base_idea: "Queued from a base idea a reviewer added.",
};

async function readJson(res: Response): Promise<Record<string, any>> {
  try {
    return await res.json();
  } catch {
    return { error: `http_${res.status}` };
  }
}

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
  const [branches, setBranches] = useState<string[]>([]);
  const [irreducible, setIrreducible] = useState<Irreducible[] | null>(null);
  const [source, setSource] = useState<Source>("all");
  const [queueError, setQueueError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [kinds, setKinds] = useState<Record<string, Kind>>({});
  const [edits, setEdits] = useState<Record<string, { title: string; summary: string; branch: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string | null; text: string } | null>(null);

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
      const [edgeRes, nodeRes, irrRes] = await Promise.all([
        fetch(`/api/research-os/edges${qs}`, { headers: authHeaders() }),
        fetch("/api/research-os/node-proposals", { headers: authHeaders() }),
        fetch("/api/research-os/irreducible", { headers: authHeaders() }),
      ]);
      const [edgeData, nodeData, irrData] = await Promise.all([readJson(edgeRes), readJson(nodeRes), readJson(irrRes)]);
      if (!edgeRes.ok) {
        setQueueError(edgeRes.status === 403 ? "forbidden" : edgeData.error || "load_failed");
        setProposals(null);
        setNodeProposals(null);
        setIrreducible(null);
        return;
      }
      setProposals(edgeData.proposals);
      if (nodeRes.ok) {
        setNodeProposals(nodeData.proposals);
        setBranches(nodeData.branches ?? []);
      } else setQueueError(`missing primes: ${nodeData.error || "load_failed"}`);
      if (irrRes.ok) setIrreducible(irrData.proposals);
      else setQueueError(`irreducible: ${irrData.error || "load_failed"}`);
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
    setNodeProposals(null);
    setIrreducible(null);
  }

  async function post(path: string, body: Record<string, unknown>) {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
    return { res, data: await readJson(res) };
  }

  async function decideEdge(p: EdgeProposal, decision: "approved" | "rejected") {
    setBusyId(p.id);
    setNotice(null);
    try {
      const kind = kinds[p.id] ?? defaultKind(p);
      const { res, data } = await post("/api/research-os/edges", { id: p.id, decision, kind: decision === "approved" ? kind : undefined, reason: notes[p.id]?.trim() || undefined });
      if (res.status === 409)
        setNotice({ id: p.id, text: `${p.fromTitle} already rests on ${p.toTitle}, so this edge would close a cycle. Reject it, or approve the other direction instead.` });
      else if (!res.ok) setNotice({ id: p.id, text: `Could not save (${data.error || res.status}).` });
      else {
        setProposals((list) => (list ?? []).filter((x) => x.id !== p.id));
        setNotice({
          id: null,
          text:
            decision === "approved"
              ? `Approved: ${p.toTitle} ${kind === "derives_from" ? "rests on" : "comes after"} ${p.fromTitle}.${data.warning ? ` Warning: ${data.warning}.` : ""}`
              : `Rejected: ${p.fromTitle} for ${p.toTitle}.`,
        });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function decideNode(n: NodeProposal, decision: "approved" | "rejected") {
    const e = editOf(n);
    if (decision === "approved" && !e.summary.trim()) {
      setNotice({ id: n.id, text: "Write a one-sentence definition first: it becomes the node's summary." });
      return;
    }
    setBusyId(n.id);
    setNotice(null);
    try {
      const { res, data } = await post("/api/research-os/node-proposals", {
        id: n.id,
        decision,
        reason: notes[n.id]?.trim() || undefined,
        ...(decision === "approved" ? { title: e.title, summary: e.summary, branch: e.branch } : {}),
      });
      if (!res.ok) setNotice({ id: n.id, text: `Could not save (${data.error || res.status}).` });
      else if (decision === "approved") {
        setNotice({
          id: null,
          text: `Added ${data.nodeSlug} at tier ${data.nodeTier}; ${data.queuedEdges} proposal(s) from it wait below.${data.warning ? ` Warning: ${data.warning}.` : ""}`,
        });
        await loadQueue();
      } else {
        setNodeProposals((list) => (list ?? []).filter((x) => x.id !== n.id));
        setNotice({ id: null, text: `Rejected: ${n.title}.` });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function decideIrreducible(r: Irreducible, decision: "confirmed" | "rejected") {
    setBusyId(r.id);
    setNotice(null);
    try {
      const { res, data } = await post("/api/research-os/irreducible", { id: r.id, decision, reason: notes[r.id]?.trim() || undefined });
      if (!res.ok) setNotice({ id: r.id, text: `Could not save (${data.error || res.status}).` });
      else {
        setIrreducible((list) => (list ?? []).filter((x) => x.id !== r.id));
        setNotice({ id: null, text: decision === "confirmed" ? `${r.title} is a prime by review.` : `${r.title} goes back to the decompose-further queue.` });
      }
    } finally {
      setBusyId(null);
    }
  }

  const defaultKind = (p: EdgeProposal): Kind => (p.confidenceSource === "prime_decompose_llm" ? "derives_from" : "prerequisite");
  const editOf = (n: NodeProposal) => edits[n.id] ?? { title: n.title, summary: n.summary ?? "", branch: n.branchToCreate };

  // Proposals grouped under the node they decompose, the group with the most at stake first.
  const groups = useMemo(() => {
    const by = new Map<string, { toSlug: string; toTitle: string; branch: string; impact: number; priority: number; items: EdgeProposal[] }>();
    for (const p of proposals ?? []) {
      if (!by.has(p.toSlug)) by.set(p.toSlug, { toSlug: p.toSlug, toTitle: p.toTitle, branch: p.branch, impact: p.impact, priority: p.priority, items: [] });
      const g = by.get(p.toSlug)!;
      g.items.push(p);
      g.priority = Math.max(g.priority, p.priority);
      g.impact = Math.max(g.impact, p.impact);
    }
    return Array.from(by.values()).sort((a, b) => b.priority - a.priority || a.toTitle.localeCompare(b.toTitle));
  }, [proposals]);

  const noteInput = (id: string) => (
    <input
      value={notes[id] || ""}
      onChange={(e) => setNotes((r) => ({ ...r, [id]: e.target.value }))}
      placeholder="optional note"
      aria-label="optional note"
      className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60"
    />
  );
  const inlineNotice = (id: string) => (notice && notice.id === id ? <p className="mt-2 text-[12px] text-red-700">{notice.text}</p> : null);
  const nodeLink = (slug: string, title: string) => (
    <Link href={`/research-os/n/${encodeURIComponent(slug)}`} className="underline decoration-[color:var(--gold)] underline-offset-4">
      {title}
    </Link>
  );
  const button = "px-3 py-1 text-[12px] small-caps disabled:opacity-50";

  return (
    <main>
      <div className="max-w-[900px] mx-0 px-0 py-0">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / edges, the graph's makeup · "}
          <Link href="/research-os/review" className="underline decoration-[color:var(--gold)] underline-offset-4">
            teacher review queue
          </Link>
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">edge review queue</h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          What each node rests on, proposed by models and decided here. Lexical inference proposes learning order; the decompose-further queue asks
          one model what a node rests on and a second model, blind to which were picked, whether each pair holds, and scores each pair by Wikipedia's links (learning/research-os/PRIMES.md).
          Approving writes the edge at confidence 0.95, source &ldquo;teacher,&rdquo; with provenance naming the proposal. Gated to reviewers.
        </p>

        <SignInGate signedIn={Boolean(token)} />
        {token && (
          <button onClick={signOut} className="mt-3 text-[12px] underline underline-offset-4">
            sign out
          </button>
        )}

        {notice && notice.id === null && <p className="mt-4 text-[13px] text-[color:var(--basalt-2)]" role="status">{notice.text}</p>}

        {queueError === "forbidden" && token && (
          <p className="mt-6 text-[13px] text-red-700">
            This account is not on the reviewer allowlist. Ask an admin to add your email to RESEARCH_OS_REVIEWER_EMAILS (see
            src/lib/research-os/reviewer.ts).
          </p>
        )}
        {queueError && queueError !== "forbidden" && <p className="mt-6 text-[13px] text-red-700">Could not load part of the queue ({queueError}).</p>}

        {irreducible && irreducible.length > 0 && (
          <section className="mt-8 flex flex-col gap-3" aria-labelledby="irreducible">
            <h2 id="irreducible" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
              called irreducible ({irreducible.length})
            </h2>
            <p className="text-[13px] text-[color:var(--basalt-2)] max-w-2xl">
              Nodes the proposer found nothing more basic for. Confirming one makes it a prime by review, and the queue stops trying to decompose it;
              rejecting it sends it back.
            </p>
            {irreducible.map((r) => (
              <div key={r.id} className="p-4 bg-[color:var(--bone)]">
                <div className="text-[13px] text-[color:var(--basalt)]">
                  <strong>{nodeLink(r.slug, r.title)}</strong> &middot; {r.branch}
                  {r.dependents > 0 && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; {r.dependents} idea node(s) rest on it</span>}
                </div>
                {r.summary && <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">{r.summary}</p>}
                <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">{r.justification}</p>
                {noteInput(r.id)}
                <div className="mt-2 flex gap-3">
                  <button onClick={() => decideIrreducible(r, "confirmed")} disabled={busyId === r.id} className={`${button} bg-[color:var(--gold)] text-[color:var(--basalt)]`}>
                    confirm prime
                  </button>
                  <button onClick={() => decideIrreducible(r, "rejected")} disabled={busyId === r.id} className={`${button} border border-[color:var(--hairline)]`}>
                    reject
                  </button>
                </div>
                {inlineNotice(r.id)}
              </div>
            ))}
          </section>
        )}

        {nodeProposals && nodeProposals.length > 0 && (
          <section className="mt-8 flex flex-col gap-3" aria-labelledby="missing-primes">
            <h2 id="missing-primes" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
              missing primes ({nodeProposals.length})
            </h2>
            <p className="text-[13px] text-[color:var(--basalt-2)] max-w-2xl">
              Base ideas the proposer named while decomposing nodes, merged with their synonyms, the most-named first. Check the possible duplicates
              first; adding one creates a concept at the lowest grade tier among the nodes that named it, and queues a proposal from it to each.
            </p>
            {nodeProposals.map((n) => {
              const e = editOf(n);
              return (
                <div key={n.id} className="p-4 bg-[color:var(--bone)]">
                  <div className="text-[13px] text-[color:var(--basalt)]">
                    <strong>{n.title}</strong> &middot; named by {n.namedBy.length}
                    {n.baseMatch && (
                      <span className="ml-2 px-1.5 py-0.5 text-[11px] small-caps bg-[color:var(--gold)]/40" title="A lexical hint from the title's head noun; the idea itself still needs judging.">
                        lexical hint: {n.baseMatch}
                      </span>
                    )}
                  </div>
                  {n.aliases.length > 0 && <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">also named: {n.aliases.join("; ")}</p>}
                  {n.possibleDuplicates.length > 0 && (
                    <p className="mt-1 text-[12px] text-red-700">
                      may duplicate:{" "}
                      {n.possibleDuplicates.map((d, i) => (
                        <span key={d.slug}>
                          {i > 0 && "; "}
                          {nodeLink(d.slug, d.title)} ({d.similarity.toFixed(2)})
                        </span>
                      ))}
                    </p>
                  )}
                  <ul className="mt-2 flex flex-col gap-1 text-[12px] text-[color:var(--basalt-2)]">
                    {n.namedBy.slice(0, 6).map((t) => (
                      <li key={t.slug}>
                        {nodeLink(t.slug, t.title)}
                        {t.reason && <span>: {t.reason}</span>}
                      </li>
                    ))}
                    {n.namedBy.length > 6 && <li>and {n.namedBy.length - 6} more</li>}
                  </ul>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_12rem]">
                    <label className="text-[11px] text-[color:var(--basalt-3)]">
                      <span className="small-caps">title</span>
                      <input
                        value={e.title}
                        onChange={(ev) => setEdits((r) => ({ ...r, [n.id]: { ...e, title: ev.target.value } }))}
                        className="mt-1 block w-full border border-[color:var(--hairline)] px-2 py-1 text-[13px] normal-case bg-white/60"
                      />
                    </label>
                    <label className="text-[11px] text-[color:var(--basalt-3)]">
                      <span className="small-caps">branch</span>
                      <select
                        value={e.branch}
                        onChange={(ev) => setEdits((r) => ({ ...r, [n.id]: { ...e, branch: ev.target.value } }))}
                        className="mt-1 block w-full border border-[color:var(--hairline)] px-2 py-1 text-[13px] normal-case bg-white/60"
                      >
                        {branches.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] text-[color:var(--basalt-3)] md:col-span-2">
                      <span className="small-caps">summary, a definition of the idea</span>
                      <textarea
                        value={e.summary}
                        onChange={(ev) => setEdits((r) => ({ ...r, [n.id]: { ...e, summary: ev.target.value } }))}
                        rows={2}
                        className="mt-1 block w-full border border-[color:var(--hairline)] px-2 py-1 text-[13px] normal-case bg-white/60"
                      />
                    </label>
                  </div>
                  {noteInput(n.id)}
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => decideNode(n, "approved")} disabled={busyId === n.id} className={`${button} bg-[color:var(--gold)] text-[color:var(--basalt)]`}>
                      add to graph
                    </button>
                    <button onClick={() => decideNode(n, "rejected")} disabled={busyId === n.id} className={`${button} border border-[color:var(--hairline)]`}>
                      reject
                    </button>
                  </div>
                  {inlineNotice(n.id)}
                </div>
              );
            })}
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
            <p className="text-[13px] text-[color:var(--basalt-2)] max-w-2xl">
              Ordered by how uncertain the models were, weighted by how many idea nodes rest on the target. &ldquo;Rests on&rdquo; records what the
              node is made of and leaves learning order alone; &ldquo;learning order&rdquo; adds a prerequisite that K-12 routing will follow.
            </p>
            {proposals.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
            {groups.map((g) => (
              <div key={g.toSlug} className="p-4 bg-[color:var(--bone)]">
                <div className="text-[14px] text-[color:var(--basalt)]">
                  <strong>{nodeLink(g.toSlug, g.toTitle)}</strong> &middot; {g.branch}
                  {g.impact > 0 && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; {g.impact} idea node(s) rest on it</span>}
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {g.items.map((p) => {
                    const v = VERIFICATION_TEXT[p.verification ?? (p.agreement ? "confirmed" : "refuted")];
                    const kind = kinds[p.id] ?? defaultKind(p);
                    return (
                      <div key={p.id} className="pl-3 border-l-2 border-[color:var(--hairline)]">
                        <div className="text-[13px] text-[color:var(--basalt)]">
                          rests on <strong>{nodeLink(p.fromSlug, p.fromTitle)}</strong>
                          {p.fromBranch && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; {p.fromBranch}</span>}
                          {p.crossBranch && <span className="ml-2 px-1.5 py-0.5 text-[11px] small-caps bg-[color:var(--aegean-deep)]/15">across branches</span>}
                        </div>
                        {p.fromSummary && <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">{p.fromSummary}</p>}
                        <div className="mt-1 text-[12px]">
                          <span className={v.className}>{v.text}</span>
                          <span className="text-[color:var(--basalt-3)]">
                            {" "}
                            &middot; confidence {p.confidence.toFixed(2)} &middot; {p.model} &middot; prompt {p.promptHash.slice(0, 8)}
                          </span>
                        </div>
                        {p.refd !== null && p.refd !== undefined && (
                          <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]" title="RefD over Wikipedia links, Liang et al. 2015">
                            Wikipedia links {p.refd > 0 ? "+" : ""}
                            {p.refd.toFixed(2)}: {REFD_TEXT(p.refd)}
                          </p>
                        )}
                        {p.origin && ORIGIN_TEXT[p.origin] && <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">{ORIGIN_TEXT[p.origin]}</p>}
                        {p.inCycle && (
                          <p className="mt-1 text-[12px] text-red-700">This pair sits on a cycle with other pending proposals: approving all of them would make a loop. Approve one direction.</p>
                        )}
                        <p className="mt-2 text-[13px] text-[color:var(--basalt-2)]">{p.justification}</p>
                        {p.secondaryJustification && <p className="mt-1 text-[12px] text-[color:var(--basalt-2)] italic">second check: {p.secondaryJustification}</p>}
                        <fieldset className="mt-2 flex flex-wrap gap-4 text-[12px]">
                          <legend className="sr-only">edge kind</legend>
                          <label>
                            <input type="radio" name={`kind-${p.id}`} checked={kind === "derives_from"} onChange={() => setKinds((k) => ({ ...k, [p.id]: "derives_from" }))} />{" "}
                            rests on
                          </label>
                          <label>
                            <input type="radio" name={`kind-${p.id}`} checked={kind === "prerequisite"} onChange={() => setKinds((k) => ({ ...k, [p.id]: "prerequisite" }))} />{" "}
                            learning order, changes routing
                          </label>
                        </fieldset>
                        {noteInput(p.id)}
                        <div className="mt-2 flex gap-3">
                          <button onClick={() => decideEdge(p, "approved")} disabled={busyId === p.id} className={`${button} bg-[color:var(--gold)] text-[color:var(--basalt)]`}>
                            approve
                          </button>
                          <button onClick={() => decideEdge(p, "rejected")} disabled={busyId === p.id} className={`${button} border border-[color:var(--hairline)]`}>
                            reject
                          </button>
                        </div>
                        {inlineNotice(p.id)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
