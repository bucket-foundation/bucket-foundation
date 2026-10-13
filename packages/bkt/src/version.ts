import pkg from "../package.json" with { type: "json" };

declare const BKT_BUILD_VERSION: string | undefined;
declare const BKT_BUILD_STAMP: string | undefined;

export const VERSION: string = typeof BKT_BUILD_VERSION === "string" ? BKT_BUILD_VERSION : pkg.version;

export interface BuildStamp {
  commit: string;
  date: string;
}

export function parseStamp(raw: unknown): BuildStamp | null {
  const m = typeof raw === "string" ? /^([0-9a-f]{7,40}) (\d{4}-\d{2}-\d{2})$/.exec(raw.trim()) : null;
  return m ? { commit: m[1], date: m[2] } : null;
}

export const BUILD: BuildStamp | null = parseStamp(typeof BKT_BUILD_STAMP === "string" ? BKT_BUILD_STAMP : null);
