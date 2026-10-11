import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_AT, UNIT } from "./notify";
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

export interface SettingsOptions {
  dataDir: string;
  timerDir: string | null;
  version?: string;
  build?: BuildStamp | null;
}

export function settingsRoutes(o: SettingsOptions): Record<string, Route> {
  return {
    "GET /local/settings": () => {
      const body: SettingsBody = { version: o.version ?? VERSION, build: o.build === undefined ? BUILD : o.build, dataDir: o.dataDir, notify: notifyState(o.timerDir), notifyDefault: DEFAULT_AT };
      return new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
    },
  };
}
