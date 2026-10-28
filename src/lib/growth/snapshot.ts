export const GROWTH_APPS = ["bucket", "polingual"] as const;
export type GrowthApp = (typeof GROWTH_APPS)[number];

export const TESTER_STATES = ["NOT_INVITED", "INVITED", "ACCEPTED", "INSTALLED", "REVOKED"] as const;
export type TesterState = (typeof TESTER_STATES)[number];

export const SNAPSHOT_LIMITS = { maxBytes: 1_048_576, maxTesters: 10_000, maxBuilds: 500, maxNotes: 50, maxNoteLength: 200 } as const;

export interface SnapshotTester {
  app: GrowthApp;
  state: TesterState;
}

export interface SnapshotBuild {
  app: GrowthApp;
  version: string;
  build: string;
  uploadedAt: string;
  state: string;
  tag: string | null;
  notes: string[];
}

export interface SnapshotVisits {
  days: number;
  byApp: Partial<Record<GrowthApp, number | null>>;
}

export interface GrowthSnapshot {
  takenAt: string;
  testers: SnapshotTester[];
  builds: SnapshotBuild[];
  visits?: SnapshotVisits | null;
}

function parseVisits(v: unknown): SnapshotVisits | null | undefined {
  if (v === undefined || v === null) return null;
  if (!isObj(v) || !isObj(v.byApp) || typeof v.days !== "number" || !Number.isInteger(v.days) || v.days < 1 || v.days > 90) return undefined;
  const byApp: Partial<Record<GrowthApp, number | null>> = {};
  for (const app of GROWTH_APPS) {
    const n = v.byApp[app];
    if (n === undefined || n === null) byApp[app] = null;
    else if (typeof n === "number" && Number.isInteger(n) && n >= 0) byApp[app] = n;
    else return undefined;
  }
  return { days: v.days, byApp };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const VERSION_RE = /^[0-9A-Za-z.-]{1,32}$/;
const STATE_RE = /^[A-Z_]{1,40}$/;
const TAG_RE = /^[A-Za-z0-9._/-]{1,80}$/;

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function iso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function parseTester(v: unknown): SnapshotTester | null {
  if (!isObj(v)) return null;
  if (!GROWTH_APPS.includes(v.app as GrowthApp)) return null;
  if (!TESTER_STATES.includes(v.state as TesterState)) return null;
  return { app: v.app as GrowthApp, state: v.state as TesterState };
}

function parseBuild(v: unknown): SnapshotBuild | null {
  if (!isObj(v)) return null;
  if (!GROWTH_APPS.includes(v.app as GrowthApp)) return null;
  if (typeof v.version !== "string" || !VERSION_RE.test(v.version)) return null;
  if (typeof v.build !== "string" || !VERSION_RE.test(v.build)) return null;
  const uploadedAt = iso(v.uploadedAt);
  if (!uploadedAt) return null;
  if (typeof v.state !== "string" || !STATE_RE.test(v.state)) return null;
  if (v.tag !== null && (typeof v.tag !== "string" || !TAG_RE.test(v.tag))) return null;
  if (!Array.isArray(v.notes) || v.notes.length > SNAPSHOT_LIMITS.maxNotes) return null;
  if (!v.notes.every((n) => typeof n === "string")) return null;
  const notes = (v.notes as string[]).map((n) => n.slice(0, SNAPSHOT_LIMITS.maxNoteLength));
  return { app: v.app as GrowthApp, version: v.version, build: v.build, uploadedAt, state: v.state, tag: v.tag as string | null, notes };
}

export function parseSnapshot(raw: unknown): Parsed<GrowthSnapshot> {
  if (!isObj(raw)) return { ok: false, error: "bad_request" };
  const takenAt = iso(raw.takenAt);
  if (!takenAt) return { ok: false, error: "bad_taken_at" };
  if (!Array.isArray(raw.testers) || raw.testers.length > SNAPSHOT_LIMITS.maxTesters) return { ok: false, error: "bad_testers" };
  if (!Array.isArray(raw.builds) || raw.builds.length > SNAPSHOT_LIMITS.maxBuilds) return { ok: false, error: "bad_builds" };
  const testers = raw.testers.map(parseTester);
  if (testers.some((t) => t === null)) return { ok: false, error: "bad_tester" };
  const builds = raw.builds.map(parseBuild);
  if (builds.some((b) => b === null)) return { ok: false, error: "bad_build" };
  const visits = parseVisits(raw.visits);
  if (visits === undefined) return { ok: false, error: "bad_visits" };
  return { ok: true, value: { takenAt, testers: testers as SnapshotTester[], builds: builds as SnapshotBuild[], visits } };
}
