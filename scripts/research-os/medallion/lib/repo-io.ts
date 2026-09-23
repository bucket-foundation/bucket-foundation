import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parsePolicy, seedIds, type RightsPolicy } from "../../../../src/lib/research-os/evidence/rights";
import { sha256Hex } from "../../../../src/lib/research-os/evidence/text";
import { checkRepoPath } from "../../../../src/lib/research-os/medallion/paths";
import type { MedallionIO } from "../../../../src/lib/research-os/medallion/plan";

export const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const POLICY = path.join(ROOT, "learning", "research-os", "ai", "rights-policy.json");

function resolveInside(repoPath: string): string | null {
  if (!checkRepoPath(repoPath).ok) return null;
  const abs = path.resolve(ROOT, repoPath);
  return abs.startsWith(ROOT + path.sep) ? abs : null;
}

export const repoIO: MedallionIO = {
  readFile(repoPath) {
    const abs = resolveInside(repoPath);
    if (!abs || !existsSync(abs) || !statSync(abs).isFile()) return null;
    return readFileSync(abs);
  },
  listDir(repoPath) {
    const abs = resolveInside(repoPath);
    if (!abs || !existsSync(abs) || !statSync(abs).isDirectory()) return null;
    return readdirSync(abs);
  },
};

export function loadPolicy(): { policy: RightsPolicy; sha256: string } {
  const raw = readFileSync(POLICY);
  return { policy: parsePolicy(JSON.parse(raw.toString("utf8"))), sha256: sha256Hex(raw) };
}

export function seedSlugs(policy: RightsPolicy): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const rule of policy.index) {
    const file = rule.match.seedFile;
    if (!file || out.has(file)) continue;
    out.set(file, seedIds(file, readFileSync(path.join(ROOT, file), "utf8")));
  }
  return out;
}
