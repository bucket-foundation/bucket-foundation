import { configured, graphService } from "./db";
import { loadPrimesReport } from "./primes-report";
import type { PrimesViewState } from "./primes-report-types";

export type { PrimesViewState };

export async function readPrimesViewState(): Promise<PrimesViewState> {
  if (!configured()) return { kind: "unconfigured" };
  try {
    return { kind: "ready", report: await loadPrimesReport(graphService()) };
  } catch (err) {
    console.error("[primes] report failed:", err instanceof Error ? err.message : err);
    return { kind: "failed" };
  }
}
