import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalize, newItems, loadState, saveState, beadTitle, beadDescription, beadArgs, digest, makeJwt } from "./lib.mjs";

const fx = (n) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)));
const shots = fx("screenshot").data.map((r) => normalize("Polingual", "screenshot", r));
const crashes = fx("crash").data.map((r) => normalize("Bucket Foundation", "crash", r));

test("normalize maps attributes", () => {
  assert.equal(shots[0].device, "iPhone15,2 iOS 26.1");
  assert.deepEqual(shots[0].screenshots, ["https://example.com/s1.png"]);
  assert.equal(shots[1].comment, "");
});

test("dedupe skips seen ids and repeats, sorts by date", () => {
  const state = { seen: { "cr-1": { beadId: "bkt-x" } } };
  const fresh = newItems([...shots, ...crashes, shots[0]], state);
  assert.deepEqual(fresh.map((i) => i.id), ["fb-1", "fb-2"]);
});

test("state round-trips through disk", () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "tf-")), "s", "state.json");
  assert.deepEqual(loadState(f), { seen: {} });
  saveState(f, { seen: { a: { beadId: "bkt-1" } } });
  assert.equal(newItems([{ id: "a", createdDate: "" }], loadState(f)).length, 0);
});

test("bead formatting", () => {
  assert.equal(beadTitle(shots[0]), "TestFlight feedback, Polingual: Tiles overlap on small screens");
  assert.equal(beadTitle(shots[1]), "TestFlight feedback, Polingual: no comment");
  assert.match(beadDescription(shots[0]), /ASC feedback id: fb-2[\s\S]*- https:\/\/example.com\/s1.png/);
  assert.match(beadDescription(crashes[0]), /crashLog/);
  const args = beadArgs(crashes[0]);
  assert.ok(args.includes("--labels=source-tester"));
  assert.ok(args.includes("--type=bug"));
  assert.ok(args.includes("--external-ref=asc-cr-1"));
});

test("digest is one line per item", () => {
  const d = digest([{ item: shots[0], beadId: "bkt-a" }, { item: crashes[0], beadId: "bkt-b" }]);
  assert.deepEqual(d.split("\n"), [
    "TestFlight: 2 new item(s)",
    "bkt-a Polingual feedback, 1 screenshot(s): Tiles overlap on small screens",
    "bkt-b Bucket Foundation crash: Crashed on launch",
  ]);
  assert.equal(digest([]), "");
});

test("jwt verifies with ES256", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const t = makeJwt({ keyId: "K", issuerId: "I", privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) });
  const [h, b, s] = t.split(".");
  assert.ok(crypto.verify("sha256", Buffer.from(`${h}.${b}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url")));
  assert.equal(JSON.parse(Buffer.from(b, "base64url")).aud, "appstoreconnect-v1");
});
