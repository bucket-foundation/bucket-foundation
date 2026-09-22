"use client";

/**
 * /research-os/class, the teacher class view (bkt-ros, ros-06 item 2).
 * Renders GET /api/research-os/class's already-computed, already-scoped
 * response: a grid of the reviewer's own learners by seed-path node, who
 * is blocked and where, who is ready for a harder target, and a queue of
 * Productions and internalization transfers awaiting judgment. All data
 * loading and every RLS-relevant computation happens server-side, in that
 * route; this page only renders the JSON it returns and links to
 * /research-os/review to act on a queue item (item 3's accept path lives
 * there, in one place).
 *
 * Auth reuses the same Supabase email-OTP flow as
 * src/app/research-os/review/page.tsx. Being signed in is necessary but
 * NOT sufficient: the API gates on
 * src/lib/research-os/reviewer.ts's RESEARCH_OS_REVIEWER_EMAILS allowlist,
 * so a signed-in non-reviewer sees a 403 here instead of the class list.
 *
 * The grid table can run wider than a phone screen (one column per
 * seed-path node); it scrolls inside its own `overflow-x-auto` container
 * rather than pushing the page wide, the same exception globals.css
 * already carves out for CodeBlock's `<pre overflow-x-auto>` beside the
 * page-wide `overflow-x: hidden` rule.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase/client";
import AssignmentsPanel from "./AssignmentsPanel";
import OverrideControl from "./OverrideControl";
import { OUTAGE_COPY, isTransientOutage } from "@/lib/research-os/outage";
import SignInGate from "@/components/auth/SignInGate";

type Stage = "access" | "awareness" | "understanding" | "internalization" | "production";

interface GridCell {
  nodeId: string;
  stage: Stage;
  updatedAt: string | null;
}
interface GridRow {
  learnerId: string;
  cells: GridCell[];
}
interface PathNode {
  id: string;
  slug: string;
  title: string;
}
interface ClassGrid {
  path: PathNode[];
  rows: GridRow[];
}
interface BlockedLearner {
  learnerId: string;
  nodeId: string;
  nodeTitle: string;
  stage: Stage;
  staleDays: number;
}
interface ReadyLearner {
  learnerId: string;
  nodeId: string;
  nodeTitle: string;
}
interface CalibrationRow {
  learnerId: string;
  n: number;
  meanConfidence: number;
  meanCorrectness: number;
}
interface ClassView {
  id: string;
  name: string;
  learnerIds: string[];
  /** ros-33: XP per learner, for the class leaderboard. */
  xpByLearner?: Record<string, number>;
  grid: ClassGrid;
  blocked: BlockedLearner[];
  readyForHarderTarget: ReadyLearner[];
  calibration: CalibrationRow[];
}
interface TransferHold {
  learnerId: string;
  nodeId: string;
  nodeTitle: string;
  stage: string;
  heldAt: string;
}
interface PendingProduction {
  id: string;
  learnerId: string;
  targetNodeId: string;
  targetTitle: string;
  claim: string | null;
  createdAt: string;
}
interface ClassResponse {
  classes: ClassView[];
  queue: { transferHolds: TransferHold[]; productions: PendingProduction[] };
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
      className="inline-flex items-center justify-center text-[9px] small-caps tracking-[0.1em] px-1.5 py-1 rounded-sm min-w-[64px]"
      style={{
        background: idx >= 2 ? "var(--gold)" : "var(--hairline)",
        color: idx >= 2 ? "var(--basalt)" : "var(--basalt-2)",
      }}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

function shortId(id: string) {
  return `${id.slice(0, 8)}…`;
}

export default function ResearchOsClassPage() {
  const supabase = useMemo(() => {
    try {
      return getSupabase();
    } catch {
      return null;
    }
  }, []);

  const [token, setToken] = useState<string | null>(null);

  const [data, setData] = useState<ClassResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const loadClasses = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    try {
      const res = await fetch("/api/research-os/class", { headers: authHeaders() });
      // A gateway 503 carries HTML, so parsing it before the ok check
      // threw and the outer catch reported a network error with no
      // retry. The rule decides now.
      const body = (res.ok ? await res.json() : await res.json().catch(() => ({}))) as ClassResponse & { error?: string };
      if (!res.ok) {
        // A sentinel, because the slot below is a code inside
        // parentheses and a sentence read as
        // "Could not load classes (The server could not finish the
        // read. Try again in a moment.)."
        setLoadError(res.status === 403 ? "forbidden" : isTransientOutage(res.status, body.error ?? null) ? "transient" : body.error || "load_failed");
        setData(null);
        return;
      }
      setData(body);
    } catch {
      setLoadError("network_error");
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);


  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
    setData(null);
  }

  return (
    <main>
      <div className="max-w-[1100px] mx-0 px-0 py-0">
        <div className="small-caps text-[10px] tracking-[0.22em] text-[color:var(--aegean-deep)] mb-3">
          <Link href="/research-os" className="underline decoration-[color:var(--gold)] underline-offset-4">
            § Research OS · K-12
          </Link>
          {" / class, Phase 1 teacher class view · "}
          <Link href="/research-os/review" className="underline decoration-[color:var(--gold)] underline-offset-4">
            review queue
          </Link>
        </div>
        <h1 className="font-display uppercase text-[clamp(1.5rem,4vw,2.5rem)] leading-[1.1] chisel text-[color:var(--basalt)]">
          class view
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--basalt-2)] max-w-2xl">
          The classes you teach: state per learner and seed-path node, who is blocked and where,
          who is ready for a harder target, and every Production or internalization transfer
          waiting on a decision. Create a class from home and share its join code.
        </p>

        <SignInGate signedIn={Boolean(token)} />

        {loadError === "forbidden" && token && (
          <p className="mt-6 text-[13px] text-red-700">
            This account is not on the reviewer allowlist. Ask an admin to add your email to
            RESEARCH_OS_REVIEWER_EMAILS (see src/lib/research-os/reviewer.ts).
          </p>
        )}
        {loadError === "transient" && <p className="mt-6 text-[13px] text-red-700">{OUTAGE_COPY.body}</p>}
        {loadError && loadError !== "forbidden" && loadError !== "transient" && <p className="mt-6 text-[13px] text-red-700">Could not load classes ({loadError}).</p>}

        {data && data.classes.length === 0 && (
          <p className="mt-8 text-[13px] text-[color:var(--basalt-2)]">
            No classes are registered under this reviewer email yet (graph.classes, migration
            20260910030000). Phase 1 rosters are added by hand; OneRoster/Clever/ClassLink sync is
            a later phase (see learning/research-os/TEACHER-LAYER.md).
          </p>
        )}

        {data &&
          data.classes.map((c) => (
            <section key={c.id} className="mt-10">
              <h2 className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-1">{c.name}</h2>
              <p className="text-[12px] text-[color:var(--basalt-2)] mb-3">{c.learnerIds.length} learner(s)</p>

              <AssignmentsPanel classId={c.id} path={c.grid.path} token={token} />

              {c.xpByLearner && Object.keys(c.xpByLearner).length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] small-caps tracking-[0.18em] text-[color:var(--aegean-deep)] mb-1">class leaderboard</div>
                  <ol className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ fontFamily: "var(--font-jetbrains)" }}>
                    {Object.entries(c.xpByLearner)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([id, xp], i) => (
                        <li key={id}>
                          <span className="text-[color:var(--basalt-3)]">{i + 1}.</span> {shortId(id)} · {xp} xp
                        </li>
                      ))}
                  </ol>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="border-collapse min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-[10px] small-caps tracking-[0.1em] text-[color:var(--basalt-2)] p-2 sticky left-0 bg-[color:var(--bone)]">
                        learner
                      </th>
                      {c.grid.path.map((n) => (
                        <th key={n.id} title={n.title} className="text-left align-bottom text-[10px] small-caps tracking-[0.08em] text-[color:var(--basalt-2)] p-2 min-w-[132px] max-w-[132px]">
                          <span className="block leading-[1.3] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">{n.title}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {c.grid.rows.map((row) => (
                      <tr key={row.learnerId} className="border-t border-[color:var(--hairline)]">
                        <td className="p-2 text-[12px] text-[color:var(--basalt)] sticky left-0 bg-[color:var(--bone)] whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span>{shortId(row.learnerId)}</span>
                            <OverrideControl classId={c.id} learnerId={row.learnerId} path={c.grid.path} token={token} onDone={() => void loadClasses()} />
                          </div>
                        </td>
                        {row.cells.map((cell) => (
                          <td key={cell.nodeId} className="p-2">
                            <StageBadge stage={cell.stage} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt)] mb-2">
                    blocked ({c.blocked.length})
                  </h3>
                  {c.blocked.length === 0 && <p className="text-[12px] text-[color:var(--basalt-2)]">Nobody stalled.</p>}
                  <ul className="flex flex-col gap-2">
                    {c.blocked.map((b) => (
                      <li key={`${b.learnerId}:${b.nodeId}`} className="text-[12px] text-[color:var(--basalt-2)] bg-[color:var(--bone)] p-2">
                        {shortId(b.learnerId)} &middot; <strong>{b.nodeTitle}</strong> &middot; {STAGE_LABEL[b.stage]}, {b.staleDays}d stalled
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt)] mb-2">
                    ready for a harder target ({c.readyForHarderTarget.length})
                  </h3>
                  {c.readyForHarderTarget.length === 0 && <p className="text-[12px] text-[color:var(--basalt-2)]">Nobody ready yet.</p>}
                  <ul className="flex flex-col gap-2">
                    {c.readyForHarderTarget.map((r) => (
                      <li key={`${r.learnerId}:${r.nodeId}`} className="text-[12px] text-[color:var(--basalt-2)] bg-[color:var(--bone)] p-2">
                        {shortId(r.learnerId)} &middot; <strong>{r.nodeTitle}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Calibration (bkt-ros, PLAN-REVISION-2.md section 2a):
                  mean confidence against mean source-prediction
                  correctness, per learner, over forcing-gated Check
                  attempts only. A learner with none yet has no row here. */}
              <div className="mt-4">
                <h3 className="text-[12px] small-caps tracking-[0.1em] text-[color:var(--basalt)] mb-2">
                  calibration ({c.calibration.length})
                </h3>
                {c.calibration.length === 0 && (
                  <p className="text-[12px] text-[color:var(--basalt-2)]">No forcing-gated Check attempts yet.</p>
                )}
                {c.calibration.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {c.calibration.map((cal) => (
                      <li key={cal.learnerId} className="text-[12px] text-[color:var(--basalt-2)] bg-[color:var(--bone)] p-2">
                        {shortId(cal.learnerId)} &middot; {cal.n} attempt(s) &middot; mean confidence {cal.meanConfidence.toFixed(2)}/4 &middot; mean
                        correctness {Math.round(cal.meanCorrectness * 100)}%
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}

        {data && (
          <section className="mt-10">
            <h2 className="font-display uppercase text-[16px] text-[color:var(--basalt)] mb-3">
              awaiting judgment ({data.queue.transferHolds.length + data.queue.productions.length})
            </h2>
            <p className="text-[12px] text-[color:var(--basalt-2)] mb-3">
              Across every class above. Decide from the{" "}
              <Link href="/research-os/review" className="underline decoration-[color:var(--gold)] underline-offset-4">
                review queue
              </Link>
              .
            </p>
            <ul className="flex flex-col gap-2">
              {data.queue.transferHolds.map((h) => (
                <li key={`t:${h.learnerId}:${h.nodeId}`} className="text-[12px] text-[color:var(--basalt-2)] bg-[color:var(--bone)] p-2">
                  {shortId(h.learnerId)} &middot; <strong>{h.nodeTitle}</strong> &middot; internalization transfer, held {new Date(h.heldAt).toLocaleDateString()}
                </li>
              ))}
              {data.queue.productions.map((p) => (
                <li key={`p:${p.id}`} className="text-[12px] text-[color:var(--basalt-2)] bg-[color:var(--bone)] p-2">
                  {shortId(p.learnerId)} &middot; <strong>{p.targetTitle}</strong> &middot; production, submitted{" "}
                  {new Date(p.createdAt).toLocaleDateString()}
                </li>
              ))}
              {data.queue.transferHolds.length === 0 && data.queue.productions.length === 0 && (
                <li className="text-[12px] text-[color:var(--basalt-2)]">Nothing pending.</li>
              )}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
