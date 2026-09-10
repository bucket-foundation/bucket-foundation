"use client";

/**
 * /research-os/workspace, the Phase 0 student workspace (bkt-ros, task item
 * 4). Shows the target node, the frontier-backward chain as a vertical map
 * with stage indicators, the four AI tools (Locate, Quote, Check, Organize),
 * and a Production form that saves as a draft. See
 * _intake/research-os-k12/RESEARCH-OS-K12-SYSTEM-REVIEW.md section 8 for the
 * Phase 0 slice this implements, and src/app/api/research-os/* for the
 * routes this page calls.
 *
 * Auth reuses the SAME Supabase project and email-OTP flow the vanilla-JS
 * Academy app already uses (learning/app/js/auth.js), through the shared
 * `@/lib/supabase/client` the rest of the Next.js site already imports (see
 * src/context/AuthorContext.tsx). This reuses the existing Supabase Auth
 * project the rest of the site already relies on, reached here from React
 * instead of the static app. The review's auth-reconciliation gap (section
 * 2, "Auth surface") stays a Phase 0 open item, untouched by this page.
 *
 * Scope: no teacher layer, no roster, single locale (English), matching
 * task item 6. TODO(Phase 1, review section 4 gap analysis "Role system",
 * "Under-13 consent flow"): this page has no age gate and no guardian
 * consent flow, deliberately out of Phase 0 scope.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";

const TARGET_SLUG = "why-the-sky-is-blue";

type Stage = "access" | "awareness" | "understanding" | "internalization" | "production";

interface GraphNodeLite {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  summary: string | null;
  provenance?: { author?: string; year?: number; title?: string; publisher?: string; url?: string; doi?: string };
}
interface ChainStep {
  node: GraphNodeLite;
  stage: Stage;
  hops: number;
  isFrontier: boolean;
}
interface EngineFrontierCandidate {
  node: GraphNodeLite;
  heldCount: number;
  totalCount: number;
  heldFraction: number;
}
interface RouteResponse {
  target: GraphNodeLite;
  frontier: GraphNodeLite[];
  chain: ChainStep[];
  gap: GraphNodeLite[];
  /** Engine bridge task item 2: engine-generated candidate targets this
   * learner is close to being ready for, empty until one has been ingested
   * (src/lib/research-os/engine-bridge.ts) into this branch. */
  engineFrontier: EngineFrontierCandidate[];
  learner: "self" | "anonymous";
  error?: string;
}

const STAGE_LABEL: Record<Stage, string> = {
  access: "Access",
  awareness: "Awareness",
  understanding: "Understanding",
  internalization: "Internalization",
  production: "Production",
};
const STAGE_ORDER: Stage[] = ["access", "awareness", "understanding", "internalization", "production"];

function StageBadge({ stage }: { stage: Stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] small-caps tracking-[0.12em] px-2 py-1 rounded-sm"
      style={{
        background: idx >= 2 ? "var(--gold)" : "var(--hairline)",
        color: idx >= 2 ? "var(--basalt)" : "var(--basalt-2)",
      }}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

export default function ResearchOsWorkspacePage() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNodeLite | null>(null);

  const [locateQuery, setLocateQuery] = useState("");
  const [locateResults, setLocateResults] = useState<Array<{ nodeId: string; slug: string; title: string; summary: string | null; citation: string }>>([]);
  const [quote, setQuote] = useState<{ quotable_span: string | null; citation: string } | null>(null);
  const [explanation, setExplanation] = useState("");
  const [checkResult, setCheckResult] = useState<{ result: string; feedback: string; citations: string[] } | null>(null);
  const [organizeClaim, setOrganizeClaim] = useState("");
  const [organizeEvidence, setOrganizeEvidence] = useState("");
  const [organizeSources, setOrganizeSources] = useState("");
  const [organized, setOrganized] = useState<{ claim: string; evidence: string[]; sources: string[] } | null>(null);
  const [transferAnswer, setTransferAnswer] = useState("");
  const [transferSaved, setTransferSaved] = useState(false);
  const [production, setProduction] = useState({ claim: "", evidence: "", sources: "", transferProof: "" });
  const [productionStatus, setProductionStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  const loadRoute = useCallback(async () => {
    setRouteError(null);
    try {
      const res = await fetch(`/api/research-os/route?target=${encodeURIComponent(TARGET_SLUG)}`, { headers: authHeaders() });
      const data = (await res.json()) as RouteResponse;
      if (!res.ok) {
        setRouteError(data.error || "route_failed");
        return;
      }
      setRoute(data);
      if (!selected) setSelected(data.target);
    } catch {
      setRouteError("network_error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  async function sendOtp() {
    if (!supabase || !email.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setAuthBusy(false);
    if (error) setAuthError(error.message);
    else setOtpSent(true);
  }

  async function verifyOtp() {
    if (!supabase || !otpCode.trim()) return;
    setAuthBusy(true);
    setAuthError(null);
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otpCode.trim(), type: "email" });
    setAuthBusy(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data.session) setToken(data.session.access_token);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
  }

  async function openNode(node: GraphNodeLite) {
    setSelected(node);
    setQuote(null);
    setCheckResult(null);
    setLocateResults([]);
    setOrganized(null);
    if (!token) return; // anonymous browsing is fine; only a signed-in learner logs progress
    try {
      await fetch("/api/research-os/state", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId: node.id, action: "open" }),
      });
      loadRoute();
    } catch {
      /* best-effort; the map still renders from the last known state */
    }
  }

  async function runLocate() {
    if (!token || !locateQuery.trim()) return;
    setBusy("locate");
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "locate", query: locateQuery }),
      });
      const data = await res.json();
      setLocateResults(res.ok ? data.results : []);
    } finally {
      setBusy(null);
    }
  }

  async function runQuote() {
    if (!token || !selected) return;
    setBusy("quote");
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "quote", nodeId: selected.id }),
      });
      const data = await res.json();
      if (res.ok) setQuote(data);
    } finally {
      setBusy(null);
    }
  }

  async function runCheck() {
    if (!token || !selected || !explanation.trim()) return;
    setBusy("check");
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "check", nodeId: selected.id, explanation }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckResult(data);
        loadRoute();
      } else {
        setCheckResult({ result: "error", feedback: data.error || "Check failed.", citations: [] });
      }
    } finally {
      setBusy(null);
    }
  }

  async function runOrganize() {
    if (!token) return;
    setBusy("organize");
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "organize", claim: organizeClaim, evidenceNotes: organizeEvidence, sourceNotes: organizeSources }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrganized(data);
        setProduction((p) => ({ ...p, claim: data.claim || p.claim, evidence: (data.evidence || []).join("\n"), sources: (data.sources || []).join("\n") }));
      }
    } finally {
      setBusy(null);
    }
  }

  async function saveTransferAnswer() {
    if (!token || !selected || !transferAnswer.trim()) return;
    setBusy("transfer");
    try {
      await fetch("/api/research-os/state", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId: selected.id, action: "transfer_item" }),
      });
      setTransferSaved(true);
      loadRoute();
    } finally {
      setBusy(null);
    }
  }

  async function saveProduction(status: "draft" | "submitted") {
    if (!token || !route) return;
    setBusy("production");
    try {
      const res = await fetch("/api/research-os/production", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          targetNodeId: route.target.id,
          claim: production.claim,
          evidence: production.evidence.split("\n").filter(Boolean),
          sources: production.sources.split("\n").filter(Boolean),
          transferProof: { text: production.transferProof },
          status,
        }),
      });
      const data = await res.json();
      setProductionStatus(res.ok ? `${status} saved` : data.error || "save_failed");
      if (res.ok) loadRoute();
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="stone-bone relative grain min-h-screen">
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / workspace, Phase 0 prototype"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          why is the sky blue?
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          The Phase 0 seed path: grade 3-5 facts about light and air, forward to Rayleigh scattering and the
          lambda-to-the-minus-4 law. Sign in to track your own Access/Awareness/Understanding/Internalization
          state; browsing the map works signed out too.
        </p>

        {/* Auth panel */}
        <div className="mt-6 p-4 bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)]">
          {token ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[13px] text-[color:var(--basalt-2)]">Signed in.</span>
              <button onClick={signOut} className="text-[12px] small-caps underline underline-offset-4">
                sign out
              </button>
            </div>
          ) : !otpSent ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.example"
                className="border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 flex-1 min-w-[200px]"
              />
              <button
                onClick={sendOtp}
                disabled={authBusy || !email.trim()}
                className="px-4 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
              >
                {authBusy ? "sending…" : "send code"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="6-digit code"
                className="border border-[color:var(--hairline)] px-3 py-2 text-[13px] bg-white/60 w-[160px]"
              />
              <button
                onClick={verifyOtp}
                disabled={authBusy || !otpCode.trim()}
                className="px-4 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)] disabled:opacity-50"
              >
                {authBusy ? "verifying…" : "verify"}
              </button>
            </div>
          )}
          {authError && <p className="mt-2 text-[12px] text-red-700">{authError}</p>}
        </div>

        {routeError && (
          <p className="mt-6 text-[13px] text-red-700">
            Could not load the route ({routeError}). If this is a fresh environment, run the migration and{" "}
            <code>node scripts/seed-research-os.mjs</code> first.
          </p>
        )}

        {route && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Vertical map + engine frontier */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
                {route.chain.map((step) => (
                  <button
                    key={step.node.id}
                    onClick={() => openNode(step.node)}
                    className="text-left bg-[color:var(--bone)] p-3 flex items-center justify-between gap-2"
                    style={{ outline: selected?.id === step.node.id ? "2px solid var(--gold-deep)" : "none" }}
                  >
                    <span className="text-[13px] text-[color:var(--basalt)]">{step.node.title}</span>
                    <StageBadge stage={step.stage} />
                  </button>
                ))}
              </div>

              {/* Engine bridge task item 2: engine-generated candidates this
                  learner is close to being ready for. Empty and hidden until
                  an engine hypothesis has been ingested into this branch. */}
              {route.engineFrontier.length > 0 && (
                <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
                  <div className="bg-[color:var(--bone)] p-3 text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)]">
                    from the engine
                  </div>
                  {route.engineFrontier.map((candidate) => (
                    <button
                      key={candidate.node.id}
                      onClick={() => openNode(candidate.node)}
                      className="text-left bg-[color:var(--bone)] p-3 flex items-center justify-between gap-2"
                      style={{ outline: selected?.id === candidate.node.id ? "2px solid var(--gold-deep)" : "none" }}
                    >
                      <span className="text-[13px] text-[color:var(--basalt)]">{candidate.node.title}</span>
                      <span className="text-[11px] text-[color:var(--basalt-2)]">
                        {candidate.heldCount}/{candidate.totalCount}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected node + tools */}
            <div className="flex flex-col gap-6">
              {selected && (
                <div className="p-5 bg-[color:var(--bone)]">
                  <div className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)]">
                    {selected.kind} · tier {selected.tier}
                  </div>
                  <h2 className="font-display uppercase text-[20px] mt-1 text-[color:var(--basalt)]">{selected.title}</h2>
                  <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{selected.summary}</p>
                </div>
              )}

              {/* Four tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[color:var(--hairline)]">
                <div className="bg-[color:var(--bone)] p-4">
                  <div className="font-display uppercase text-[14px] mb-2">locate</div>
                  <input
                    value={locateQuery}
                    onChange={(e) => setLocateQuery(e.target.value)}
                    placeholder="search the path…"
                    className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60"
                  />
                  <button onClick={runLocate} disabled={!token || busy === "locate"} className="mt-2 text-[12px] small-caps underline">
                    {busy === "locate" ? "searching…" : "find"}
                  </button>
                  <ul className="mt-2 text-[12px] text-[color:var(--basalt-2)] flex flex-col gap-1">
                    {locateResults.map((r) => (
                      <li key={r.nodeId}>{r.title}: {r.citation}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[color:var(--bone)] p-4">
                  <div className="font-display uppercase text-[14px] mb-2">quote</div>
                  <button onClick={runQuote} disabled={!token || !selected || busy === "quote"} className="text-[12px] small-caps underline">
                    {busy === "quote" ? "fetching…" : "quote this node's source"}
                  </button>
                  {quote && (
                    <p className="mt-2 text-[12px] text-[color:var(--basalt-2)]">
                      &ldquo;{quote.quotable_span}&rdquo;, {quote.citation}
                    </p>
                  )}
                </div>

                <div className="bg-[color:var(--bone)] p-4">
                  <div className="font-display uppercase text-[14px] mb-2">check</div>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="explain this node in your own words…"
                    className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 min-h-[70px]"
                  />
                  <button onClick={runCheck} disabled={!token || !selected || busy === "check"} className="mt-2 text-[12px] small-caps underline">
                    {busy === "check" ? "checking…" : "check my explanation"}
                  </button>
                  {checkResult && (
                    <p className="mt-2 text-[12px] text-[color:var(--basalt-2)]">
                      <strong>{checkResult.result}</strong>: {checkResult.feedback}
                    </p>
                  )}
                </div>

                <div className="bg-[color:var(--bone)] p-4">
                  <div className="font-display uppercase text-[14px] mb-2">organize</div>
                  <textarea value={organizeClaim} onChange={(e) => setOrganizeClaim(e.target.value)} placeholder="claim notes…" className="border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60 mb-1" />
                  <textarea value={organizeEvidence} onChange={(e) => setOrganizeEvidence(e.target.value)} placeholder="evidence notes…" className="border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60 mb-1" />
                  <textarea value={organizeSources} onChange={(e) => setOrganizeSources(e.target.value)} placeholder="source notes…" className="border border-[color:var(--hairline)] px-2 py-1 text-[12px] w-full bg-white/60" />
                  <button onClick={runOrganize} disabled={!token || busy === "organize"} className="mt-2 text-[12px] small-caps underline">
                    {busy === "organize" ? "organizing…" : "organize into a scaffold"}
                  </button>
                  {organized && <p className="mt-2 text-[11px] text-[color:var(--basalt-2)]">Copied into the Production form below.</p>}
                </div>
              </div>

              {/* Transfer item, only meaningful on the target once Understanding is reached */}
              {selected?.id === route.target.id && (
                <div className="p-4 bg-[color:var(--bone)]">
                  <div className="font-display uppercase text-[14px] mb-2">transfer item</div>
                  <p className="text-[12px] text-[color:var(--basalt-2)] mb-2">
                    A sunset looks red. Using the lambda^-4 law, explain why the SAME scattering that makes
                    the daytime sky blue makes a sunset red instead.
                  </p>
                  <textarea
                    value={transferAnswer}
                    onChange={(e) => setTransferAnswer(e.target.value)}
                    className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 min-h-[70px]"
                  />
                  <button onClick={saveTransferAnswer} disabled={!token || busy === "transfer"} className="mt-2 text-[12px] small-caps underline">
                    {busy === "transfer" ? "saving…" : "submit transfer answer"}
                  </button>
                  {transferSaved && (
                    <p className="mt-2 text-[11px] text-[color:var(--basalt-2)]">
                      Logged. Held for teacher review (Phase 0 has no teacher layer yet; see
                      src/lib/research-os/stages.ts).
                    </p>
                  )}
                </div>
              )}

              {/* Production form */}
              <div className="p-4 bg-[color:var(--bone)]">
                <div className="font-display uppercase text-[14px] mb-2">production</div>
                <label className="text-[11px] small-caps text-[color:var(--aegean-deep)]">claim</label>
                <textarea value={production.claim} onChange={(e) => setProduction((p) => ({ ...p, claim: e.target.value }))} className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 mb-2" />
                <label className="text-[11px] small-caps text-[color:var(--aegean-deep)]">evidence, one per line</label>
                <textarea value={production.evidence} onChange={(e) => setProduction((p) => ({ ...p, evidence: e.target.value }))} className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 mb-2 min-h-[60px]" />
                <label className="text-[11px] small-caps text-[color:var(--aegean-deep)]">sources, one per line</label>
                <textarea value={production.sources} onChange={(e) => setProduction((p) => ({ ...p, sources: e.target.value }))} className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 mb-2 min-h-[60px]" />
                <label className="text-[11px] small-caps text-[color:var(--aegean-deep)]">transfer proof</label>
                <textarea value={production.transferProof} onChange={(e) => setProduction((p) => ({ ...p, transferProof: e.target.value }))} className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 mb-2 min-h-[60px]" />
                <div className="flex gap-3">
                  <button onClick={() => saveProduction("draft")} disabled={!token || busy === "production"} className="px-3 py-2 text-[12px] small-caps border border-[color:var(--hairline)]">
                    save draft
                  </button>
                  <button onClick={() => saveProduction("submitted")} disabled={!token || busy === "production"} className="px-3 py-2 text-[12px] small-caps bg-[color:var(--gold)] text-[color:var(--basalt)]">
                    submit
                  </button>
                </div>
                {productionStatus && <p className="mt-2 text-[12px] text-[color:var(--basalt-2)]">{productionStatus}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
