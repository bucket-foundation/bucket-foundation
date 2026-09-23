"use client";

import { OUTAGE_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import type { LearnerAssignment } from "@/lib/research-os/class-db";
import { firstOpenTarget } from "@/lib/research-os/assignments";
import EvidenceFind from "./EvidenceFind";
import type { ProbeAnswerResponse } from "@/lib/research-os/api-shapes";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import SignInGate from "@/components/auth/SignInGate";
import TargetPicker from "./TargetPicker";
import ProduceBlock, { type ProduceKind } from "./ProduceBlock";
import {
  LEARNER_CONFIDENCE_VALUES,
  LEARNER_CONFIDENCE_COPY,
  CONFIDENCE_QUESTION_COPY,
  SOURCE_PREDICTION_QUESTION_COPY,
  type LearnerConfidence,
} from "@/lib/research-os/forcing";
import { SECOND_SOURCE_QUESTION_COPY, SECOND_SOURCE_AGREE_QUESTION_COPY } from "@/lib/research-os/lateral-reading";
import { DELETE_CONFIRM_TOKEN } from "@/lib/research-os/types";
import { firstHalfOfWorkedExample } from "@/lib/research-os/worked-examples";
import AccessBlock from "./AccessBlock";
import LearnBlock from "./LearnBlock";
import MapBlock from "./MapBlock";
import PenBlock from "./PenBlock";
import PathMap from "./PathMap";
import AssignmentsBanner from "./AssignmentsBanner";
import DirectionsBlock from "./DirectionsBlock";

const DEFAULT_TARGET_SLUG = "why-the-sky-is-blue";

const transferItemIdFor = (targetSlug: string) => `${targetSlug}::transfer-v1`;

const SESSION_STORAGE_KEY = "research-os-session-id";
const notesStorageKeyFor = (targetSlug: string) => `research-os-notes:${targetSlug}`;

function readOrCreateSessionId(): string {
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

type Stage = "access" | "awareness" | "understanding" | "internalization" | "production";
type GuidanceLevel = "high" | "medium" | "low";

interface GraphNodeLite {
  id: string;
  slug: string;
  title: string;
  kind: string;
  tier: number;
  summary: string | null;
  branch?: string;
  provenance?: { author?: string; year?: number; title?: string; publisher?: string; url?: string; doi?: string; [k: string]: unknown };
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
interface LowConfidenceFlag {
  edgeId?: string;
  fromNodeId: string;
  toNodeId: string;
  confidence: number;
}

interface RouteResponse {
  llmEnabled?: boolean;
  target: GraphNodeLite;
  frontier: GraphNodeLite[];
  chain: ChainStep[];
  gap: GraphNodeLite[];
  lowConfidenceFlags: LowConfidenceFlag[];
  engineFrontier: EngineFrontierCandidate[];
  guidance: GuidanceLevel | null;
  learner: "self" | "anonymous";
  error?: string;
}

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
type ProbeAnswerResult =
  | ({ ok: true } & Pick<ProbeAnswerResponse, "result" | "feedback" | "stage">)
  | { ok: false; feedback: string };

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

function Workspace() {
  const searchParams = useSearchParams();
  const targetParam = searchParams.get("target")?.trim() ?? "";
  const queryParam = searchParams.get("q")?.trim() ?? "";
  const hasTarget = Boolean(targetParam);
  const targetSlug = targetParam || DEFAULT_TARGET_SLUG;
  const transferItemId = transferItemIdFor(targetSlug);
  const notesStorageKey = notesStorageKeyFor(targetSlug);
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);

  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNodeLite | null>(null);

  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    setSessionId(readOrCreateSessionId());
  }, []);

  const [locateQuery, setLocateQuery] = useState(queryParam);
  useEffect(() => {
    if (!token || hasTarget) return;
    fetch("/api/research-os/assignments?mine=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { assignments: [] }))
      .then((j: { assignments?: LearnerAssignment[] }) => {
        const open = firstOpenTarget(j.assignments ?? []);
        if (open?.targetSlug && open.targetSlug !== targetSlug) {
          window.location.replace(`/research-os/workspace?target=${encodeURIComponent(open.targetSlug)}`);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, hasTarget, targetSlug]);
  const locateFromUrl = useRef(Boolean(queryParam));
  const [locateResults, setLocateResults] = useState<Array<{ nodeId: string; slug: string; title: string; summary: string | null; citation: string }>>([]);
  const [quote, setQuote] = useState<{ kind?: "quote" | "summary"; quotable_span: string | null; locator?: string | null; citation: string } | null>(null);
  const [quotedSources, setQuotedSources] = useState<Array<{ nodeId: string; nodeTitle: string; kind?: "quote" | "summary"; quotable_span: string | null; locator?: string | null; citation: string }>>([]);
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
  const [checkAttemptId, setCheckAttemptId] = useState<string | null>(null);
  const [checkConfidence, setCheckConfidence] = useState<LearnerConfidence | "">("");
  const [checkSourcePrediction, setCheckSourcePrediction] = useState("");
  const [checkVerdict, setCheckVerdict] = useState<"support" | "contradiction" | "">("");
  const [checkForcingError, setCheckForcingError] = useState<string | null>(null);
  const [secondSourceQuery, setSecondSourceQuery] = useState("");
  const [secondSourceCandidates, setSecondSourceCandidates] = useState<Array<{ nodeId: string; title: string; citation: string; independenceReason: string }>>([]);
  const [secondSourceNodeId, setSecondSourceNodeId] = useState("");
  const [secondSourceQuoted, setSecondSourceQuoted] = useState(false);
  const [secondSourcePassagesAgree, setSecondSourcePassagesAgree] = useState<"agree" | "disagree" | "">("");
  const [secondSourceBusy, setSecondSourceBusy] = useState(false);
  const [organizeClaim, setOrganizeClaim] = useState("");
  const [organizeEvidence, setOrganizeEvidence] = useState("");
  const [organizeSources, setOrganizeSources] = useState("");
  const [organized, setOrganized] = useState<{ claim: string; evidence: string[]; sources: string[]; abstained?: boolean } | null>(null);
  const [transferAnswer, setTransferAnswer] = useState("");
  const [transferSaved, setTransferSaved] = useState(false);
  const [transferNote, setTransferNote] = useState<string | null>(null);
  const [production, setProduction] = useState({ claim: "", evidence: "", sources: "", transferProof: "", counterEvidence: "" });
  const [productionStatus, setProductionStatus] = useState<string | null>(null);
  const [productionKind, setProductionKind] = useState<"production" | ProduceKind>("production");
  const [relatedNode, setRelatedNode] = useState<GraphNodeLite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  useEffect(() => {
    try {
      setNotes(window.localStorage.getItem(notesStorageKey) || "");
    } catch {
    }
  }, [notesStorageKey]);
  useEffect(() => {
    try {
      window.localStorage.setItem(notesStorageKey, notes);
    } catch {
    }
  }, [notes, notesStorageKey]);

  const [probe, setProbe] = useState<ProbeResponse | null>(null);
  const [probeNote, setProbeNote] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [locateNote, setLocateNote] = useState<string | null>(null);
  const [quoteNote, setQuoteNote] = useState<string | null>(null);
  const [secondSourceNote, setSecondSourceNote] = useState<string | null>(null);
  const [organizeNote, setOrganizeNote] = useState<string | null>(null);
  const [probeAnswers, setProbeAnswers] = useState<Record<string, string>>({});
  const [probeResults, setProbeResults] = useState<Record<string, ProbeAnswerResult>>({});
  const [probeBusy, setProbeBusy] = useState<string | null>(null);

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

  const handleConsentResponse = useCallback((res: Response, data: { error?: string; message?: string; needsProfile?: boolean }): boolean => {
    if (res.status === 503 && data?.error === "consent_unavailable") {
      setConsentNotice({
        message: data.message || "Consent could not be checked right now. Try again in a moment.",
        needsProfile: false,
      });
      return true;
    }
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
      const res = await fetch(`/api/research-os/route?target=${encodeURIComponent(targetSlug)}`, { headers: authHeaders() });
      const data = (await res.json().catch(() => ({}))) as RouteResponse;
      if (!res.ok) {
        setRouteError(isTransientOutage(res.status, data.error ?? null) ? OUTAGE_COPY.body : data.error || "route_failed");
        return;
      }
      setRoute(data);
      if (!selected) setSelected(data.target);
    } catch {
      setRouteError("network_error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders, targetSlug]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  const loadProbe = useCallback(async () => {
    if (!token) {
      setProbe(null);
      return;
    }
    try {
      const res = await fetch(`/api/research-os/probe?target=${encodeURIComponent(targetSlug)}`, { headers: authHeaders() });
      const data = (await res.json().catch(() => ({}))) as ProbeResponse;
      setProbeNote(!res.ok && isTransientOutage(res.status, (data as { error?: string }).error ?? null) ? OUTAGE_COPY.body : null);
      setProbe(res.ok ? data : null);
    } catch {
      setProbe(null);
    }
  }, [token, authHeaders, targetSlug]);

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
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setProbeResults((r) => ({ ...r, [nodeId]: { ok: true, ...data } }));
        loadProbe();
        loadRoute();
      } else {
        const feedback = isTransientOutage(res.status, (data as { error?: string }).error ?? null)
          ? OUTAGE_COPY.body
          : data.error || "Probe grading failed.";
        setProbeResults((r) => ({ ...r, [nodeId]: { ok: false, feedback } }));
      }
    } finally {
      setProbeBusy(null);
    }
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
    if (!token) return;
    try {
      const res = await fetch("/api/research-os/state", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId: node.id, action: "open", sessionId }),
      });
      setOpenNote(!res.ok && isTransientOutage(res.status, await readErrorCode(res)) ? OUTAGE_COPY.body : null);
      loadRoute();
    } catch {
    }
  }

  useEffect(() => {
    if (token && locateFromUrl.current && locateQuery.trim()) {
      locateFromUrl.current = false;
      void runLocate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function runLocate() {
    if (!token || !locateQuery.trim()) return;
    setBusy("locate");
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "locate", query: locateQuery, sessionId }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) {
        setLocateResults([]);
        return;
      }
      setLocateNote(!res.ok && isTransientOutage(res.status, (data as { error?: string }).error ?? null) ? OUTAGE_COPY.body : null);
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
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setQuote(data);
        setQuotedSources((prev) => [
          { nodeId: selected.id, nodeTitle: selected.title, kind: data.kind, quotable_span: data.quotable_span, locator: data.locator, citation: data.citation },
          ...prev.filter((q) => q.nodeId !== selected.id),
        ]);
        setQuoteNote(null);
      } else {
        setQuoteNote(
          isTransientOutage(res.status, (data as { error?: string }).error ?? null)
            ? OUTAGE_COPY.body
            : "That source could not be quoted.",
        );
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
    setSecondSourceQuery("");
    setSecondSourceCandidates([]);
    setSecondSourceNodeId("");
    setSecondSourceQuoted(false);
    setSecondSourcePassagesAgree("");
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "check",
          nodeId: selected.id,
          explanation,
          sessionId,
          verdict: checkVerdict || undefined,
          quotes: quotedSources.map((q) => ({ quotable_span: q.quotable_span, citation: q.citation })),
        }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) return;
      if (!res.ok) {
        const feedback = isTransientOutage(res.status, (data as { error?: string }).error ?? null)
          ? OUTAGE_COPY.body
          : data.error || "Check failed.";
        setCheckResult({ result: "error", feedback, citations: [] });
        return;
      }
      if (data.forcingRequired) {
        setCheckAttemptId(data.attemptId);
      } else {
        setCheckResult(data);
        loadRoute();
      }
    } finally {
      setBusy(null);
    }
  }

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
          verdict: checkVerdict || undefined,
          quotes: quotedSources.map((q) => ({ quotable_span: q.quotable_span, citation: q.citation })),
          secondSourceNodeId: secondSourceNodeId || undefined,
          passagesAgree: secondSourcePassagesAgree === "agree",
          sessionId,
        }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setCheckResult(data);
        setCheckAttemptId(null);
        loadRoute();
      } else {
        setCheckForcingError(
          isTransientOutage(res.status, (data as { error?: string }).error ?? null)
            ? OUTAGE_COPY.body
            : data.error || "Could not show your results yet.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function runFindSecondSource() {
    if (!token || !selected) return;
    setSecondSourceBusy(true);
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          action: "locate",
          mode: "secondSource",
          query: secondSourceQuery.trim() || selected.title,
          quotedSourceNodeId: selected.id,
          sessionId,
        }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) {
        setSecondSourceCandidates([]);
        return;
      }
      setSecondSourceNote(!res.ok && isTransientOutage(res.status, (data as { error?: string }).error ?? null) ? OUTAGE_COPY.body : null);
      setSecondSourceCandidates(res.ok ? data.results : []);
    } finally {
      setSecondSourceBusy(false);
    }
  }

  async function runQuoteSecondSource(nodeId: string, nodeTitle: string) {
    if (!token) return;
    setSecondSourceBusy(true);
    try {
      const res = await fetch("/api/research-os/workspace", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "quote", nodeId, sessionId }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setQuotedSources((prev) => [
          { nodeId, nodeTitle, kind: data.kind, quotable_span: data.quotable_span, locator: data.locator, citation: data.citation },
          ...prev.filter((q) => q.nodeId !== nodeId),
        ]);
        setSecondSourceNodeId(nodeId);
        setSecondSourceQuoted(true);
        setSecondSourceNote(null);
      } else {
        setSecondSourceNote(
          isTransientOutage(res.status, (data as { error?: string }).error ?? null)
            ? OUTAGE_COPY.body
            : "That second source could not be quoted.",
        );
      }
    } finally {
      setSecondSourceBusy(false);
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
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) return;
      if (res.ok) {
        setOrganized(data);
        setProduction((p) => ({ ...p, claim: data.claim || p.claim, evidence: (data.evidence || []).join("\n"), sources: (data.sources || []).join("\n") }));
        setOrganizeNote(null);
      } else {
        setOrganizeNote(
          isTransientOutage(res.status, (data as { error?: string }).error ?? null)
            ? OUTAGE_COPY.body
            : "That could not be organized.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  async function saveTransferAnswer() {
    if (!token || !selected || !transferAnswer.trim()) return;
    setBusy("transfer");
    try {
      const res = await fetch("/api/research-os/state", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nodeId: selected.id, action: "transfer_item", answer: transferAnswer, itemId: transferItemId, sessionId }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data as { error?: string; message?: string; needsProfile?: boolean })) return;
      if (res.ok) {
        setTransferNote(null);
        setTransferSaved(true);
        loadRoute();
        return;
      }
      const code = (data as { error?: string }).error ?? null;
      setTransferNote(isTransientOutage(res.status, code) ? OUTAGE_COPY.body : "That answer was not recorded.");
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
          kind: productionKind,
          relatedNodeId: relatedNode?.id ?? null,
          evidence: production.evidence.split("\n").filter(Boolean),
          sources: production.sources.split("\n").filter(Boolean),
          transferProof: { text: production.transferProof },
          counterEvidence: production.counterEvidence.split("\n").filter(Boolean),
          status,
          sessionId,
        }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (handleConsentResponse(res, data)) {
        setProductionStatus(null);
        return;
      }
      setProductionStatus(
        res.ok
          ? `${status} saved`
          : isTransientOutage(res.status, (data as { error?: string }).error ?? null)
            ? OUTAGE_COPY.body
            : data.error || "save_failed",
      );
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
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (!res.ok) {
        setPrivacyNotice(data.error || "export_failed");
        return;
      }
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
    if (!token || deleteConfirmText.trim() !== DELETE_CONFIRM_TOKEN) return;
    setPrivacyBusy("delete");
    setPrivacyNotice(null);
    try {
      const res = await fetch("/api/research-os/privacy", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action: "delete", confirm: DELETE_CONFIRM_TOKEN }),
      });
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
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

  if (!hasTarget) return <TargetPicker />;

  return (
    <main>
      <div className="max-w-[1100px] mx-0 px-0 py-0">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / workspace"}
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)] [text-wrap:balance]">
          {route?.target?.title ?? "workspace"}
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          {route?.target?.summary ?? "The path to this target from what you already hold. Your level on each node is recorded as you work."}
          {route?.target && (
            <>
              {" "}
              <Link href={`/research-os/n/${encodeURIComponent(route.target.slug)}`} className="underline decoration-[color:var(--gold)] underline-offset-4">
                open the node page
              </Link>
              {" · "}
              <Link href="/research-os/workspace" className="underline decoration-[color:var(--gold)] underline-offset-4">
                change target
              </Link>
            </>
          )}
        </p>

        <SignInGate signedIn={Boolean(token)} />

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

        {probeNote && (
          <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
            {probeNote}
          </p>
        )}
        {openNote && (
          <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
            {openNote}
          </p>
        )}
        {locateNote && (
          <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
            {locateNote}
          </p>
        )}
        {quoteNote && (
          <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
            {quoteNote}
          </p>
        )}
        {secondSourceNote && (
          <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
            {secondSourceNote}
          </p>
        )}
        {organizeNote && (
          <p role="alert" className="text-[11px] text-[color:var(--gold-deep)]">
            {organizeNote}
          </p>
        )}
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
                        {result.ok ? (
                          <>
                            <strong>{result.result}</strong>: {result.feedback}
                          </>
                        ) : (
                          <>{result.feedback}</>
                        )}
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
            <div className="flex flex-col gap-4">
              <AssignmentsBanner token={token} currentTarget={targetSlug} />
              <PathMap
                steps={route.chain.map((s) => ({ id: s.node.id, title: s.node.title, stage: s.stage, isFrontier: s.isFrontier }))}
                selectedId={selected?.id ?? null}
                onSelect={(id) => {
                  const s = route.chain.find((x) => x.node.id === id);
                  if (s) setSelected(s.node);
                }}
              />
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

            <div className="flex flex-col gap-6">
              {selected && (
                <div className="p-5 bg-[color:var(--bone)]">
                  <div className="text-[11px] small-caps tracking-[0.14em] text-[color:var(--aegean-deep)]">
                    {selected.kind} · tier {selected.tier}
                  </div>
                  <h2 className="font-display uppercase text-[20px] mt-1 text-[color:var(--basalt)]">{selected.title}</h2>
                  <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--basalt-2)]">{selected.summary}</p>
                  <Link href={`/research-os/n/${encodeURIComponent(selected.slug)}`} className="mt-2 inline-block text-[12px] small-caps underline decoration-[color:var(--gold)] underline-offset-4">
                    open the node page →
                  </Link>
                  <LearnBlock node={selected} token={token} />
                  <DirectionsBlock
                    nodeId={selected.id}
                    branch={selected.branch ?? "02-physics"}
                    onSelect={(n) => setSelected({ id: n.id, slug: n.slug, title: n.title, kind: n.kind, tier: 0, summary: null })}
                  />
                  <AccessBlock nodeId={selected.id} token={token} />
                  <MapBlock node={selected} />
                  <PenBlock nodeId={selected.id} />
                  <ProduceBlock
                    node={selected}
                    active={productionKind}
                    onPick={(kind) => {
                      setProductionKind(kind);
                      setRelatedNode(selected);
                      document.getElementById("production")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                </div>
              )}

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
                  <EvidenceFind token={token} branch={selected?.branch ?? "02-physics"} targetNodeId={selected?.id ?? null} />
                </div>

                <div className="bg-[color:var(--bone)] p-4">
                  <div className="font-display uppercase text-[14px] mb-2">quote</div>
                  <button onClick={runQuote} disabled={!token || !selected || busy === "quote"} className="text-[12px] small-caps underline">
                    {busy === "quote" ? "fetching…" : "quote this node's source"}
                  </button>
                  {quoteNote && <p className="mt-2 text-[12px] text-red-700">{quoteNote}</p>}
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

                  {!checkAttemptId && !checkResult && (
                    <>
                      {selected && <WorkedExampleBlock node={selected} guidance={route.guidance ?? "medium"} />}
                      <textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="explain this node in your own words…"
                        className="border border-[color:var(--hairline)] px-2 py-1 text-[13px] w-full bg-white/60 min-h-[70px]"
                      />
                      {route.llmEnabled === false && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
                          <span className="text-[color:var(--basalt-3)]">your quotes</span>
                          {(["support", "contradiction"] as const).map((v) => (
                            <label key={v} className="inline-flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="check-verdict" value={v} checked={checkVerdict === v} onChange={() => setCheckVerdict(v)} />
                              {v} my explanation
                            </label>
                          ))}
                          <span className="text-[color:var(--basalt-3)]">no model reads this; a fixed rubric grades it</span>
                        </div>
                      )}
                      <button
                        onClick={runCheck}
                        disabled={!token || !selected || busy === "check" || (route.llmEnabled === false && !checkVerdict)}
                        className="mt-2 text-[12px] small-caps underline"
                      >
                        {busy === "check" ? "checking…" : "check my explanation"}
                      </button>
                    </>
                  )}

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

                      <fieldset className="flex flex-col gap-2">
                        <legend className="text-[11px] small-caps text-[color:var(--aegean-deep)] mb-1">{SECOND_SOURCE_QUESTION_COPY}</legend>
                        <p className="text-[12px] text-[color:var(--basalt-2)]">A different place. A different author than the one you already used.</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <input
                            value={secondSourceQuery}
                            onChange={(e) => setSecondSourceQuery(e.target.value)}
                            placeholder="search for another source…"
                            className="border border-[color:var(--hairline)] px-2 py-1 text-[12px] flex-1 min-w-[140px] bg-white/60"
                          />
                          <button
                            onClick={runFindSecondSource}
                            disabled={!token || !selected || secondSourceBusy}
                            className="text-[12px] small-caps underline disabled:opacity-50"
                          >
                            {secondSourceBusy ? "looking…" : "find another source"}
                          </button>
                        </div>
                        {secondSourceCandidates.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {secondSourceCandidates.map((c) => (
                              <label key={c.nodeId} className="flex items-start gap-2 text-[12px] text-[color:var(--basalt)]">
                                <input
                                  type="radio"
                                  name="second-source-pick"
                                  checked={secondSourceNodeId === c.nodeId}
                                  onChange={() => runQuoteSecondSource(c.nodeId, c.title)}
                                  className="mt-1"
                                />
                                <span>
                                  {c.citation} <span className="text-[11px] text-[color:var(--basalt-2)]">({c.independenceReason})</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                        {secondSourceQuoted && (
                          <fieldset className="flex flex-col gap-1">
                            <legend className="text-[11px] small-caps text-[color:var(--aegean-deep)]">{SECOND_SOURCE_AGREE_QUESTION_COPY}</legend>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              <label className="flex items-center gap-2 text-[12px] text-[color:var(--basalt)]">
                                <input
                                  type="radio"
                                  name="second-source-agree"
                                  checked={secondSourcePassagesAgree === "agree"}
                                  onChange={() => setSecondSourcePassagesAgree("agree")}
                                />
                                yes, they agree
                              </label>
                              <label className="flex items-center gap-2 text-[12px] text-[color:var(--basalt)]">
                                <input
                                  type="radio"
                                  name="second-source-agree"
                                  checked={secondSourcePassagesAgree === "disagree"}
                                  onChange={() => setSecondSourcePassagesAgree("disagree")}
                                />
                                no, they do not agree
                              </label>
                            </div>
                          </fieldset>
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
                          setSecondSourceQuery("");
                          setSecondSourceCandidates([]);
                          setSecondSourceNodeId("");
                          setSecondSourceQuoted(false);
                          setSecondSourcePassagesAgree("");
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

              {selected?.id === route.target.id && (
                <div className="p-4 bg-[color:var(--bone)]">
                  <div className="font-display uppercase text-[14px] mb-2">transfer item</div>
                  <p className="text-[12px] text-[color:var(--basalt-2)] mb-2">
                    {targetSlug === DEFAULT_TARGET_SLUG
                      ? "A sunset looks red. Using the lambda^-4 law, explain why the SAME scattering that makes the daytime sky blue makes a sunset red instead."
                      : `Take "${route?.target?.title ?? "this target"}" somewhere it was not taught: a case, a field, or a question outside this branch. Where does it hold, and where does it stop applying?`}
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
                  {transferNote && (
                    <p role="alert" className="mt-2 text-[11px] text-[color:var(--gold-deep)]">
                      {transferNote}
                    </p>
                  )}
                </div>
              )}

              <div id="production" />
              {productionKind !== "production" && relatedNode && (
                <p className="mb-2 text-[12px] text-[color:var(--basalt-2)]">
                  A {productionKind.replace("_", " ")} of <span className="text-[color:var(--basalt)]">{relatedNode.title}</span>.{" "}
                  <button type="button" onClick={() => { setProductionKind("production"); setRelatedNode(null); }} className="underline underline-offset-4">
                    make it a plain production instead
                  </button>
                </p>
              )}
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

export default function ResearchOsWorkspacePage() {
  return (
    <Suspense fallback={null}>
      <Workspace />
    </Suspense>
  );
}
