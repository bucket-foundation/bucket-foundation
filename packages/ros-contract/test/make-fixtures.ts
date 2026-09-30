import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPrimesReport, type ReportEdge, type ReportNode } from "@/lib/research-os/primes-report";

const node = (id: string, kind: string, branch: string): ReportNode => ({ id, slug: id, title: id.replace(/-/g, " "), kind, branch });

export const PRIMES_NODES: ReportNode[] = [
  node("energy", "concept", "02-physics"),
  node("mass", "concept", "02-physics"),
  node("light-speed", "constant", "02-physics"),
  node("mass-energy", "law", "02-physics"),
  node("entropy", "concept", "03-chemistry"),
  node("free-energy", "law", "03-chemistry"),
  node("information", "concept", "04-information"),
  node("landauer", "law", "04-information"),
];

export const PRIMES_EDGES: ReportEdge[] = [
  { from_id: "energy", to_id: "mass-energy", kind: "prerequisite", confidence: 0.9 },
  { from_id: "mass", to_id: "mass-energy", kind: "prerequisite", confidence: 0.9 },
  { from_id: "light-speed", to_id: "mass-energy", kind: "derivation", confidence: 0.8 },
  { from_id: "energy", to_id: "free-energy", kind: "prerequisite", confidence: 0.7 },
  { from_id: "entropy", to_id: "free-energy", kind: "prerequisite", confidence: 0.7 },
  { from_id: "entropy", to_id: "landauer", kind: "prerequisite", confidence: 0.6 },
  { from_id: "information", to_id: "landauer", kind: "prerequisite", confidence: 0.6 },
  { from_id: "free-energy", to_id: "landauer", kind: "derivation", confidence: 0.5 },
];

export function primesFixture() {
  return buildPrimesReport(PRIMES_NODES, PRIMES_EDGES, new Set(["energy", "entropy"]), { now: new Date("2026-09-30T00:00:00Z"), nullDraws: 50 });
}

if (import.meta.main) {
  writeFileSync(join(import.meta.dir, "fixtures/primes.json"), JSON.stringify(primesFixture(), null, 1) + "\n");
  console.log("wrote fixtures/primes.json");
}
