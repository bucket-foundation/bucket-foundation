import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_AT, parseAt, quizSchedule, quizUnschedule, UNIT, type QuizDeps } from "./notify";
import type { Route } from "./serve";
import { BUILD, VERSION, type BuildStamp } from "./version";

export interface NotifyState {
  supported: boolean;
  on: boolean;
  at: string | null;
}

export interface SettingsBody {
  version: string;
  build: BuildStamp | null;
  dataDir: string;
  notify: NotifyState;
  notifyDefault: string;
}

export function notifyState(timerDir: string | null): NotifyState {
  if (!timerDir) return { supported: false, on: false, at: null };
  let unit: string;
  try {
    unit = readFileSync(join(timerDir, `${UNIT}.timer`), "utf8");
  } catch {
    return { supported: true, on: false, at: null };
  }
  const m = /^OnCalendar=\*-\*-\* ((?:[01]\d|2[0-3]):[0-5]\d):00$/m.exec(unit);
  return { supported: true, on: true, at: m ? m[1] : null };
}

export const NOTIFY_UNAVAILABLE = "the daily notification is not available on this system yet";
export const NOTIFY_BAD_BODY = "send on as true or false, and at as a time such as 08:53";
export const NOTIFY_EDITED = "the notification files on this computer were changed by hand, so Bucket left them alone";
export const NOTIFY_FAILED = "Bucket could not change the daily notification";
export const NOTIFY_BODY_BYTES = 256;

export interface SettingsOptions {
  dataDir: string;
  timerDir: string | null;
  version?: string;
  build?: BuildStamp | null;
  quiz?: () => QuizDeps;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function setNotify(d: QuizDeps, on: boolean, at: string | null): Promise<{ status: number; error?: string }> {
  const lines: string[] = [];
  const deps: QuizDeps = { ...d, out: (l) => lines.push(l) };
  if (!deps.platform.timerDir()) return { status: 400, error: NOTIFY_UNAVAILABLE };
  let time = DEFAULT_AT;
  if (on) {
    try {
      time = parseAt(at ?? notifyState(deps.platform.timerDir()).at ?? DEFAULT_AT);
    } catch {
      return { status: 400, error: NOTIFY_BAD_BODY };
    }
  }
  let code: number;
  try {
    code = on ? await quizSchedule(deps, time) : await quizUnschedule(deps);
  } catch (e) {
    lines.push((e as Error).message);
    code = 1;
  }
  if (code === 0) return { status: 200 };
  return { status: 500, error: lines.some((l) => /differs? from what bkt would write/.test(l)) ? NOTIFY_EDITED : NOTIFY_FAILED };
}

export function settingsRoutes(o: SettingsOptions): Record<string, Route> {
  return {
    "GET /local/settings": () => {
      const body: SettingsBody = { version: o.version ?? VERSION, build: o.build === undefined ? BUILD : o.build, dataDir: o.dataDir, notify: notifyState(o.timerDir), notifyDefault: DEFAULT_AT };
      return json(body);
    },
    "POST /local/settings/notify": async (req) => {
      let b: Record<string, unknown>;
      try {
        const raw = JSON.parse((await req.text()).slice(0, NOTIFY_BODY_BYTES)) as unknown;
        b = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
      } catch {
        b = {};
      }
      if (typeof b.on !== "boolean" || (b.at !== undefined && typeof b.at !== "string")) return json({ error: NOTIFY_BAD_BODY }, 400);
      if (!o.quiz) return json({ error: NOTIFY_UNAVAILABLE }, 400);
      const d = o.quiz();
      const r = await setNotify(d, b.on, (b.at as string | undefined) ?? null);
      if (r.error) console.error(`bkt serve: daily notification: ${r.error}`);
      return json({ notify: notifyState(d.platform.timerDir()), ...(r.error ? { error: r.error } : {}) }, r.status);
    },
  };
}
