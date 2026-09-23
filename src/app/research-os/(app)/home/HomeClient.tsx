"use client";

import { OUTAGE_COPY, UNCONFIGURED_COPY, isTransientOutage, readErrorCode } from "@/lib/research-os/outage";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/providers/SessionProvider";
import SignInGate from "@/components/auth/SignInGate";
import ClassesPanel from "./ClassesPanel";
import ConnectionsPanel from "./ConnectionsPanel";
import LoopPanel from "./LoopPanel";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, ErrorState, LINK, LoadingState, PageHeader, Panel, StageChip } from "@/components/ui";

/**
 * /research-os/home: where sign-in lands. Level and streak, what to
 * continue, where the person stands on the current chain, the open
 * questions on the branch, and the profile prompt when the two-question
 * profile is missing. Every block loads, empties, and fails on its own.
 */

const DEFAULT_TARGET = "why-the-sky-is-blue";
const DEFAULT_BRANCH = "02-physics";

interface Game {
  xp: number;
  streakDays: number;
  lastActiveDay: string | null;
  badges: { id?: string; name?: string; label?: string }[];
  level: number;
  into: number;
  span: number;
}
interface ProfileResponse {
  profile: { role: string; birthYearBucket: string | null; consentStatus: string } | null;
  game: Game | null;
}
// The server type, so a change to what /assignments returns is a compile
// error here rather than a wrong string on the page. `import type` is
// erased, so none of class-db's server-only imports reach the client.
import type { LearnerAssignment } from "@/lib/research-os/class-db";
import { assignmentTargetHref, firstOpenTarget, targetIsLinkable } from "@/lib/research-os/assignments";
interface NodeLite {
  id: string;
  slug: string;
  title: string;
  kind?: string;
  tier?: number;
}
interface ChainStep {
  node: NodeLite;
  stage: string;
  hops: number;
  isFrontier: boolean;
}
interface RouteResponse {
  target: NodeLite;
  chain: ChainStep[];
  gap: NodeLite[];
  openQuestions: NodeLite[];
  llmEnabled: boolean;
}

type Load<T> = { state: "loading" } | { state: "ready"; value: T } | { state: "error"; status: number; code?: string | null };

const STATUS: Record<LearnerAssignment["status"], string> = {
  not_started: "not started",
  in_progress: "in progress",
  produced: "paper submitted",
  accepted: "done",
  overdue: "overdue",
};

async function load<T>(url: string, headers: Record<string, string>): Promise<Load<T>> {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return { state: "error", status: res.status, code: await readErrorCode(res) };
    return { state: "ready", value: (await res.json()) as T };
  } catch {
    return { state: "error", status: 0 };
  }
}

function Unavailable({ status, code, retry }: { status: number; code?: string | null; retry: () => void }) {
  if (isTransientOutage(status, code ?? null)) {
    return <ErrorState title={OUTAGE_COPY.title} body={OUTAGE_COPY.body} retry={retry} />;
  }
  if (status === 503) return <ErrorState title={UNCONFIGURED_COPY.title} body={UNCONFIGURED_COPY.body} />;
  if (status === 401) return <ErrorState title="Your session ended" body="Sign in again to continue." />;
  return <ErrorState body={status ? `The server answered ${status}.` : "The request did not reach the server."} retry={retry} />;
}

function due(d?: string | null): string | null {
  if (!d) return null;
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HomeClient() {
  const { user, loading, accessToken } = useSession();
  const headers = useMemo<Record<string, string>>(() => {
    const h: Record<string, string> = {};
    if (accessToken) h.authorization = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  const [profile, setProfile] = useState<Load<ProfileResponse>>({ state: "loading" });
  const [assignments, setAssignments] = useState<Load<{ assignments: LearnerAssignment[] }>>({ state: "loading" });
  const [route, setRoute] = useState<Load<RouteResponse>>({ state: "loading" });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (loading || !user) return;
    let alive = true;
    setProfile({ state: "loading" });
    setAssignments({ state: "loading" });
    setRoute({ state: "loading" });
    (async () => {
      const [p, a] = await Promise.all([
        load<ProfileResponse>("/api/research-os/profile", headers),
        load<{ assignments: LearnerAssignment[] }>("/api/research-os/assignments?mine=1", headers),
      ]);
      if (!alive) return;
      setProfile(p);
      setAssignments(a);
      const open = a.state === "ready" ? firstOpenTarget(a.value.assignments) : null;
      const target = open?.targetSlug || DEFAULT_TARGET;
      const r = await load<RouteResponse>(`/api/research-os/route?target=${encodeURIComponent(target)}&branch=${encodeURIComponent(DEFAULT_BRANCH)}`, headers);
      if (alive) setRoute(r);
    })();
    return () => {
      alive = false;
    };
  }, [loading, user, headers, tick]);

  if (loading) return <LoadingState label="Loading your Research OS" />;
  if (!user) return <SignInGate signedIn={false} />;

  const name = user.email ? user.email.split("@")[0] : "there";
  const game = profile.state === "ready" ? profile.value.game : null;
  const needsProfile = profile.state === "ready" && profile.value.profile === null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Research OS"
        title="today"
        lede={<>Hello, {name}. Where you stand on the five levels, and the next step on each.</>}
        actions={
          <>
            <Link href="/research-os/workspace" className={BTN_PRIMARY}>
              open the workspace
            </Link>
            <Link href="/research-os/map" className={BTN_SECONDARY}>
              the map
            </Link>
          </>
        }
      />

      <LoopPanel />

      {needsProfile && (
        <Panel title="two questions first">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] leading-[1.6] text-[color:var(--basalt-2)] max-w-xl">
              Your role and an age range. Nothing else. They decide whether a parent or your school says yes before the tools open.
            </p>
            <Link href="/research-os/profile" className={BTN_PRIMARY}>
              finish your profile
            </Link>
          </div>
        </Panel>
      )}

      {/* Level strip */}
      <section aria-label="Your level" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {profile.state === "loading" ? (
          <div className="col-span-2 md:col-span-4">
            <LoadingState label="Loading your level" />
          </div>
        ) : profile.state === "error" ? (
          <div className="col-span-2 md:col-span-4">
            <Unavailable status={profile.status} code={profile.code} retry={retry} />
          </div>
        ) : (
          <>
            <Stat label="level" value={String(game?.level ?? 1)} />
            <Stat label="xp to next level" value={game ? `${game.into} / ${game.span}` : "0 / 50"} bar={game ? game.into / Math.max(1, game.span) : 0} />
            <Stat label="streak" value={game ? `${game.streakDays} day${game.streakDays === 1 ? "" : "s"}` : "0 days"} />
            <Stat label="badges" value={String(game?.badges.length ?? 0)} />
          </>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        <Panel title="continue" meta={assignments.state === "ready" ? `${assignments.value.assignments.length} assignment${assignments.value.assignments.length === 1 ? "" : "s"}` : undefined}>
          {assignments.state === "loading" ? (
            <LoadingState />
          ) : assignments.state === "error" ? (
            <Unavailable status={assignments.status} code={assignments.code} retry={retry} />
          ) : assignments.value.assignments.length === 0 ? (
            <EmptyState
              title="No assignments yet"
              body="Pick a target on the map, or open the workspace and follow the seed path."
              action={{ href: "/research-os/workspace", label: "open the workspace" }}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-[color:var(--hairline)]">
              {assignments.value.assignments.map((a) => {
                // Held in a const so the null case narrows. A boolean and
                // a hand-built href let this block swap its branches and
                // link every withheld target while `tsc` passed
                // (Bucket critic C57).
                const href = assignmentTargetHref(a);
                return (
                <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    {href ? (
                      <Link href={href} className="text-[14px] text-[color:var(--basalt)] hover:underline underline-offset-4">
                        {a.title}
                      </Link>
                    ) : (
                      <span className="text-[14px] text-[color:var(--basalt)]">{a.title}</span>
                    )}
                    <div className="text-[12px] text-[color:var(--basalt-3)]">
                      {a.className} · {targetIsLinkable(a) ? a.targetTitle : "target not shared with you"}
                      {a.requiresProduction ? " · paper required" : ""}
                      {due(a.dueAt) ? ` · due ${due(a.dueAt)}` : ""}
                    </div>
                  </div>
                  <span className={"small-caps text-[10px] tracking-[0.14em] px-2 py-0.5 border rounded-sm " + (a.status === "overdue" ? "border-[color:var(--crimson)] text-[color:var(--crimson)]" : "border-[color:var(--hairline)] text-[color:var(--basalt-2)]")}>
                    {STATUS[a.status]}
                  </span>
                </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="your path" meta={route.state === "ready" ? `to ${route.value.target.title}` : undefined}>
          {route.state === "loading" ? (
            <LoadingState label="Finding your place on the graph" />
          ) : route.state === "error" ? (
            <Unavailable status={route.status} code={route.code} retry={retry} />
          ) : (
            <PathList route={route.value} />
          )}
        </Panel>
      </div>

      <ConnectionsPanel />

      <ClassesPanel />

      {route.state === "ready" && route.value.openQuestions.length > 0 && (
        <Panel title="open questions on this branch" meta="frontier targets">
          <ul className="flex flex-wrap gap-2">
            {route.value.openQuestions.slice(0, 8).map((q) => (
              <li key={q.id}>
                <Link href={`/research-os/n/${encodeURIComponent(q.slug)}`} className={BTN_SECONDARY + " text-[11px]"}>
                  {q.title}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <nav aria-label="Elsewhere in Research OS" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        <Link href="/research-os/learn" className={LINK}>lessons and recall</Link>
        <Link href="/research-os/map" className={LINK}>the canon on the globe</Link>
        <Link href="/research-os/profile" className={LINK}>levels, consent, privacy</Link>
        <Link href="/account" className={LINK}>account</Link>
      </nav>
    </div>
  );
}

function Stat({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div className="bg-[color:var(--bone)] shadow-[inset_0_1px_0_rgba(239,232,212,0.6)] p-4">
      <div className="small-caps text-[10px] tracking-[0.18em] text-[color:var(--basalt-3)]">{label}</div>
      <div className="mt-1 font-display text-[22px] leading-none text-[color:var(--basalt)] [font-variant-numeric:tabular-nums]">{value}</div>
      {typeof bar === "number" && (
        <div className="mt-3 h-1 bg-[color:var(--bone-3)] rounded-sm overflow-hidden" aria-hidden>
          <div className="h-full bg-[color:var(--gold-deep)]" style={{ width: `${Math.round(Math.min(1, Math.max(0, bar)) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function PathList({ route }: { route: RouteResponse }) {
  const steps = route.chain;
  if (steps.length === 0) {
    return <EmptyState title="Nothing between you and this target" body="Open it in the workspace and produce." action={{ href: `/research-os/workspace?target=${encodeURIComponent(route.target.slug)}`, label: "open the target" }} />;
  }
  const next = steps.find((s) => s.stage === "access" || s.stage === "awareness") ?? steps[steps.length - 1];
  const counts = steps.reduce<Record<string, number>>((acc, s) => {
    acc[s.stage] = (acc[s.stage] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div>
      <ol className="flex flex-col divide-y divide-[color:var(--hairline)]">
        {steps.map((s) => (
          <li key={s.node.id} className="py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-baseline gap-2">
              <span className="text-[11px] text-[color:var(--basalt-3)] [font-variant-numeric:tabular-nums] w-6 shrink-0">{s.hops === 0 ? "◆" : `-${s.hops}`}</span>
              <Link href={`/research-os/n/${encodeURIComponent(s.node.slug)}`} className="text-[13px] text-[color:var(--basalt)] hover:underline underline-offset-4 truncate">
                {s.node.title}
              </Link>
            </div>
            <StageChip stage={s.stage} />
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-[color:var(--basalt-3)]">
          {Object.entries(counts)
            .map(([k, v]) => `${v} ${k}`)
            .join(" · ")}
        </div>
        <Link href={`/research-os/workspace?target=${encodeURIComponent(next.node.slug)}`} className={BTN_PRIMARY}>
          {next.hops === 0 ? "work on the target" : "work on the next step"}
        </Link>
      </div>
    </div>
  );
}
