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
 * task item 6. TODO(Phase 1, review section 4 gap analysis "Role system"):
 * still no roster-backed role.
 *
 * ros-07 UPDATE ("consent gate wiring"): every gated write (a tool call, a
 * probe answer, a transfer answer, a Production save) can return a 403
 * consent block (src/lib/research-os/consent.ts's requireConsent); this
 * page surfaces that as a banner via handleConsentResponse below, with a
 * link to /research-os/profile when the block is "no_profile". The footer
 * also adds self-service "export my data" / "delete my data" actions
 * against POST /api/research-os/privacy (PR #35), with a typed confirm
 * step before delete. Guardian-verified consent itself (COPPA's VPC
 * requirement) is not built here: compliance/README.md part B item 2
 * names the vendor choice that still blocks it.
 *
 * ros-04 UPDATE ("workspace hardening, Phase 1 canvas item 3"): a
 * two-column layout replaces the single vertical chain list -- the left
 * column is the routed chain (unchanged in substance, now carrying a
 * low-confidence badge from `route.lowConfidenceFlags`, PR #27/ros-03's
 * confidence-weighted routing), the right column is the learner's own
 * workspace (the four tools, a notes scratchpad, the running "sources I
 * have quoted" list built from Quote calls, and the Production form). No
 * drag-and-drop: see learning/research-os/WORKSPACE.md for what this
 * Phase 1 canvas adds and what it deliberately does not. Every request
 * this page makes now also carries a client-generated `sessionId`
 * (EVIDENCE-SCHEMA.md's session grouping), created once per browser tab
 * and kept in sessionStorage so a reload mid-sitting keeps the same id.
 *
 * Cognitive forcing on Check (PLAN-REVISION-2.md section 2a): clicking
 * "check my explanation" no longer shows feedback right away. runCheck
 * grades the explanation and, unless the server says this learner's own
 * arm has forcing off (`forcingEnabled: false` in its response), gets
 * back only an `attemptId`: the Check card then shows the confidence and
 * source-prediction questions instead of a verdict. runCheckReveal sends
 * both answers on the same attemptId; the server holds the real verdict
 * until they arrive (workspace/route.ts's own two-phase "check" contract)
 * and, once revealed, the learner's prediction renders beside the
 * tutor's own citation.
 *
 * ros-14 UPDATE (faded guidance for low-prior-knowledge learners): the
 * route response gains `guidance` (`GuidanceLevel | null`,
 * src/lib/research-os/guidance.ts), read here as `route.guidance ??
 * "medium"` wherever it is used, the same neutral default the server
 * itself falls back to for a fresh/anonymous read. Above the Check textarea,
 * the selected node's own worked example (`GraphNodeLite.workedExample`,
 * seeded on the sky-blue path's first six nodes) shows in full at "high,"
 * its first half at "medium" (worked-examples.ts's
 * firstHalfOfWorkedExample), and not at all at "low." The level itself
 * comes back from the server on every Check response too, so it stays
 * consistent with whatever guidance level shaped the tutor's own
 * feedback; loadRoute() (already called after every successful Check)
 * refreshes it here. See learning/research-os/GUIDANCE.md.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import {
  LEARNER_CONFIDENCE_VALUES,
  LEARNER_CONFIDENCE_COPY,
  CONFIDENCE_QUESTION_COPY,
  SOURCE_PREDICTION_QUESTION_COPY,
  type LearnerConfidence,
} from "@/lib/research-os/forcing";
import { DELETE_CONFIRM_TOKEN } from "@/lib/research-os/types";
import { firstHalfOfWorkedExample } from "@/lib/research-os/worked-examples";

const TARGET_SLUG = "why-the-sky-is-blue";

// Phase 0 has no sealed, held-out transfer-item pool (LEARNER-STATE-MODEL.md
// section 4's "Transfer-task construction rule" names the real pool as
// Phase 2 work); this fixed id stands in for the one hardcoded transfer
// prompt below so the evidence log at least records WHICH item was
// answered, forwarded verbatim rather than checked against a pool table
// that does not exist yet.
const TRANSFER_ITEM_ID = "why-the-sky-is-blue::sunset-red-lambda4-v1";

const SESSION_STORAGE_KEY = "research-os-session-id";
const NOTES_STORAGE_KEY = `research-os-notes:${TARGET_SLUG}`;

/** One session id per browser tab, per EVIDENCE-SCHEMA.md ("client-generated
 * ... so a session id is stable across a reconnect"). sessionStorage (not
 * localStorage) so a fresh tab starts a fresh sitting, matching "one
 * session groups every tool call and evidence event from one workspace
 * sitting." Falls back to a timestamp+random id when crypto.randomUUID is
 * unavailable (an older browser, or a non-secure context). */
function readOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    // sessionStorage unavailable (private mode, SSR): a per-render id still
    // lets every call in THIS request carry a session id, just not one
    // stable across a reload.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

type Stage = "access" | "awareness" | "understanding" | "internalization" | "production";
/** ros-14: src/lib/research-os/types.ts's GuidanceLevel, mirrored here the
 * same way this file already mirrors Stage rather than importing a
 * server-facing module. */
type GuidanceLevel = "high" | "medium" | "low";

interface GraphNodeLite {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  summary: string | null;
  provenance?: { author?: string; year?: number; title?: string; publisher?: string; url?: string; doi?: string };
  /** ros-14: present only for a node the seed has authored one for. */
  workedExample?: { text: string; source: string };
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
/** One edge on the returned chain flagged below the confidence floor
 * (ros-03's LOW_CONFIDENCE_THRESHOLD): the route still walked through it,
 * a teacher should confirm it. Matches src/lib/research-os/frontier.ts's
 * LowConfidenceFlag. */
interface LowConfidenceFlag {
  edgeId?: string;
  fromNodeId: string;
  toNodeId: string;
  confidence: number;
}

interface RouteResponse {
  target: GraphNodeLite;
  frontier: GraphNodeLite[];
  chain: ChainStep[];
  gap: GraphNodeLite[];
  /** ros-03 item 2/3: every low-confidence edge on the returned chain (PR
   * #27). Matched against a chain step by `fromNodeId === step.node.id`
   * (frontier.ts's parentEdge runs ancestor -> its parent toward the
   * target, so a step's own outgoing edge is keyed by its own node id). */
  lowConfidenceFlags: LowConfidenceFlag[];
  /** Engine bridge task item 2: engine-generated candidate targets this
   * learner is close to being ready for, empty until one has been ingested
   * (src/lib/research-os/engine-bridge.ts) into this branch. */
  engineFrontier: EngineFrontierCandidate[];
  /** ros-14: this learner's current faded-guidance level, null for an
   * anonymous request (no learner state to compute one from). */
  guidance: GuidanceLevel | null;
  learner: "self" | "anonymous";
  error?: string;
}

// Phase 1 (bkt-ros item 2): the diagnostic probe, fired for a signed-in
// learner with no state on any ancestor of the target
// (src/lib/research-os/probe.ts's probeDue). See
// src/app/api/research-os/probe/route.ts.
interface ProbeQuestion {
  nodeId: string;
  nodeSlug: string;
  nodeTitle: string;
  tier: number;
  prompt: string;
}
interface ProbeResponse {
  due: boolean;
  questions: ProbeQuestion[];
  error?: string;
}
interface ProbeAnswerResult {
  result: string;
  feedback: string;
  stage: string;
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

/** ros-14, GUIDANCE.md section 2: the selected node's own worked example,
 * shown before the Check explanation box -- full text at "high," the
 * first half at "medium," nothing at "low." Renders nothing at all when
 * the node has no authored worked example, regardless of guidance level. */
function WorkedExampleBlock({ node, guidance }: { node: GraphNodeLite; guidance: GuidanceLevel }) {
  if (!node.workedExample || guidance === "low") return null;
  const text = guidance === "medium" ? firstHalfOfWorkedExample(node.workedExample.text) : node.workedExample.text;
  return (
    <div className="mb-3 p-3 bg-white/60 border border-[color:var(--hairline)]">
      <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] mb-1">worked example</div>
      <p className="text-[12px] leading-[1.6] text-[color:var(--basalt)]">{text}</p>
      <p className="mt-1 text-[11px] text-[color:var(--basalt-2)]">{node.workedExample.source}</p>
    </div>
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

  // ros-04: one session id per tab (EVIDENCE-SCHEMA.md), created lazily so
  // it never runs during SSR (window is unavailable there).
  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    setSessionId(readOrCreateSessionId());
  }, []);

  const [locateQuery, setLocateQuery] = useState("");
  const [locateResults, setLocateResults] = useState<Array<{ nodeId: string; slug: string; title: string; summary: string | null; citation: string }>>([]);
  const [quote, setQuote] = useState<{ kind?: "quote" | "summary"; quotable_span: string | null; locator?: string | null; citation: string } | null>(null);
  // ros-04, canvas item 3: "sources I have quoted", every distinct Quote
  // result this sitting, most recent first. Client-side only (no new
  // backend route): Quote is already logged server-side per tool call
  // (workspace/route.ts's logToolCall), this list is the learner's own
  // working view of what they have pulled so far.
  const [quotedSources, setQuotedSources] = useState<Array<{ nodeId: string; nodeTitle: string; kind?: "quote" | "summary"; quotable_span: string | null; locator?: string | null; citation: string }>>([]);
  // Cognitive forcing's source-prediction picker (PLAN-REVISION-2.md
  // section 2a): the distinct citations the learner has quoted this
  // sitting, most recently quoted first, matching quotedSources' own order.
  const quotedCitationOptions = useMemo(() => Array.from(new Set(quotedSources.map((q) => q.citation))), [quotedSources]);
  const [explanation, setExplanation] = useState("");
  const [checkResult, setCheckResult] = useState<{
    result: string;
    feedback: string;
    citations: string[];
    learnerConfidence?: LearnerConfidence;
    sourcePrediction?: string;
    predictionCorrect?: boolean;
  } | null>(null);
  // Cognitive forcing on Check (PLAN-REVISION-2.md section 2a): a held
  // attempt sits between "explanation submitted" and "verdict revealed".
  // checkAttemptId set + checkResult null means the confidence/prediction
  // questions are showing; both null means the Check form itself is
  // showing; checkResult set means the verdict (with the forcing arm on,
  // alongside the learner's own answers) is showing.
  const [checkAttemptId, setCheckAttemptId] = useState<string | null>(null);
  const [checkConfidence, setCheckConfidence] = useState<LearnerConfidence | "">("");
  const [checkSourcePrediction, setCheckSourcePrediction] = useState("");
  const [checkForcingError, setCheckForcingError] = useState<string | null>(null);
  const [organizeClaim, setOrganizeClaim] = useState("");
  const [organizeEvidence, setOrganizeEvidence] = useState("");
  const [organizeSources, setOrganizeSources] = useState("");
  const [organized, setOrganized] = useState<{ claim: string; evidence: string[]; sources: string[]; abstained?: boolean } | null>(null);
  const [transferAnswer, setTransferAnswer] = useState("");
  const [transferSaved, setTransferSaved] = useState(false);
  const [production, setProduction] = useState({ claim: "", evidence: "", sources: "", transferProof: "", counterEvidence: "" });
  const [productionStatus, setProductionStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // ros-04, canvas item 3: a free scratch notes area in the right column,
  // persisted per-target to localStorage only (no backend route; a
  // scratchpad the Production form below stays independent of -- that
  // form is where a learner's real claim/evidence/sources save server-side).
  const [notes, setNotes] = useState("");
  useEffect(() => {
    try {
      setNotes(window.localStorage.getItem(NOTES_STORAGE_KEY) || "");
    } catch {
      /* localStorage unavailable; notes just stay session-local via state */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, notes);
    } catch {
      /* best effort */
    }
  }, [notes]);

  // Phase 1 (bkt-ros item 2): diagnostic probe state.
  const [probe, setProbe] = useState<ProbeResponse | null>(null);
  const [probeAnswers, setProbeAnswers] = useState<Record<string, string>>({});
  const [probeResults, setProbeResults] = useState<Record<string, ProbeAnswerResult>>({});
  const [probeBusy, setProbeBusy] = useState<string | null>(null);

  // ros-07 ("consent gate wiring"): a banner shown whenever any gated
  // write below comes back 403 consent-blocked, and the footer state for
  // the self-service export/delete actions (PR #35's privacy route).
  const [consentNotice, setConsentNotice] = useState<{ message: string; needsProfile: boolean } | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState<"export" | "delete" | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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

  // ros-07: recognizes the consent gate's 403 body
  // (src/lib/research-os/consent.ts's consentBlockedBody: {error:
  // "no_profile"|"consent_required", message, needsProfile}) from any
  // gated fetch below and surfaces it as a banner instead of a raw error
  // string. Returns true when the response WAS a consent block, so the
  // caller can stop treating it as an ordinary success/failure; every
  // other error shape is untouched.
  const handleConsentResponse = useCallback((res: Response, data: { error?: string; message?: string; needsProfile?: boolean }): boolean => {
    if (res.status !== 403 || (data?.error !== "no_profile" && data?.error !== "consent_required")) return false;
    setConsentNotice({
      message: data.message || "This feature needs consent on file before it can be used.",
      needsProfile: Boolean(data.needsProfile),
    });
    return true;
  }, []);

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

  // Only a signed-in learner has ancestor state to probe against, so this
  // only fires once token is set (an anonymous visitor never sees a probe).
  const loadProbe = useCallback(async () => {
    if (!token) {
      setProbe(null);
      return;
    }
    try {
      const res = await fetch(`/api/research-os/probe?target=${encodeURIComponent(TARGET_SLUG)}`, { headers: authHeaders() });
      const data = (await res.json()) as ProbeResponse;
      setProbe(res.ok ? data : null);
    } catch {
      setProbe(null);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadProbe();
  }, [loadProbe]);

  async function submitProbeAnswer(nodeId: string) {
    const answer = (probeAnswers[nodeId] || "").trim();
    if (!token || !answer) return;
    setProbeBusy(nodeId);
    try {
      const res = await fetch("/api/research-os/probe", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId, answer, sessionId }),
      });
      const data = await res.json();
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setProbeResults((r) => ({ ...r, [nodeId]: data }));
        // Answering even one question resolves the cold-start condition
        // (probeDue requires NO ancestor state at all), so both the probe
        // panel and the route/frontier can change; reload both.
        loadProbe();
        loadRoute();
      } else {
        setProbeResults((r) => ({ ...r, [nodeId]: { result: "error", feedback: data.error || "Probe grading failed.", stage: "" } }));
      }
    } finally {
      setProbeBusy(null);
    }
  }

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
    setCheckAttemptId(null);
    setCheckConfidence("");
    setCheckSourcePrediction("");
    setCheckForcingError(null);
    setLocateResults([]);
    setOrganized(null);
    if (!token) return; // anonymous browsing is fine; only a signed-in learner logs progress
    try {
      await fetch("/api/research-os/state", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId: node.id, action: "open", sessionId }),
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
        body: JSON.stringify({ action: "locate", query: locateQuery, sessionId }),
      });
      const data = await res.json();
      if (handleConsentResponse(res, data)) {
        setLocateResults([]);
        return;
      }
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
        body: JSON.stringify({ action: "quote", nodeId: selected.id, sessionId }),
      });
      const data = await res.json();
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setQuote(data);
        // "sources I have quoted" (canvas item 3): keep the most recent
        // quote per node, newest node first.
        setQuotedSources((prev) => [
          { nodeId: selected.id, nodeTitle: selected.title, kind: data.kind, quotable_span: data.quotable_span, locator: data.locator, citation: data.citation },
          ...prev.filter((q) => q.nodeId !== selected.id),
        ]);
      }
    } finally {
      setBusy(null);
    }
  }

  async function runCheck() {
    if (!token || !selected || !explanation.trim()) return;
    setBusy("check");
    setCheckResult(null);
    setCheckAttemptId(null);
    setCheckConfidence("");
    setCheckSourcePrediction("");
    setCheckForcingError(null);
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "check", nodeId: selected.id, explanation, sessionId }),
      });
      const data = await res.json();
      if (handleConsentResponse(res, data)) return;
      if (!res.ok) {
        setCheckResult({ result: "error", feedback: data.error || "Check failed.", citations: [] });
        return;
      }
      if (data.forcingRequired) {
        // Cognitive forcing on (default arm): the verdict is held until
        // the questions below are answered. No feedback/result/citations
        // key exists in `data` at all in this branch.
        setCheckAttemptId(data.attemptId);
      } else {
        // This learner's own arm has forcing off: same immediate reveal
        // as before this pass.
        setCheckResult(data);
        loadRoute();
      }
    } finally {
      setBusy(null);
    }
  }

  /** Cognitive forcing's reveal step (PLAN-REVISION-2.md section 2a): sends
   * the held-back confidence rating and source prediction on the same
   * attemptId runCheck received; the server will not return the tutor's
   * verdict without both (workspace/route.ts's "check" phase 2). */
  async function runCheckReveal() {
    if (!token || !selected || !checkAttemptId || !checkConfidence || !checkSourcePrediction) return;
    setBusy("check_reveal");
    setCheckForcingError(null);
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "check",
          nodeId: selected.id,
          attemptId: checkAttemptId,
          learnerConfidence: checkConfidence,
          sourcePrediction: checkSourcePrediction,
          sessionId,
        }),
      });
      const data = await res.json();
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setCheckResult(data);
        setCheckAttemptId(null);
        loadRoute();
      } else {
        setCheckForcingError(data.error || "Could not show your results yet.");
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
        body: JSON.stringify({ action: "organize", claim: organizeClaim, evidenceNotes: organizeEvidence, sourceNotes: organizeSources, sessionId }),
      });
      const data = await res.json();
      if (handleConsentResponse(res, data)) return;
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
      // ros-04 fix: this call used to send only {nodeId, action}, never the
      // learner's own answer text -- EVIDENCE-SCHEMA.md's "no stored ...
      // transfer-item answer" gap. `answer` and `itemId` now round-trip
      // onto the evidence event (stages.ts's onTransferItemAnswered).
      const res = await fetch("/api/research-os/state", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId: selected.id, action: "transfer_item", answer: transferAnswer, itemId: TRANSFER_ITEM_ID, sessionId }),
      });
      // ros-07: this call ignored its own response status before this pass
      // (a consent block used to look identical to a successful save).
      // Checking res.ok here closes a real gap without expanding scope: it
      // is the only way to tell a blocked write from a saved one.
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data as { error?: string; message?: string; needsProfile?: boolean })) return;
      if (res.ok) {
        setTransferSaved(true);
        loadRoute();
      }
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
          // Production guard, task item 3: optional in Phase 0, required
          // at submission for an internalization-tier claim
          // (production-guard.ts's requiresCounterEvidence); the route
          // itself enforces that, this just always forwards what is
          // here, same discipline claim/evidence/sources already keep.
          counterEvidence: production.counterEvidence.split("\n").filter(Boolean),
          status,
          sessionId,
        }),
      });
      const data = await res.json();
      if (handleConsentResponse(res, data)) {
        setProductionStatus(null);
        return;
      }
      setProductionStatus(res.ok ? `${status} saved` : data.error || "save_failed");
      if (res.ok) loadRoute();
    } finally {
      setBusy(null);
    }
  }

  async function exportMyData() {
    if (!token) return;
    setPrivacyBusy("export");
    setPrivacyNotice(null);
    try {
      const res = await fetch("/api/research-os/privacy", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "export" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPrivacyNotice(data.error || "export_failed");
        return;
      }
      // Client-side download only; nothing here is a second copy on any
      // server this app controls beyond the response itself.
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `research-os-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPrivacyNotice("Export downloaded.");
    } catch {
      setPrivacyNotice("network_error");
    } finally {
      setPrivacyBusy(null);
    }
  }

  async function deleteMyData() {
    // Server-side enforced too (POST /api/research-os/privacy checks
    // isDeleteConfirmed before anything else runs): this client-side check
    // only keeps the button disabled until the typed text matches, it is
    // not the real gate.
    if (!token || deleteConfirmText.trim() !== DELETE_CONFIRM_TOKEN) return;
    setPrivacyBusy("delete");
    setPrivacyNotice(null);
    try {
      const res = await fetch("/api/research-os/privacy", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "delete", confirm: DELETE_CONFIRM_TOKEN }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPrivacyNotice(data.error || "delete_failed");
        return;
      }
      setPrivacyNotice("Your data has been deleted.");
      setDeleteConfirmOpen(false);
      setDeleteConfirmText("");
      await signOut();
    } catch {
      setPrivacyNotice("network_error");
    } finally {
      setPrivacyBusy(null);
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

        {/* ros-07: any gated write's 403 consent block surfaces here. */}
        {consentNotice && (
          <div className="mt-6 p-4 bg-[color:var(--bone)] border border-[color:var(--gold-deep)]">
            <p className="text-[13px] text-[color:var(--basalt)]">{consentNotice.message}</p>
            {consentNotice.needsProfile && (
              <Link
                href="/research-os/profile"
                className="mt-2 inline-block text-[12px] small-caps underline decoration-[color:var(--gold)] underline-offset-4"
              >
                complete your profile →
              </Link>
            )}
          </div>
        )}

        {routeError && (
          <p className="mt-6 text-[13px] text-red-700">
            Could not load the route ({routeError}). If this is a fresh environment, run the migration and{" "}
            <code>node scripts/seed-research-os.mjs</code> first.
          </p>
        )}

        {/* Phase 1 (bkt-ros item 2): diagnostic probe, shown only when the
            signed-in learner has no state on any ancestor of the target. */}
        {probe?.due && probe.questions.length > 0 && (
          <div className="mt-8 p-4 bg-[color:var(--bone)] border border-[color:var(--gold-deep)]">
            <div className="font-display uppercase text-[14px] mb-1">quick check first</div>
            <p className="text-[12px] text-[color:var(--basalt-2)] mb-3">
              Before the map: what do you already know? Answer any of these in your own words -- the AI only grades
              against what you already know, it never writes the answer for you.
            </p>
            <div className="flex flex-col gap-4">
              {probe.questions.map((q) => {
                const result = probeResults[q.nodeId];
                return (
                  <div key={q.nodeId} className="border-t border-[color:var(--hairline)] pt-3">
                    <div className="text-[13px] text-[color:var(--basalt)]">{q.prompt}</div>
                    <textarea
                      value={probeAnswers[q.nodeId] || ""}
                      onChange={(e) => setProbeAnswers((a) => ({ ...a, [q.nodeId]: e.target.value }))}
                      className="mt-2 border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 min-h-[60px]"
                    />
                    <button
                      onClick={() => submitProbeAnswer(q.nodeId)}
                      disabled={!token || probeBusy === q.nodeId || !!result}
                      className="mt-2 text-[12px] small-caps underline disabled:opacity-50"
                    >
                      {probeBusy === q.nodeId ? "checking…" : result ? "checked" : "check my answer"}
                    </button>
                    {result && (
                      <p className="mt-1 text-[12px] text-[color:var(--basalt-2)]">
                        <strong>{result.result}</strong>: {result.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {route && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
            {/* Left column: the routed chain, one stop per prerequisite
                node between the learner's frontier and the target
                (ros-04 canvas item 3). Stage badges as before; a
                low-confidence badge (ros-03/PR #27's lowConfidenceFlags)
                now marks a step whose own edge toward the target fell
                below the routing confidence floor and should have a
                teacher's eyes on it. */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-px bg-[color:var(--hairline)]">
                {route.chain.map((step) => {
                  const flag = route.lowConfidenceFlags.find((f) => f.fromNodeId === step.node.id);
                  return (
                    <button
                      key={step.node.id}
                      onClick={() => openNode(step.node)}
                      className="text-left bg-[color:var(--bone)] p-3 flex items-center justify-between gap-2"
                      style={{ outline: selected?.id === step.node.id ? "2px solid var(--gold-deep)" : "none" }}
                    >
                      <span className="text-[13px] text-[color:var(--basalt)] min-w-0 truncate">{step.node.title}</span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {flag && (
                          <span
                            className="inline-flex items-center text-[10px] small-caps tracking-[0.1em] px-2 py-1 rounded-sm bg-red-100 text-red-800"
                            title={`Routing confidence ${Math.round(flag.confidence * 100)}%, below the review floor. A teacher should confirm this prerequisite link.`}
                          >
                            needs review
                          </span>
                        )}
                        <StageBadge stage={step.stage} />
                      </span>
                    </button>
                  );
                })}
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
                    <div className="mt-2 text-[12px] text-[color:var(--basalt-2)]">
                      {quote.kind === "summary" && (
                        <div className="small-caps text-[10px] text-[color:var(--aegean-deep)] mb-1">
                          summary (no verified verbatim passage for this source yet)
                        </div>
                      )}
                      <p>
                        &ldquo;{quote.quotable_span}&rdquo;, {quote.citation}
                        {quote.locator ? ` (${quote.locator})` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-[color:var(--bone)] p-4">
                  <div className="font-display uppercase text-[14px] mb-2">check</div>

                  {/* Phase 0: write the explanation. Hides once a held
                      attempt or a revealed result exists. */}
                  {!checkAttemptId && !checkResult && (
                    <>
                      {selected && <WorkedExampleBlock node={selected} guidance={route.guidance ?? "medium"} />}
                      <textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="explain this node in your own words…"
                        className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 min-h-[70px]"
                      />
                      <button onClick={runCheck} disabled={!token || !selected || busy === "check"} className="mt-2 text-[12px] small-caps underline">
                        {busy === "check" ? "checking…" : "check my explanation"}
                      </button>
                    </>
                  )}

                  {/* Phase 1, cognitive forcing (PLAN-REVISION-2.md section
                      2a): a held attempt with no reveal yet. Both
                      questions must be answered before the tutor's
                      feedback shows, enforced server-side (workspace/
                      route.ts's "check" phase 2, forcing.ts's held-attempt
                      store). */}
                  {checkAttemptId && !checkResult && (
                    <div className="flex flex-col gap-4">
                      <p className="text-[12px] text-[color:var(--basalt-2)]">
                        Good. Answer these two questions to see your results.
                      </p>

                      <fieldset className="flex flex-col gap-2">
                        <legend className="text-[11px] small-caps text-[color:var(--aegean-deep)] mb-1">{CONFIDENCE_QUESTION_COPY}</legend>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {LEARNER_CONFIDENCE_VALUES.map((v) => (
                            <label key={v} className="flex items-center gap-2 text-[13px] text-[color:var(--basalt)]">
                              <input
                                type="radio"
                                name="check-confidence"
                                value={v}
                                checked={checkConfidence === v}
                                onChange={() => setCheckConfidence(v)}
                              />
                              {LEARNER_CONFIDENCE_COPY[v]}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <fieldset className="flex flex-col gap-2">
                        <legend className="text-[11px] small-caps text-[color:var(--aegean-deep)] mb-1">{SOURCE_PREDICTION_QUESTION_COPY}</legend>
                        {quotedCitationOptions.length === 0 && (
                          <p className="text-[12px] text-[color:var(--basalt-2)]">
                            Quote a source first (above), then come back and pick it here.
                          </p>
                        )}
                        {quotedCitationOptions.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {quotedCitationOptions.map((c) => (
                              <label key={c} className="flex items-start gap-2 text-[13px] text-[color:var(--basalt)]">
                                <input
                                  type="radio"
                                  name="check-source-prediction"
                                  value={c}
                                  checked={checkSourcePrediction === c}
                                  onChange={() => setCheckSourcePrediction(c)}
                                  className="mt-1"
                                />
                                {c}
                              </label>
                            ))}
                          </div>
                        )}
                      </fieldset>

                      <button
                        onClick={runCheckReveal}
                        disabled={!checkConfidence || !checkSourcePrediction || busy === "check_reveal"}
                        className="text-[12px] small-caps underline self-start disabled:opacity-50"
                      >
                        {busy === "check_reveal" ? "showing your results…" : "show my results"}
                      </button>
                      {checkForcingError && <p className="text-[12px] text-red-700">{checkForcingError}</p>}
                    </div>
                  )}

                  {/* Phase 2: revealed. */}
                  {checkResult && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[12px] text-[color:var(--basalt-2)]">
                        <strong>{checkResult.result}</strong>: {checkResult.feedback}
                      </p>
                      {checkResult.learnerConfidence && (
                        <div className="text-[12px] text-[color:var(--basalt-2)] border-t border-[color:var(--hairline)] pt-2">
                          <p>
                            You guessed: {checkResult.sourcePrediction || "(nothing picked)"}
                          </p>
                          <p>
                            The tutor used: {checkResult.citations[0] || "no source"}
                          </p>
                          <p>{checkResult.predictionCorrect ? "You picked the right source." : "Not quite the right source this time."}</p>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setExplanation("");
                          setCheckResult(null);
                          setCheckAttemptId(null);
                          setCheckConfidence("");
                          setCheckSourcePrediction("");
                        }}
                        className="text-[12px] small-caps underline self-start"
                      >
                        check another explanation
                      </button>
                    </div>
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
                  {organized?.abstained && (
                    <p className="mt-2 text-[11px] text-[color:var(--basalt-2)]">
                      Nothing here was grounded in your own notes, so Organize left the scaffold empty rather than adding anything new. Write more in
                      claim/evidence/source notes and try again.
                    </p>
                  )}
                  {organized && !organized.abstained && <p className="mt-2 text-[11px] text-[color:var(--basalt-2)]">Copied into the Production form below.</p>}
                </div>
              </div>

              {/* Right column, "the learner's workspace" (ros-04 canvas item
                  3): a free scratch notes area, separate from the graded
                  Production form below it. */}
              <div className="p-4 bg-[color:var(--bone)]">
                <label htmlFor="research-os-notes" className="font-display uppercase text-[14px] mb-2 block">
                  notes
                </label>
                <textarea
                  id="research-os-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ungraded scratch space, saved on this device only…"
                  className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 min-h-[90px]"
                />
              </div>

              {/* "sources I have quoted" (ros-04 canvas item 3): every
                  distinct Quote result this sitting, client-accumulated
                  from runQuote's own response. */}
              {quotedSources.length > 0 && (
                <div className="p-4 bg-[color:var(--bone)]">
                  <div className="font-display uppercase text-[14px] mb-2">sources i have quoted</div>
                  <ul className="flex flex-col gap-3">
                    {quotedSources.map((q) => (
                      <li key={q.nodeId} className="text-[12px] text-[color:var(--basalt-2)] border-t border-[color:var(--hairline)] pt-2">
                        <div className="small-caps text-[10px] text-[color:var(--aegean-deep)]">{q.nodeTitle}{q.kind === "summary" ? " · summary" : ""}</div>
                        <p>
                          &ldquo;{q.quotable_span}&rdquo;, {q.citation}
                          {q.locator ? ` (${q.locator})` : ""}
                        </p>
                        {/* Production guard, task item 1: a source only
                            verifies against a real Quote call when its own
                            text carries that call's locator. Adding this
                            exact line to the sources field below is what
                            makes the source verifiable; typing it from
                            memory is not. */}
                        <button
                          onClick={() => {
                            const line = `${q.citation}${q.locator ? ` (${q.locator})` : ""}`;
                            setProduction((p) => ({ ...p, sources: p.sources ? `${p.sources}\n${line}` : line }));
                          }}
                          className="mt-1 text-[11px] small-caps underline underline-offset-4"
                        >
                          add to sources
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
                <label className="text-[11px] small-caps text-[color:var(--aegean-deep)]">
                  counter-evidence, one per line (required once you have reached internalization)
                </label>
                <textarea
                  value={production.counterEvidence}
                  onChange={(e) => setProduction((p) => ({ ...p, counterEvidence: e.target.value }))}
                  placeholder="what would someone argue against this claim, and why doesn't it hold up?"
                  className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 mb-2 min-h-[60px]"
                />
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

        {/* ros-07 ("consent gate wiring"): self-service export/delete
            against POST /api/research-os/privacy (PR #35). Shown only
            signed in, matching that route's own self-gated posture. */}
        {token && (
          <footer className="mt-14 pt-6 border-t border-[color:var(--hairline)] flex flex-col gap-3">
            <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)]">§ your data</div>
            <div className="flex flex-wrap gap-3 items-start">
              <button
                onClick={exportMyData}
                disabled={privacyBusy === "export"}
                className="px-4 py-2 text-[12px] small-caps border border-[color:var(--basalt)] text-[color:var(--basalt)] disabled:opacity-50"
              >
                {privacyBusy === "export" ? "exporting…" : "export my data"}
              </button>

              {!deleteConfirmOpen ? (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="px-4 py-2 text-[12px] small-caps border border-red-700 text-red-700"
                >
                  delete my data
                </button>
              ) : (
                <div className="flex flex-col gap-2 p-3 border border-red-700 bg-white/60 w-full max-w-sm">
                  <p className="text-[12px] text-[color:var(--basalt-2)]">
                    This permanently removes every record of your work. It cannot be undone. Type{" "}
                    <strong>{DELETE_CONFIRM_TOKEN}</strong> to confirm.
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={DELETE_CONFIRM_TOKEN}
                      className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] bg-white/60 w-[120px]"
                    />
                    <button
                      onClick={deleteMyData}
                      disabled={deleteConfirmText.trim() !== DELETE_CONFIRM_TOKEN || privacyBusy === "delete"}
                      className="px-3 py-2 text-[12px] small-caps bg-red-700 text-white disabled:opacity-50"
                    >
                      {privacyBusy === "delete" ? "deleting…" : "confirm delete"}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setDeleteConfirmText("");
                      }}
                      className="text-[12px] small-caps underline underline-offset-4"
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            {privacyNotice && <p className="text-[12px] text-[color:var(--basalt-2)]">{privacyNotice}</p>}
          </footer>
        )}
      </div>
    </main>
  );
}
