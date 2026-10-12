import { readFileSync, statSync } from "node:fs";
import type { ServerRecord } from "../core/backend";
import { installSidePack, ResearchError, SIDE_PACK_BYTES, type Installed } from "../research";
import { LocalOutputs, type Added } from "../research-work";

export const INSTALL_MS = 60_000;

export function readSidePack(file: string): Uint8Array {
  let size: number;
  try {
    size = statSync(file).size;
  } catch {
    throw new ResearchError(`${file} is missing`, 404);
  }
  if (size > SIDE_PACK_BYTES) throw new ResearchError("the side pack is over the 40 MB limit", 413);
  return readFileSync(file);
}

export async function sendSidePack(server: ServerRecord, bytes: Uint8Array): Promise<Installed> {
  const r = await fetch(`http://127.0.0.1:${server.port}/local/research/install`, {
    method: "POST",
    headers: { authorization: `Bucket ${server.token}`, "content-type": "application/octet-stream", "content-length": String(bytes.length) },
    body: bytes as Uint8Array<ArrayBuffer>,
    signal: AbortSignal.timeout(INSTALL_MS),
  });
  const body = (await r.json().catch(() => ({}))) as Installed & { error?: string };
  if (!r.ok) throw new ResearchError(body.error ?? `the running server refused the side pack (${r.status})`, r.status);
  return body;
}

export async function researchInstall(file: string, dataDir: string, server: ServerRecord | null): Promise<Installed & { live: boolean }> {
  const bytes = readSidePack(file);
  if (server) return { ...(await sendSidePack(server, bytes)), live: true };
  return { ...installSidePack(dataDir, bytes), live: false };
}

export function installLines(done: Installed & { live: boolean }): string[] {
  return [
    `Installed staff research ${done.version}: ${done.outputs} ${done.outputs === 1 ? "output" : "outputs"}, ${done.files.toLocaleString("en-US")} files, every checksum matches.`,
    done.live ? "The running app shows it now." : "Bucket shows it the next time it starts.",
  ];
}

export function researchAdd(folder: string, dataDir: string, shipped: string[]): Added {
  return new LocalOutputs(dataDir, { taken: (slug) => shipped.includes(slug) }).addFolder(folder);
}

export function addLines(done: Added): string[] {
  return [
    `Added ${done.slug}: ${done.files.toLocaleString("en-US")} files, ${done.figures} ${done.figures === 1 ? "figure" : "figures"}, ${done.tables} ${done.tables === 1 ? "table" : "tables"}.`,
    "It opens under Research as a draft. Builds are off for it until you turn them on.",
  ];
}
