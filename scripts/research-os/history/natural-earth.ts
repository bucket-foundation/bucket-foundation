import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { regionForSubregion } from "../../../src/lib/history/regions";
import { graphClient } from "../ingest/lib/medallion-shadow";
import { ROOT } from "../medallion/lib/repo-io";

export const NATURAL_EARTH = {
  version: "v5.1.2",
  file: "ne_50m_admin_0_countries.geojson",
  url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson",
  bytes: 3083490,
  sha256: "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb",
  license: "public domain, https://www.naturalearthdata.com/about/terms-of-use/",
};

export const BRONZE_PATH = path.join("_intake", "history", "natural-earth", NATURAL_EARTH.version, NATURAL_EARTH.file);

type Feature = { properties: { ADM0_A3: string; ADMIN: string; SUBREGION: string; WIKIDATAID?: string }; geometry: unknown };

export interface Admin0Row {
  adm0_a3: string;
  name: string;
  subregion: string;
  region: string | null;
  wikidata_qid: string | null;
  geometry: string;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function verified(bytes: Uint8Array): void {
  const got = sha256(bytes);
  if (bytes.length !== NATURAL_EARTH.bytes || got !== NATURAL_EARTH.sha256) {
    throw new Error(`${NATURAL_EARTH.file}: ${bytes.length} bytes sha256 ${got}, pinned ${NATURAL_EARTH.bytes} bytes ${NATURAL_EARTH.sha256}`);
  }
}

export function admin0Rows(bytes: Uint8Array): Admin0Row[] {
  const doc = JSON.parse(Buffer.from(bytes).toString("utf8")) as { features: Feature[] };
  return doc.features.map((f) => ({
    adm0_a3: f.properties.ADM0_A3,
    name: f.properties.ADMIN,
    subregion: f.properties.SUBREGION,
    region: regionForSubregion(f.properties.SUBREGION),
    wikidata_qid: f.properties.WIKIDATAID && /^Q[0-9]+$/.test(f.properties.WIKIDATAID) ? f.properties.WIKIDATAID : null,
    geometry: JSON.stringify(f.geometry),
  }));
}

export async function pull(): Promise<Uint8Array> {
  const abs = path.join(ROOT, BRONZE_PATH);
  if (existsSync(abs)) {
    const bytes = readFileSync(abs);
    verified(bytes);
    return bytes;
  }
  const res = await fetch(NATURAL_EARTH.url);
  if (!res.ok) throw new Error(`${NATURAL_EARTH.url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  verified(bytes);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);
  return bytes;
}

export async function load(svc: SupabaseClient, bytes: Uint8Array): Promise<{ admin0: Record<string, number>; places: Record<string, number> }> {
  const { data, error } = await svc.rpc("load_country_regions", { p_rows: admin0Rows(bytes), p_sha256: NATURAL_EARTH.sha256 });
  if (error) throw new Error(`admin-0 load failed: ${error.message}`);
  const { data: assigned, error: assignErr } = await svc.rpc("assign_place_regions");
  if (assignErr) throw new Error(`region assignment failed: ${assignErr.message}`);
  return { admin0: data as Record<string, number>, places: assigned as Record<string, number> };
}

async function main() {
  const bytes = await pull();
  const out = await load(graphClient("natural-earth"), bytes);
  console.log(JSON.stringify(out, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[natural-earth] FAILED:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
