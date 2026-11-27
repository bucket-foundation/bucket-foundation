import { EXPERIMENT_ID, experimentOn, parseEnrolment, type Consent, type Enrolment, type Stratum } from "./input-experiment";
import { browserMemoryIO } from "./lang-memory-store";

const BASE = "bucket.polingual.ci14";
const DISCLOSED = `${BASE}.disclosed`;
const OPTED_OUT = `${BASE}.optedOut`;
const ENROLMENT = `${BASE}.enrolment`;
const TAKEN = `${BASE}.taken`;

function get(k: string): string | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(k);
  } catch {
    return null;
  }
}

function set(k: string, v: string | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    return;
  }
}

export interface ExperimentPrefs {
  disclosed: boolean;
  optedOut: boolean;
}

export function readPrefs(): ExperimentPrefs {
  return { disclosed: get(DISCLOSED) === "1", optedOut: get(OPTED_OUT) === "1" };
}

export function joinStudy(): void {
  set(DISCLOSED, "1");
  set(OPTED_OUT, null);
}

export function leaveStudy(): void {
  set(DISCLOSED, "1");
  set(OPTED_OUT, "1");
}

export function currentConsent(flag: boolean = experimentOn()): Consent {
  const p = readPrefs();
  return { flag, uploadOpen: browserMemoryIO.readGate?.().state === "open", disclosed: p.disclosed, optedOut: p.optedOut };
}

export function readEnrolment(): Enrolment | null {
  try {
    return parseEnrolment(JSON.parse(get(ENROLMENT) ?? "null"));
  } catch {
    return null;
  }
}

export function cacheEnrolment(e: Enrolment): void {
  set(ENROLMENT, JSON.stringify(e));
}

export type ServerEnrolment = { ok: true; enrolment: Enrolment | null } | { ok: false };

export async function fetchEnrolment(token: string, fetcher: typeof fetch = fetch): Promise<ServerEnrolment> {
  try {
    const r = await fetcher("/api/academy/experiment", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!r.ok) return { ok: false };
    const body = (await r.json()) as { enrolment?: unknown };
    return { ok: true, enrolment: body.enrolment ? parseEnrolment(body.enrolment) : null };
  } catch {
    return { ok: false };
  }
}

export async function registerEnrolment(token: string, stratum: Stratum, fetcher: typeof fetch = fetch): Promise<Enrolment | null> {
  try {
    const r = await fetcher("/api/academy/experiment", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ experiment: EXPERIMENT_ID, stratum }),
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { enrolment?: unknown };
    return parseEnrolment(body.enrolment);
  } catch {
    return null;
  }
}

export interface TakenTests {
  baseline: boolean;
  day28: boolean;
}

export function readTaken(): TakenTests {
  const t = get(TAKEN) ?? "";
  return { baseline: t.includes("baseline"), day28: t.includes("day28") };
}

export function markTaken(phase: "baseline" | "day28"): void {
  const t = readTaken();
  set(TAKEN, [t.baseline || phase === "baseline" ? "baseline" : "", t.day28 || phase === "day28" ? "day28" : ""].filter(Boolean).join(","));
}
