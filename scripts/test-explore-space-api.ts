import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/explore/space/route";
import { ADVISORS_ID, allowedSets, availableSets, localSpaceEnabled, publicDataset, resolveSpaceFile } from "../src/lib/explore/space-api";
import { SPACE_SCHEMA, parseDataset } from "../src/lib/explore/space";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "space-api-"));
const dir = path.join(tmp, "explore");
fs.mkdirSync(dir);
const registry = path.join(tmp, "corpora.json");
fs.writeFileSync(
  registry,
  JSON.stringify({ corpora: { pub: { publish: true }, hidden: {}, kruse: { private: true, publish: true }, "also-pub": { publish: true }, "Bad Name": { publish: true }, "../x": { publish: true } } }),
);
const SECRET = path.join(tmp, "secret.space.json");

function comps() {
  return Array.from({ length: 4 }, (_, i) => ({ index: i + 1, angle_deg: i * 90, variance_ratio: 0.25, top_terms: [`t${i}`], bottom_terms: [] as string[] }));
}

function dataset(id: string, obsExtra: Record<string, unknown> = {}) {
  return { schema: SPACE_SCHEMA, id, label: id, license: "CC0", fields: [], components: comps(), obs: [{ id: "a", title: "A", scores: [0, 1, 2, 3], t: 1990, meta: { institution: "Example U", secret: "hidden", note: "jane@example.org" }, links: ["https://example.org/a", "mailto:jane@example.org"], ...obsExtra }] };
}

for (const id of ["advisors", "pub", "hidden", "kruse", "also-pub"]) fs.writeFileSync(path.join(dir, `${id}.space.json`), JSON.stringify(dataset(id)));
fs.writeFileSync(SECRET, JSON.stringify(dataset("secret")));

function withEnv<T>(env: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) prev[k] = process.env[k];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
    else (process.env as Record<string, string | undefined>)[k] = v;
  }
  return fn().finally(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
      else (process.env as Record<string, string | undefined>)[k] = v;
    }
  });
}

const ON = { NODE_ENV: "development", BUCKET_LOCAL_SPACE: "1", BUCKET_SPACE_DIR: dir, BUCKET_CORPORA_JSON: registry };
const call = (qs: string) => GET(new NextRequest(`http://localhost/api/explore/space${qs}`));

test("the route fails closed in production and without the flag", async () => {
  for (const env of [{ ...ON, NODE_ENV: "production" }, { ...ON, NODE_ENV: "test" }, { ...ON, BUCKET_LOCAL_SPACE: undefined }, { ...ON, BUCKET_LOCAL_SPACE: "0" }, { ...ON, BUCKET_LOCAL_SPACE: "true" }]) {
    await withEnv(env, async () => {
      assert.equal((await call("")).status, 404);
      assert.equal((await call("?id=advisors")).status, 404);
      assert.equal((await call("?id=pub")).status, 404);
    });
  }
  assert.equal(localSpaceEnabled({ NODE_ENV: "development", BUCKET_LOCAL_SPACE: "1" }), true);
  assert.equal(localSpaceEnabled({ NODE_ENV: "production", BUCKET_LOCAL_SPACE: "1" }), false);
});

test("the allow-list is the advisors set plus published public corpora with clean ids", () => {
  assert.deepEqual(allowedSets(registry).map((a) => a.id), [ADVISORS_ID, "pub", "also-pub"]);
  assert.deepEqual(allowedSets(path.join(tmp, "missing.json")).map((a) => a.id), [ADVISORS_ID]);
  fs.writeFileSync(path.join(tmp, "broken.json"), "{");
  assert.deepEqual(allowedSets(path.join(tmp, "broken.json")).map((a) => a.id), [ADVISORS_ID]);
});

test("private, unmarked and malformed ids are never served", async () => {
  await withEnv(ON, async () => {
    for (const id of ["kruse", "hidden", "nope", "Bad Name", "PUB", "pub.space", "pub.space.json"]) assert.equal((await call(`?id=${encodeURIComponent(id)}`)).status, 404, id);
  });
});

test("path traversal never reaches a file outside the data directory", async () => {
  await withEnv(ON, async () => {
    for (const id of ["../secret", "..%2Fsecret", "../../etc/passwd", "pub/../../secret", "advisors/../../secret", "%2e%2e%2fsecret", "pub%00", "/etc/passwd", "..\\secret", "pub/", ".", ".."]) {
      const res = await call(`?id=${id}`);
      assert.equal(res.status, 404, id);
      assert.ok(!(await res.text()).includes("secret"), id);
    }
  });
  const allowed = allowedSets(registry);
  assert.equal(resolveSpaceFile("../secret", allowed, dir), null);
  assert.equal(resolveSpaceFile("pub", allowed, dir), path.join(dir, "pub.space.json"));
  assert.equal(resolveSpaceFile(null, allowed, dir), null);
});

test("a listed data set is served with scrubbed, allow-listed fields", async () => {
  await withEnv(ON, async () => {
    const list = (await (await call("")).json()) as { datasets: { id: string }[] };
    assert.deepEqual(list.datasets.map((d) => d.id), ["advisors", "pub", "also-pub"]);
    const res = await call("?id=advisors");
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const text = await res.text();
    assert.ok(!/@/.test(text));
    const ds = parseDataset(JSON.parse(text));
    assert.equal(ds.obs[0].meta.institution, "Example U");
    assert.equal(ds.obs[0].meta.secret, undefined);
    assert.equal(ds.license, "CC0");
    assert.deepEqual(ds.obs[0].links, ["https://example.org/a"]);
  });
});

test("the list only names data sets whose files exist", async () => {
  const empty = path.join(tmp, "empty");
  fs.mkdirSync(empty);
  fs.writeFileSync(path.join(empty, "pub.space.json"), JSON.stringify(dataset("pub")));
  assert.deepEqual(availableSets(allowedSets(registry), empty).map((a) => a.id), ["pub"]);
});

test("a malformed or oversize file fails closed", async () => {
  await withEnv(ON, async () => {
    fs.writeFileSync(path.join(dir, "pub.space.json"), "not json");
    assert.equal((await call("?id=pub")).status, 404);
    fs.writeFileSync(path.join(dir, "pub.space.json"), JSON.stringify({ ...dataset("pub"), obs: [{ id: "a", title: "A", scores: [0, NaN, 1, 2], meta: {}, links: [] }] }));
    assert.equal((await call("?id=pub")).status, 404);
    fs.writeFileSync(path.join(dir, "pub.space.json"), JSON.stringify({ ...dataset("pub"), schema: "other/1" }));
    assert.equal((await call("?id=pub")).status, 404);
  });
});

test("publicDataset drops the sample flag and unknown meta keys", () => {
  const ds = parseDataset({ ...dataset("x"), sample: true });
  const pub = publicDataset(ds);
  assert.equal(pub.sample, false);
  assert.deepEqual(Object.keys(pub.obs[0].meta), ["institution"]);
});
