import fs from "node:fs";
import path from "node:path";
import { hasEmail, scrubEmails } from "../research-os/advisor-review";
import { parseDataset, type Dataset } from "./space";

export const ADVISORS_ID = "advisors";
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const PUBLIC_META_KEYS = ["institution", "field", "country", "kind", "branch", "concept"] as const;

export interface SpaceApiEnv {
  NODE_ENV?: string;
  BUCKET_LOCAL_SPACE?: string;
  BUCKET_SPACE_DIR?: string;
  BUCKET_CORPORA_JSON?: string;
}

export function localSpaceEnabled(env: SpaceApiEnv = process.env as SpaceApiEnv): boolean {
  return env.NODE_ENV === "development" && env.BUCKET_LOCAL_SPACE === "1";
}

export function spaceDir(env: SpaceApiEnv = process.env as SpaceApiEnv): string {
  return env.BUCKET_SPACE_DIR || path.join(process.cwd(), ".data", "explore");
}

export function registryPath(env: SpaceApiEnv = process.env as SpaceApiEnv): string {
  return env.BUCKET_CORPORA_JSON || path.join(process.cwd(), "tools", "prime-directions", "corpora.json");
}

export interface AllowedSet {
  id: string;
  label: string;
}

export function allowedSets(registryFile: string): AllowedSet[] {
  const out: AllowedSet[] = [{ id: ADVISORS_ID, label: "advisors" }];
  let raw: { corpora?: Record<string, { publish?: boolean; private?: boolean }> };
  try {
    raw = JSON.parse(fs.readFileSync(registryFile, "utf8"));
  } catch {
    return out;
  }
  for (const [name, spec] of Object.entries(raw.corpora ?? {})) {
    if (spec && spec.publish === true && spec.private !== true && ID_PATTERN.test(name) && name !== ADVISORS_ID) out.push({ id: name, label: name });
  }
  return out;
}

export function resolveSpaceFile(requested: string | null, allowed: AllowedSet[], dir: string): string | null {
  if (!requested || !ID_PATTERN.test(requested)) return null;
  const match = allowed.find((a) => a.id === requested);
  return match ? path.join(dir, `${match.id}.space.json`) : null;
}

export function availableSets(allowed: AllowedSet[], dir: string): AllowedSet[] {
  return allowed.filter((a) => {
    const file = resolveSpaceFile(a.id, allowed, dir);
    return !!file && fs.existsSync(file);
  });
}

function cleanLinks(links: string[]): string[] {
  return links.filter((l) => /^https?:\/\//i.test(l) && !hasEmail(l));
}

export function publicDataset(ds: Dataset): Dataset {
  return {
    schema: ds.schema,
    id: ds.id,
    label: ds.label,
    sample: false,
    license: ds.license,
    scale: ds.scale,
    basis: ds.basis,
    fields: ds.fields,
    components: ds.components.map((c) => ({ ...c, top_terms: c.top_terms.map(scrubEmails), bottom_terms: c.bottom_terms.map(scrubEmails) })),
    mean: ds.mean,
    sweep: ds.sweep,
    obs: ds.obs.map((o) => {
      const meta: Dataset["obs"][number]["meta"] = {};
      for (const key of PUBLIC_META_KEYS) {
        const v = o.meta[key];
        if (typeof v === "string") meta[key] = scrubEmails(v);
        else if (typeof v === "number") meta[key] = v;
      }
      return { id: o.id, title: scrubEmails(o.title), scores: o.scores, t: o.t, meta, links: cleanLinks(o.links), coverage: o.coverage };
    }),
  };
}

export function readPublicDataset(file: string): Dataset | null {
  try {
    return publicDataset(parseDataset(JSON.parse(fs.readFileSync(file, "utf8"))));
  } catch {
    return null;
  }
}
