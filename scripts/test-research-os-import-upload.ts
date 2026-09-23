/**
 * The import upload (ros-import 2): what kind of file arrived, the
 * metadata rules, and recording a file against the bytes storage holds.
 * node:test, no database and no network: the storage and graph clients
 * are stand-ins.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectType, extensionOf, normalizeMediaType, OCTET_STREAM, validateFilename, validateMetadata, MAX_NOTE, MAX_TITLE } from "../src/lib/research-os/import-types";
import { MAX_IMPORT_BYTES, validateImportFile, type ImportFileRecord } from "../src/lib/research-os/import-storage";
import { listImportFiles, ownedImport, readObject, recordImportFile, verifyUpload, type ObjectReader } from "../src/lib/research-os/import-upload";

const OWNER = "0f8e6c1a-2b3d-4e5f-8a9b-0c1d2e3f4a5b";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

test("the extension decides the type, and repairs the media type the browser reported", () => {
  // The same .csv arrives under three media types across machines.
  for (const reported of ["text/csv", "application/vnd.ms-excel", OCTET_STREAM, "", null]) {
    assert.deepEqual(detectType("rows.csv", reported), { mediaType: "text/csv", structured: "table", extractable: true, from: "extension" }, String(reported));
  }
  assert.equal(detectType("paper.PDF", null).mediaType, "application/pdf");
  assert.equal(detectType("notes.md", null).structured, "text");
  assert.equal(detectType("book.epub", null).structured, "document");
  assert.equal(detectType("page.html", null).structured, "web");
  assert.equal(detectType("shot.png", null).structured, "image");
  assert.equal(detectType("clip.mp4", null).structured, "video");
  assert.equal(detectType("bundle.zip", null).structured, "archive");
  assert.equal(detectType("rows.jsonl", null).structured, "data");
});

test("with no extension the media type decides, and neither leaves the file as bytes", () => {
  assert.deepEqual(detectType("readme", "text/html; charset=utf-8"), { mediaType: "text/html", structured: "web", extractable: true, from: "media-type" });
  assert.equal(detectType("readme", "text/plain").structured, "text");
  assert.equal(detectType("scan", "image/heic").structured, "image");
  assert.deepEqual(detectType("blob", OCTET_STREAM), { mediaType: OCTET_STREAM, structured: "other", extractable: false, from: "fallback" });
  assert.deepEqual(detectType("blob", null), { mediaType: OCTET_STREAM, structured: "other", extractable: false, from: "fallback" });
  assert.deepEqual(detectType("thing.xyz", "application/x-thing"), { mediaType: "application/x-thing", structured: "other", extractable: false, from: "media-type" });
});

test("extensions and media types are read the same way on both sides", () => {
  assert.equal(extensionOf("a/b/c.tar.gz"), "gz");
  assert.equal(extensionOf(".gitignore"), null, "a dotfile has no extension");
  assert.equal(extensionOf("trailing."), null);
  assert.equal(extensionOf("no-dot"), null);
  assert.equal(extensionOf("weird.ext!"), null);
  assert.equal(normalizeMediaType("TEXT/CSV; charset=UTF-8"), "text/csv");
  assert.equal(normalizeMediaType("  application/pdf "), "application/pdf");
  assert.equal(normalizeMediaType("not a media type"), null);
  assert.equal(normalizeMediaType(null), null);
});

test("the metadata form's rules", () => {
  assert.deepEqual(validateMetadata({ kind: "dataset", title: "  Rows  ", note: " where it came from " }), {
    ok: true,
    value: { kind: "dataset", title: "Rows", note: "where it came from" },
  });
  assert.equal(validateMetadata({ kind: "dataset", title: "t" }).ok, true, "a note is optional");
  assert.deepEqual(validateMetadata({ kind: "other", title: "t" }), { ok: false, error: "kind_unknown" });
  assert.deepEqual(validateMetadata({ kind: "paper", title: "   " }), { ok: false, error: "title_missing" });
  assert.deepEqual(validateMetadata({ kind: "paper", title: "x".repeat(MAX_TITLE + 1) }), { ok: false, error: "title_too_long" });
  assert.deepEqual(validateMetadata({ kind: "paper", title: "t", note: "x".repeat(MAX_NOTE + 1) }), { ok: false, error: "note_too_long" });
  assert.deepEqual(validateFilename(" rows.csv "), { ok: true, value: "rows.csv" });
  assert.deepEqual(validateFilename("../../etc/passwd"), { ok: true, value: "....etcpasswd" }, "a filename is one segment");
  assert.deepEqual(validateFilename("   "), { ok: false, error: "filename_missing" });
  assert.deepEqual(validateFilename("x".repeat(256)), { ok: false, error: "filename_too_long" });
  assert.deepEqual(validateFilename(42), { ok: false, error: "filename_missing" });
});

/** A storage stand-in holding one object's bytes. */
function reader(objects: Record<string, string>, fail?: "throw"): ObjectReader {
  return {
    async download(path: string) {
      if (fail === "throw") throw new Error("storage is unreachable");
      const text = objects[path];
      if (text === undefined) return { data: null, error: { message: "Object not found" } };
      return { data: new Blob([text]), error: null };
    },
  };
}

const recordFor = (text: string, over: Partial<ImportFileRecord> = {}): ImportFileRecord => {
  const r = validateImportFile({ ownerId: OWNER, sha256: sha(text), bytes: Buffer.byteLength(text), mediaType: "text/csv", filename: "rows.csv" });
  if (!r.ok) throw new Error(r.error);
  return { ...r.value, ...over };
};

test("an object is read by hashing its bytes, and a missing or unreachable one says which", async () => {
  const text = "a,b\n1,2\n";
  const record = recordFor(text);
  const ok = await readObject(reader({ [record.storagePath]: text }), record.storagePath);
  assert.deepEqual(ok, { ok: true, value: { bytes: Buffer.byteLength(text), sha256: sha(text) } });
  const missing = await readObject(reader({}), record.storagePath);
  assert.deepEqual(missing.ok ? null : missing.error, "object_missing");
  const down = await readObject(reader({}, "throw"), record.storagePath);
  assert.deepEqual(down.ok ? null : down.error, "storage_unavailable");
});

test("bytes that are not the ones the path names record nothing", async () => {
  const text = "a,b\n1,2\n";
  const record = recordFor(text);
  assert.equal((await verifyUpload(reader({ [record.storagePath]: text }), record)).ok, true);

  // The client claims one file's hash and uploads another's bytes.
  const lying = { ...record, sha256: sha("other bytes"), storagePath: `${OWNER}/${sha("other bytes")}` };
  const swapped = await verifyUpload(reader({ [lying.storagePath]: text }), lying);
  assert.deepEqual(swapped.ok ? null : swapped.error, "hash_mismatch");

  const wrongSize = { ...record, bytes: record.bytes + 10 };
  const sized = await verifyUpload(reader({ [record.storagePath]: text }), wrongSize);
  assert.deepEqual(sized.ok ? null : sized.error, "bytes_mismatch");
  assert.match(sized.ok ? "" : sized.detail, /the object holds 8 bytes/);
});

test("a file inside the size limit and a hash in the right form are the table's rules", () => {
  assert.equal(validateImportFile({ ownerId: OWNER, sha256: sha("x"), bytes: 1, mediaType: "text/plain" }).ok, true);
  assert.deepEqual(validateImportFile({ ownerId: OWNER, sha256: sha("x").toUpperCase(), bytes: 1, mediaType: "text/plain" }), { ok: false, error: "sha256_not_hex" });
  assert.deepEqual(validateImportFile({ ownerId: OWNER, sha256: sha("x"), bytes: 0, mediaType: "text/plain" }), { ok: false, error: "bytes_out_of_range" });
  assert.deepEqual(validateImportFile({ ownerId: OWNER, sha256: sha("x"), bytes: MAX_IMPORT_BYTES + 1, mediaType: "text/plain" }), { ok: false, error: "bytes_out_of_range" });
  assert.deepEqual(validateImportFile({ ownerId: "nope", sha256: sha("x"), bytes: 1, mediaType: "text/plain" }), { ok: false, error: "owner_not_a_uuid" });
  assert.deepEqual(validateImportFile({ ownerId: OWNER, sha256: sha("x"), bytes: 1, mediaType: "text/csv; charset=utf-8" }), { ok: false, error: "media_type_malformed" });
});

interface Table {
  rows: Record<string, unknown>[];
  error?: string;
}

/** A graph stand-in for the reads and the one insert this file makes. */
function fakeGraph(tables: Record<string, Table>, inserted: Record<string, unknown>[] = []) {
  const make = (name: string) => {
    const table = tables[name] ?? { rows: [] };
    const filters: ((r: Record<string, unknown>) => boolean)[] = [];
    let payload: Record<string, unknown> | null = null;
    const rows = () => table.rows.filter((r) => filters.every((f) => f(r)));
    const answer = () => (table.error ? { data: null, error: { message: table.error } } : { data: rows(), error: null });
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
      order: () => q,
      insert: (values: Record<string, unknown>) => ((payload = values), q),
      maybeSingle: async () => (table.error ? { data: null, error: { message: table.error } } : { data: rows()[0] ?? null, error: null }),
      single: async () => {
        if (table.error) return { data: null, error: { message: table.error } };
        const row = { id: `row-${inserted.length + 1}`, storage_path: `${payload!.owner_id}/${payload!.sha256}`, created_at: "2026-09-22T00:00:00Z", ...payload };
        inserted.push(row);
        table.rows.push(row);
        return { data: row, error: null };
      },
      range: async (from: number, to: number) => (table.error ? { data: null, error: { message: table.error } } : { data: rows().slice(from, to + 1), error: null }),
      then: (resolve: (v: unknown) => void) => resolve(answer()),
    };
    return q;
  };
  return { from: (name: string) => make(name) } as unknown as SupabaseClient;
}

test("an import belongs to its owner, and carries its node's slug", async () => {
  const svc = fakeGraph({
    imports: { rows: [{ id: "imp-1", owner_id: OWNER, node_id: "node-1" }] },
    nodes: { rows: [{ id: "node-1", slug: "import-0f8e6c1a-abc" }] },
  });
  assert.deepEqual(await ownedImport(svc, "imp-1", OWNER), { id: "imp-1", nodeId: "node-1", nodeSlug: "import-0f8e6c1a-abc" });
  assert.equal(await ownedImport(svc, "imp-1", "00000000-0000-4000-8000-000000000009"), null, "another account's import is not found");
  assert.equal(await ownedImport(svc, "missing", OWNER), null);
  await assert.rejects(ownedImport(fakeGraph({ imports: { rows: [], error: "connection reset" } }), "imp-1", OWNER), /reading the import/);
});

test("a file is recorded once per import, and a repeat returns the row already there", async () => {
  const inserted: Record<string, unknown>[] = [];
  const svc = fakeGraph({ import_files: { rows: [] } }, inserted);
  const record = recordFor("a,b\n1,2\n");
  const first = await recordImportFile(svc, "imp-1", record);
  assert.equal(first.ok && first.repeat, false);
  assert.equal(first.ok && first.value.storage_path, record.storagePath);
  assert.equal(inserted.length, 1);
  assert.deepEqual(inserted[0].media_type, "text/csv");

  const again = await recordImportFile(svc, "imp-1", record);
  assert.equal(again.ok && again.repeat, true);
  assert.equal(inserted.length, 1, "the second attach writes no row");

  const broken = await recordImportFile(fakeGraph({ import_files: { rows: [], error: "write denied" } }), "imp-1", record);
  assert.deepEqual(broken.ok ? null : broken.error, "write_failed");
});

test("listing an import's files reads every page and raises when it cannot", async () => {
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: `f${i}`, import_id: "imp-1", sha256: sha(String(i)), bytes: 1, media_type: "text/plain", filename: `f${i}.txt`, storage_path: `${OWNER}/${sha(String(i))}`, created_at: "2026-09-22T00:00:00Z" }));
  const svc = fakeGraph({ import_files: { rows } });
  assert.equal((await listImportFiles(svc, "imp-1")).length, 5);
  assert.equal((await listImportFiles(svc, "other")).length, 0);
  await assert.rejects(listImportFiles(fakeGraph({ import_files: { rows: [], error: "timeout" } }), "imp-1"), /listing the import's files/);
});
