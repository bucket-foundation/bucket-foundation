import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileMarks } from "../src/lib/download/marks";
import { downloadLink } from "../src/lib/download/notify";
import { EXPIRED, PAUSED, serveDownload, USED, type Artifact, type ServeDeps } from "../src/lib/download/serve";
import { fileStore } from "../src/lib/waitlist/store";

const SECRET = "s".repeat(40);
const NOW = 1_800_000_000_000;

function stream(): ReadableStream<Uint8Array> & { cancelled: boolean } {
  const s = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } }) as ReadableStream<Uint8Array> & { cancelled: boolean };
  s.cancelled = false;
  const cancel = s.cancel.bind(s);
  s.cancel = async (r?: unknown) => { s.cancelled = true; return cancel(r); };
  return s;
}

async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), "bkt-serve-"));
  const store = fileStore(root, "waitlist-local/downloads/");
  const q = new URL(downloadLink("https://x.test", SECRET, "ada@example.org", NOW)).searchParams;
  await store.write(q.get("k") as string, { email: "ada@example.org", name: null, role: null, wanted: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", signups: 1 });
  const marks = fileMarks(path.join(root, "marks"), () => NOW);
  const deps = (fetchArtifact: ServeDeps["fetchArtifact"], now = NOW): ServeDeps => ({ secret: SECRET, artifact: "releases/bucket.dmg", marks, store, fetchArtifact, now });
  return { root, q, deps };
}

test("a suspended Blob store answers 503 and leaves the link unused", async () => {
  const { root, q, deps } = await setup();
  try {
    const down = await serveDownload(q, deps(async () => { throw new Error("store suspended"); }));
    assert.deepEqual(down, { kind: "text", status: 503, body: PAUSED });
    const missing = await serveDownload(q, deps(async () => null));
    assert.deepEqual(missing, { kind: "text", status: 503, body: PAUSED });
    const later = await serveDownload(q, deps(async () => ({ statusCode: 200, stream: stream() }), NOW + 60 * 60 * 1000));
    assert.equal(later.kind, "file");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a served link redeems once and a reused link cancels the fetched stream", async () => {
  const { root, q, deps } = await setup();
  try {
    const first = await serveDownload(q, deps(async () => ({ statusCode: 200, stream: stream() })));
    assert.equal(first.kind === "file" && first.name, "bucket.dmg");
    const s = stream();
    const late = await serveDownload(q, deps(async (): Promise<Artifact> => ({ statusCode: 200, stream: s }), NOW + 2 * 60 * 60 * 1000));
    assert.deepEqual(late, { kind: "text", status: 410, body: USED });
    assert.equal(s.cancelled, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("bad links and missing config never reach Blob", async () => {
  const { root, q, deps } = await setup();
  let calls = 0;
  const fetchArtifact = async () => { calls++; return null; };
  try {
    assert.deepEqual(await serveDownload(new URLSearchParams("k=1&e=2&s=3"), deps(fetchArtifact)), { kind: "text", status: 410, body: EXPIRED });
    assert.equal((await serveDownload(q, { ...deps(fetchArtifact), artifact: undefined })).kind === "text" && 503, 503);
    assert.equal(calls, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
