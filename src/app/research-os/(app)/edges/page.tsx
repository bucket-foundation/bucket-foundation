"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  fromTier: number | null;
  toSlug: string;
  toTitle: string;
  toTier: number | null;
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
  graphLoop: boolean;
  implied: boolean;
  viaPending: boolean;
  through: { slug: string; title: string }[];
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

function chainText(through: { title: string }[] | undefined): string {
  return through && through.length ? ` through ${through.map((t) => t.title).join(", ")}` : "";
}

function alreadyText(title: string, decision: unknown): string {
  return `${title} was already ${typeof decision === "string" && decision !== "pending" ? decision : "decided"}; it has left the queue.`;
}

function saveError(code: string | undefined, status: number): string {
  switch (code) {
    case "decision_write_failed":
    case "read_failed":
      return "The database did not answer. Nothing changed; try again.";
    case "edge_write_failed":
    case "node_write_failed":
    case "edge_proposal_write_failed":
      return "The write failed and was undone, so the proposal is still open. Try again.";
    case "edge_write_failed_claim_held":
    case "node_write_failed_claim_held":
    case "edge_proposal_write_failed_claim_held":
    case "read_failed_claim_held":
      return "The write failed and the proposal could not be reopened: it shows as decided with nothing written. Ask an admin to set it back to pending in graph.edge_proposals or graph.node_proposals.";
    case "edge_proposal_write_failed_node_left":
      return "The new node was created, its proposals were not, and the cleanup failed. Ask an admin to remove the node or queue its proposals.";
    case "forbidden":
      return "This account is not a reviewer.";
    default:
      return `Could not save (${code || status}).`;
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
  const [verdict, setVerdict] = useState<"all" | "confirmed" | "refuted" | "unchecked">("all");
  const [crossOnly, setCrossOnly] = useState(false);
  const [shortcutsOnly, setShortcutsOnly] = useState(false);
  const [find, setFind] = useState("");
  const [showAllMissing, setShowAllMissing] = useState(false);
  const [landed, setLanded] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
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

  const loadSeq = useRef(0);
  const loadQueue = useCallback(async () => {
    if (!token) return;
    const seq = ++loadSeq.current;
    setQueueError(null);
    try {
      const qs = source === "all" ? "" : `?source=${source}`;
      const [edgeRes, nodeRes, irrRes] = await Promise.all([
        fetch(`/api/research-os/edges${qs}`, { headers: authHeaders() }),
        fetch("/api/research-os/node-proposals", { headers: authHeaders() }),
        fetch("/api/research-os/irreducible", { headers: authHeaders() }),
      ]);
      const [edgeData, nodeData, irrData] = await Promise.all([readJson(edgeRes), readJson(nodeRes), readJson(irrRes)]);
      if (seq !== loadSeq.current) return;
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
      } else setQueueError(`missing ideas: ${nodeData.error || "load_failed"}`);
      if (irrRes.ok) setIrreducible(irrData.proposals);
      else setQueueError(`irreducible: ${irrData.error || "load_failed"}`);
    } catch {
      if (seq === loadSeq.current) setQueueError("network_error");
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
        setNotice({ id: p.id, text: `${p.fromTitle} already rests on ${p.toTitle} in the graph, so this edge would make a loop. Reject it.` });
      else if (!res.ok) setNotice({ id: p.id, text: saveError(data.error, res.status) });
      else if (data.alreadyDecided) {
        setNotice({ id: null, text: alreadyText(`${p.fromTitle} for ${p.toTitle}`, data.decision) });
        void loadQueue();
      } else {
        setProposals((list) => (list ?? []).filter((x) => x.id !== p.id));
        setNotice({
          id: null,
          text:
            decision === "approved"
              ? `Approved: ${p.toTitle} ${kind === "derives_from" ? "rests on" : "comes after"} ${p.fromTitle}.${typeof data.tiersRaised === "number" && data.tiersRaised > 0 ? ` Grade tier raised on ${data.tiersRaised} ${data.tiersRaised === 1 ? "idea" : "ideas"}.` : ""}${data.warning ? ` Warning: ${data.warning}.` : ""}`
              : `Rejected: ${p.fromTitle} for ${p.toTitle}.`,
        });
        void loadQueue();
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
      if (!res.ok) setNotice({ id: n.id, text: data.error === "a definition is required to create the node" ? "Write a one-sentence definition first." : saveError(data.error, res.status) });
      else if (data.alreadyDecided) {
        setNotice({ id: null, text: alreadyText(n.title, data.decision) });
        await loadQueue();
      } else if (decision === "approved") {
        setNotice({
          id: null,
          text: `${data.reused ? `Linked to the existing node ${data.nodeSlug}` : `Added ${data.nodeSlug} at grade tier ${data.nodeTier}`}; ${data.queuedEdges} new ${data.queuedEdges === 1 ? "proposal" : "proposals"} from it ${data.queuedEdges === 1 ? "waits" : "wait"} below.${data.warning ? ` Warning: ${data.warning}.` : ""}`,
        });
        await loadQueue();
      } else {
        setNodeProposals((list) => (list ?? []).filter((x) => x.id !== n.id));
        setNotice({ id: null, text: `Rejected: ${n.title}.` });
        void loadQueue();
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
      if (!res.ok) setNotice({ id: r.id, text: saveError(data.error, res.status) });
      else if (data.alreadyDecided) {
        setNotice({ id: null, text: alreadyText(r.title, data.decision) });
        await loadQueue();
      } else {
        setIrreducible((list) => (list ?? []).filter((x) => x.id !== r.id));
        void loadQueue();
        setNotice({ id: null, text: decision === "confirmed" ? `${r.title} is a prime by review.` : `${r.title} goes back to the decompose-further queue.` });
      }
    } finally {
      setBusyId(null);
    }
  }

  const defaultKind = (p: EdgeProposal): Kind => (p.confidenceSource === "prime_decompose_llm" ? "derives_from" : "prerequisite");
  const editOf = (n: NodeProposal) => edits[n.id] ?? { title: n.title, summary: n.summary ?? "", branch: n.branchToCreate };

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

  const verdictOf = (p: EdgeProposal) => p.verification ?? (p.agreement ? "confirmed" : "refuted");
  const needle = find.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (p) =>
              (!focus || p.toSlug === focus) &&
              (verdict === "all" || verdictOf(p) === verdict) &&
              (!crossOnly || p.crossBranch) &&
              (!shortcutsOnly || ((p.implied || p.viaPending) && !p.graphLoop)) &&
              (!needle || p.toTitle.toLowerCase().includes(needle) || p.fromTitle.toLowerCase().includes(needle)),
          ),
        }))
        .filter((g) => g.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, verdict, crossOnly, shortcutsOnly, needle, focus],
  );
  const visibleMissing = useMemo(
    () =>
      (nodeProposals ?? []).filter(
        (n) =>
          (!focus || n.namedBy.some((t) => t.slug === focus)) &&
          (!needle || n.title.toLowerCase().includes(needle) || n.aliases.some((a) => a.toLowerCase().includes(needle)) || n.namedBy.some((t) => t.title.toLowerCase().includes(needle))),
      ),
    [nodeProposals, needle, focus],
  );
  const visibleIrreducible = useMemo(() => (irreducible ?? []).filter((r) => !focus || r.slug === focus), [irreducible, focus]);
  const focusTitle = useMemo(
    () =>
      !focus
        ? null
        : (proposals ?? []).find((p) => p.toSlug === focus)?.toTitle ??
          (nodeProposals ?? []).flatMap((n) => n.namedBy).find((t) => t.slug === focus)?.title ??
          (irreducible ?? []).find((r) => r.slug === focus)?.title ??
          focus,
    [focus, proposals, nodeProposals, irreducible],
  );
  const counts = useMemo(() => {
    const ps = proposals ?? [];
    return {
      confirmed: ps.filter((p) => verdictOf(p) === "confirmed").length,
      refuted: ps.filter((p) => verdictOf(p) === "refuted").length,
      unchecked: ps.filter((p) => verdictOf(p) === "unchecked").length,
      loops: ps.filter((p) => p.inCycle || p.graphLoop).length,
      shortcuts: ps.filter((p) => (p.implied || p.viaPending) && !p.graphLoop).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals]);

  useEffect(() => {
    const settled = (list: unknown[] | null) => list !== null || queueError !== null;
    if (!settled(proposals) || !settled(nodeProposals) || !settled(irreducible) || typeof window === "undefined") return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash.startsWith("target-") || landed === hash) return;
    const slug = hash.slice("target-".length);
    setFocus(slug);
    setLanded(hash);
    const first = (irreducible ?? []).some((r) => r.slug === slug)
      ? "irreducible"
      : (nodeProposals ?? []).some((n) => n.namedBy.some((t) => t.slug === slug))
        ? "missing-primes"
        : `target-${slug}`;
    window.setTimeout(() => document.getElementById(first)?.scrollIntoView({ block: "start" }), 50);
  }, [proposals, nodeProposals, irreducible, landed, queueError]);

  const clearFocus = () => {
    setFocus(null);
    if (typeof window !== "undefined") window.history.replaceState(null, "", window.location.pathname);
  };

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
          one model what a node rests on and a second model, blind to which were picked, whether each pair holds, and scores each pair by Wikipedia&apos;s links.
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
            This account is not a graph reviewer. Graph review is open to the reviewer allowlist only; ask an admin to add your email.
          </p>
        )}
        {queueError && queueError !== "forbidden" && <p className="mt-6 text-[13px] text-red-700">Could not load part of the queue ({queueError}).</p>}

        {token && proposals && (
          <div className="mt-6 flex flex-col gap-3 border-y border-[color:var(--hairline)] py-3">
            <p className="text-[13px] text-[color:var(--basalt-2)]">
              {irreducible?.length ? (
                <a href="#irreducible" className="underline decoration-[color:var(--hairline)] underline-offset-4">{irreducible.length} called irreducible</a>
              ) : (
                <span>none called irreducible</span>
              )}
              {" · "}
              {nodeProposals?.length ? (
                <a href="#missing-primes" className="underline decoration-[color:var(--hairline)] underline-offset-4">{nodeProposals.length} missing ideas</a>
              ) : (
                <span>no missing ideas</span>
              )}
              {" · "}
              <a href="#pending-edges" className="underline decoration-[color:var(--hairline)] underline-offset-4">{proposals.length} proposals</a>: {counts.confirmed} the second model agrees with, {counts.refuted} it disagrees with
              {counts.unchecked > 0 && `, ${counts.unchecked} not checked yet`}
              {counts.loops > 0 && `, ${counts.loops} on a loop`}
              {counts.shortcuts > 0 && `, ${counts.shortcuts} ${counts.shortcuts === 1 ? "shortcut" : "shortcuts"} past a chain`}.
            </p>
            {focus && (
              <p className="text-[13px] text-[color:var(--basalt)] bg-[color:var(--gold)]/25 px-3 py-2" role="status">
                Showing only what waits for <strong>{focusTitle}</strong>.{" "}
                <button type="button" onClick={clearFocus} className="underline underline-offset-4">
                  Show everything
                </button>
              </p>
            )}
            <label className="text-[12px] text-[color:var(--basalt-3)] flex items-center gap-2">
              <span className="small-caps">find</span>
              <input
                id="queue-find"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="a node, a factor, or a missing idea"
                className="flex-1 max-w-md border border-[color:var(--hairline)] px-2 py-1 text-[13px] bg-white/60"
              />
            </label>
          </div>
        )}

        {visibleIrreducible.length > 0 && (
          <section className="mt-8 flex flex-col gap-3" aria-labelledby="irreducible">
            <h2 id="irreducible" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
              called irreducible ({focus ? `${visibleIrreducible.length} of ${irreducible?.length ?? 0}` : visibleIrreducible.length})
            </h2>
            <p className="text-[13px] text-[color:var(--basalt-2)] max-w-2xl">
              Nodes the proposer found nothing more basic for. Confirming one makes it a prime by review, and the queue stops trying to decompose it;
              rejecting it sends it back.
            </p>
            {visibleIrreducible.map((r) => (
              <div key={r.id} className="p-4 bg-[color:var(--bone)]">
                <div className="text-[13px] text-[color:var(--basalt)]">
                  <strong>{nodeLink(r.slug, r.title)}</strong> &middot; {r.branch}
                  {r.dependents > 0 && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; {r.dependents} idea {r.dependents === 1 ? "node" : "nodes"} rest{r.dependents === 1 ? "s" : ""} on it</span>}
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

        {nodeProposals && nodeProposals.length > 0 && (!focus || visibleMissing.length > 0) && (
          <section className="mt-8 flex flex-col gap-3" aria-labelledby="missing-primes">
            <h2 id="missing-primes" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
              missing ideas ({needle || focus ? `${visibleMissing.length} of ${nodeProposals.length}` : nodeProposals.length})
            </h2>
            <p className="text-[13px] text-[color:var(--basalt-2)] max-w-2xl">
              Base ideas the proposer named while decomposing nodes, merged with their synonyms, the most-named first. Check the possible duplicates
              first; adding one creates a concept at the lowest grade tier among the nodes that named it, and queues a proposal from it to each.
            </p>
            {(showAllMissing || needle || focus ? visibleMissing : visibleMissing.slice(0, 12)).map((n) => {
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
                    <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]" title="Existing nodes with a similar title by embedding; many are loose matches.">
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
            {!needle && !focus && visibleMissing.length > 12 && (
              <button type="button" onClick={() => setShowAllMissing((v) => !v)} className="self-start text-[12px] underline underline-offset-4">
                {showAllMissing ? "show the first 12" : `show all ${visibleMissing.length}`}
              </button>
            )}
          </section>
        )}

        {proposals && (
          <section className="mt-8 flex flex-col gap-3" aria-labelledby="pending-edges">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id="pending-edges" className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">
                pending proposals ({visibleGroups.reduce((n, g) => n + g.items.length, 0) === proposals.length ? proposals.length : `${visibleGroups.reduce((n, g) => n + g.items.length, 0)} of ${proposals.length}`})
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
            <div className="flex flex-wrap items-center gap-3 text-[12px]" role="group" aria-label="filter proposals">
              {(
                [
                  ["all", "every verdict"],
                  ["confirmed", "agreed"],
                  ["refuted", "disagreed"],
                  ["unchecked", "not checked"],
                ] as ["all" | "confirmed" | "refuted" | "unchecked", string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVerdict(key)}
                  aria-pressed={verdict === key}
                  className={`px-2 py-0.5 small-caps border border-[color:var(--hairline)] ${verdict === key ? "bg-[color:var(--gold)]" : ""}`}
                >
                  {label}
                </button>
              ))}
              <label className="inline-flex items-center gap-1.5">
                <input id="cross-only" type="checkbox" checked={crossOnly} onChange={(e) => setCrossOnly(e.target.checked)} /> across branches only
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input id="shortcuts-only" type="checkbox" checked={shortcutsOnly} onChange={(e) => setShortcutsOnly(e.target.checked)} /> shortcuts only
              </label>
            </div>
            {proposals.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">Nothing pending.</p>}
            {proposals.length > 0 && visibleGroups.length === 0 && <p className="text-[13px] text-[color:var(--basalt-2)]">No proposal matches these filters.</p>}
            {visibleGroups.map((g) => (
              <div
                key={g.toSlug}
                id={`target-${g.toSlug}`}
                className={`scroll-mt-24 p-4 bg-[color:var(--bone)] ${landed === `target-${g.toSlug}` ? "ring-2 ring-[color:var(--gold)]" : ""}`}
              >
                <div className="text-[14px] text-[color:var(--basalt)]">
                  <strong>{nodeLink(g.toSlug, g.toTitle)}</strong> &middot; {g.branch}
                  {g.items[0]?.toTier !== null && g.items[0]?.toTier !== undefined && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; grade tier {g.items[0].toTier}</span>}
                  {g.impact > 0 && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; {g.impact} idea {g.impact === 1 ? "node" : "nodes"} rest{g.impact === 1 ? "s" : ""} on it</span>}
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
                          {p.fromTier !== null && <span className="text-[12px] text-[color:var(--basalt-2)]"> &middot; grade tier {p.fromTier}</span>}
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
                        {p.graphLoop ? (
                          <p className="mt-1 text-[12px] text-red-700">{p.fromTitle} already rests on {p.toTitle} in the graph, so approving this makes a loop. Reject it.</p>
                        ) : (
                          p.inCycle && (
                            <p className="mt-1 text-[12px] text-red-700">This pair sits on a loop with other pending proposals: approving all of them would close it. Reject at least one.</p>
                          )
                        )}
                        {p.viaPending && !p.graphLoop && (
                          <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
                            Pending proposals the second model agreed with already lead from {p.toTitle}
                            {chainText(p.through)} to {p.fromTitle}; if they are approved, this pair is a shortcut past them. Prefer the chain unless this link is
                            direct.
                          </p>
                        )}
                        {p.implied && !p.graphLoop && (
                          <p className="mt-1 text-[12px] text-[color:var(--basalt-3)]">
                            The graph already has {p.toTitle} resting on {p.fromTitle}
                            {chainText(p.through)}; approving adds a direct link.
                          </p>
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
                        {kind === "prerequisite" && p.fromTier !== null && p.toTier !== null && p.fromTier > p.toTier && (
                          <p className="mt-1 text-[12px] text-[color:var(--gold-deep)]">
                            Learning order raises this idea from grade tier {p.toTier} to {p.fromTier}, and every idea that follows it in learning order as far as needed. &ldquo;Rests on&rdquo; leaves the tiers as they are.
                          </p>
                        )}
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
