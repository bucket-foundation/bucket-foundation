import { readFileSync, statSync } from "node:fs";
import type { ServerRecord } from "../core/backend";
import { installSidePack, ResearchError, SIDE_PACK_BYTES, type Installed } from "../research";
import { BuildSwitch, type PendingView } from "../research-consent";
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

export interface Waiting {
  pending: PendingView | null;
  full?: string;
}

async function call<T>(server: ServerRecord, path: string, body?: unknown): Promise<{ status: number; body: T & { error?: string } }> {
  const text = body === undefined ? undefined : JSON.stringify(body);
  const r = await fetch(`http://127.0.0.1:${server.port}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { authorization: `Bucket ${server.token}`, ...(text ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(text)) } : {}) },
    body: text,
    signal: AbortSignal.timeout(INSTALL_MS),
  });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as T & { error?: string } };
}

export async function researchWaiting(server: ServerRecord): Promise<Waiting> {
  const r = await call<Waiting>(server, "/local/research/consent/pending");
  if (r.status !== 200) throw new ResearchError(r.body.error ?? `the running app refused the question (${r.status})`, r.status);
  return r.body;
}

export async function researchAnswer(server: ServerRecord, view: PendingView, allow: boolean): Promise<{ id?: string; state?: string; denied?: boolean }> {
  const r = await call<{ id?: string; state?: string; denied?: boolean }>(server, "/local/research/consent", { id: view.id, digest: view.digest, allow });
  if (r.status !== 200) throw new ResearchError(r.body.error ?? `the running app refused the answer (${r.status})`, r.status);
  return r.body;
}

export function approvalLines(w: Waiting): string[] {
  if (!w.pending) return ["No build is waiting for approval."];
  const left = Math.max(0, Math.round((w.pending.expiresAt - Date.now()) / 1000));
  return [w.pending.title, "", ...w.pending.body.split("\n"), "", `Full digest: ${w.pending.digest}`, ...(w.full ? ["", "Changes against the shipped version:", ...w.full.trimEnd().split("\n")] : []), "", `This request ends in ${left} seconds. Allow it with bkt research approve --yes, refuse it with bkt research approve --deny.`];
}

export function researchBuilds(dataDir: string, action: string, slug: string): string {
  if (action !== "on" && action !== "off") throw new ResearchError("say on or off, then the short name of the output", 400);
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(slug)) throw new ResearchError("the output name is refused", 400);
  const gate = new BuildSwitch(dataDir);
  const own = new LocalOutputs(dataDir);
  if (action === "on") {
    gate.turnOn(slug);
    own.setBuilds(slug, true);
    return `Builds are on for ${slug}. Each build still asks for approval.`;
  }
  gate.turnOff(slug, "turned off from the terminal", Date.now());
  own.setBuilds(slug, false);
  return `Builds are off for ${slug}.`;
}
