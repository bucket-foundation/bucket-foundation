/**
 * ros-import 1's path rule and its bounds, src/lib/research-os/import-storage.ts.
 * Pure, no database. Run:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-research-os-import-storage.ts
 *
 * The property that matters is the one the workbench leans on: bytes a
 * run recorded by their hash are still there afterwards. That holds
 * because the path is derived from the hash, so the tests below check
 * the derivation rather than any storage call.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  IMPORT_BUCKET,
  MAX_IMPORT_BYTES,
  isMediaType,
  isSha256Hex,
  parseStoragePath,
  sha256Hex,
  storagePathFor,
  validateImportFile,
} from "../src/lib/research-os/import-storage";

const OWNER = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const OTHER = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

test("the empty string hashes to the published SHA-256 vector", async () => {
  // e3b0c442... is the standard digest of zero bytes. A client and a
  // route both call this, so an implementation that drifts would name
  // two different paths for one file.
  assert.equal(await sha256Hex(new Uint8Array()), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(await sha256Hex(new TextEncoder().encode("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("the same bytes name the same object, and different bytes never collide", () => {
  const a = storagePathFor(OWNER, HASH);
  const b = storagePathFor(OWNER, HASH);
  assert.ok(a.ok && b.ok);
  assert.equal(a.value, b.value, "writing the same file twice writes the same object");

  const changed = storagePathFor(OWNER, "f".repeat(64));
  assert.ok(changed.ok);
  assert.notEqual(changed.value, a.value, "different bytes take a different path, so nothing is replaced");
});

test("two people with identical bytes keep separate objects", () => {
  const mine = storagePathFor(OWNER, HASH);
  const yours = storagePathFor(OTHER, HASH);
  assert.ok(mine.ok && yours.ok);
  assert.notEqual(mine.value, yours.value);
  assert.ok(mine.value.startsWith(`${OWNER}/`), "the owner is the first segment, which is what the Storage policy gates on");
});

test("a path that cannot be derived is refused rather than guessed", () => {
  assert.deepEqual(storagePathFor("not-a-uuid", HASH), { ok: false, error: "owner_not_a_uuid" });
  assert.deepEqual(storagePathFor(OWNER, "XYZ"), { ok: false, error: "sha256_not_hex" });
  assert.deepEqual(storagePathFor(OWNER, HASH.toUpperCase()), { ok: false, error: "sha256_not_hex" }, "the column is lowercase hex and so is this");
  assert.equal(isSha256Hex(HASH), true);
  assert.equal(isSha256Hex(HASH.slice(0, 63)), false);
});

test("a path round-trips to the owner and hash that made it", () => {
  const made = storagePathFor(OWNER, HASH);
  assert.ok(made.ok);
  assert.deepEqual(parseStoragePath(made.value), { ownerId: OWNER, sha256: HASH });
  assert.equal(parseStoragePath("one-segment"), null);
  assert.equal(parseStoragePath(`${OWNER}/${HASH}/extra`), null, "a nested key is not one of ours");
  assert.equal(parseStoragePath(`../../${HASH}`), null, "and neither is a traversal");
});

test("the bounds match the table's own checks", () => {
  const base = { ownerId: OWNER, sha256: HASH, bytes: 10, mediaType: "text/csv" };
  const ok = validateImportFile(base);
  assert.ok(ok.ok);
  assert.equal(ok.value.storagePath, `${OWNER}/${HASH}`);
  assert.equal(ok.value.filename, null);

  assert.deepEqual(validateImportFile({ ...base, bytes: 0 }), { ok: false, error: "bytes_out_of_range" });
  assert.deepEqual(validateImportFile({ ...base, bytes: -1 }), { ok: false, error: "bytes_out_of_range" });
  assert.deepEqual(validateImportFile({ ...base, bytes: 1.5 }), { ok: false, error: "bytes_out_of_range" });
  assert.deepEqual(validateImportFile({ ...base, bytes: MAX_IMPORT_BYTES + 1 }), { ok: false, error: "bytes_out_of_range" });
  assert.ok(validateImportFile({ ...base, bytes: MAX_IMPORT_BYTES }).ok, "the limit itself is allowed");
});

test("a media type is one type and one subtype", () => {
  for (const t of ["text/csv", "application/vnd.apache.parquet", "image/png", "application/x-ipynb+json"]) {
    assert.equal(isMediaType(t), true, t);
  }
  for (const t of ["text", "text/", "/csv", "text/csv; charset=utf-8", "TEXT/CSV", "text/csv\nX: y"]) {
    assert.equal(isMediaType(t), false, t);
  }
  assert.deepEqual(validateImportFile({ ownerId: OWNER, sha256: HASH, bytes: 1, mediaType: "nope" }), {
    ok: false,
    error: "media_type_malformed",
  });
});

test("the bucket name is the one the migration creates", () => {
  assert.equal(IMPORT_BUCKET, "research-os-imports");
  assert.equal(MAX_IMPORT_BYTES, 52_428_800, "50 MiB, the bucket's file_size_limit and the local stack's");
});
