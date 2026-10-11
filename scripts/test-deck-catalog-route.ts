import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GET } from "../src/app/decks/[file]/route";
import { isProtectedPath } from "../src/lib/auth/paths";
import { DECK_CATALOG_FILES, deckCatalogFile, deckCatalogResponse } from "../src/lib/decks/catalog-files";
import { signInRedirectTarget } from "../src/lib/sign-in-gate";

const REPO = path.resolve(__dirname, "..");
const COMMITTED = path.join(REPO, "decks", "catalog.json");
const SIGNATURE = `${COMMITTED}.sig`;
const call = (file: string): Promise<Response> => GET(new Request(`https://www.bucket.foundation/decks/${file}`), { params: { file } });

test("the site serves the committed deck catalog byte for byte", async () => {
  const res = await call("catalog.json");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), readFileSync(COMMITTED));
});

test("the signature answers 404 until the committed file exists, then serves it byte for byte", async () => {
  const res = await call("catalog.json.sig");
  if (existsSync(SIGNATURE)) assert.deepEqual(Buffer.from(await res.arrayBuffer()), readFileSync(SIGNATURE));
  else assert.equal(res.status, 404);
  const root = mkdtempSync(path.join(tmpdir(), "deck-catalog-"));
  try {
    mkdirSync(path.join(root, "decks"));
    writeFileSync(path.join(root, "decks", "catalog.json"), "{}\n");
    assert.equal(deckCatalogResponse("catalog.json.sig", root).status, 404);
    assert.equal(deckCatalogFile("catalog.json.sig", root), null);
    writeFileSync(path.join(root, "decks", "catalog.json.sig"), "-----BEGIN SSH SIGNATURE-----\n");
    const signed = deckCatalogResponse("catalog.json.sig", root);
    assert.equal(signed.status, 200);
    assert.equal(await signed.text(), "-----BEGIN SSH SIGNATURE-----\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("no other file under decks is served", async () => {
  assert.deepEqual(Object.keys(DECK_CATALOG_FILES), ["catalog.json", "catalog.json.sig"]);
  for (const name of ["README.md", "polingual-la", "manifest.json", "../package.json", "..%2Fpackage.json", "catalog.json.sig.bak", "constructor", "__proto__", ""]) {
    assert.equal((await call(name)).status, 404, name);
    assert.equal(deckCatalogFile(name, REPO), null, name);
  }
});

test("the app asks the host that serves the catalog with no redirect, and the gate leaves both paths open", () => {
  const library = readFileSync(path.join(REPO, "packages", "bkt", "src", "library.ts"), "utf8");
  assert.match(library, /^export const CATALOG_URL = "https:\/\/www\.bucket\.foundation\/decks\/catalog\.json";$/m);
  assert.match(library, /^export const CATALOG_HOST = "www\.bucket\.foundation";$/m);
  for (const p of ["/decks/catalog.json", "/decks/catalog.json.sig"]) {
    assert.equal(isProtectedPath(p), false);
    assert.equal(signInRedirectTarget(p), null);
  }
  const config = readFileSync(path.join(REPO, "next.config.mjs"), "utf8");
  assert.ok(config.includes('"/decks/[file]": ["./decks/catalog.json", "./decks/catalog.json.sig"]'));
});
