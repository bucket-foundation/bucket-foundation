import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseRecords, newItems, loadState, saveState, beadTitle, beadDescription, beadArgs, digest } from "./lib.mjs";

const records = parseRecords(fs.readFileSync(new URL("./fixtures/beta_feedback.jsonl", import.meta.url), "utf8"));
const shots = records.filter((r) => r.kind === "screenshot");
const crashes = records.filter((r) => r.kind === "crash");

test("parseRecords maps beta_feedback.py --json lines", () => {
  assert.equal(records.length, 3);
  assert.equal(shots[0].app, "Polingual");
  assert.equal(crashes[0].app, "Bucket Foundation");
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

test("filedIds reads asc external refs from bd", async () => {
  const { filedIds } = await import("./lib.mjs");
  const ids = filedIds([{ external_ref: "asc-abc" }, { external_ref: null }, { external_ref: "gh-1" }, {}]);
  assert.deepEqual([...ids], ["abc"]);
});

test("newItems skips items already filed in bd even when local state is lost", () => {
  const fresh = newItems(records, { seen: {} }, new Set([records[0].id]));
  assert.ok(!fresh.some((r) => r.id === records[0].id));
  assert.equal(fresh.length, records.length - 1);
});

test("dailyDigest covers runs since the last digest within a day", async () => {
  const { dailyDigest, logItem } = await import("./lib.mjs");
  const now = Date.parse("2026-10-27T09:00:00Z");
  const log = [
    { at: "2026-10-25T09:00:00Z", status: "ok", items: [logItem(records[0], "bkt-old")] },
    { at: "2026-10-26T09:00:00Z", status: "digest" },
    { at: "2026-10-26T12:00:00Z", status: "ok", items: [logItem(crashes[0], "bkt-c1")] },
    { at: "2026-10-26T12:30:00Z", status: "error", error: "x" },
    { at: "2026-10-26T13:00:00Z", status: "ok", items: [] },
  ];
  const d = dailyDigest(log, now);
  assert.equal(d.items, 1);
  assert.equal(d.errors, 1);
  assert.match(d.text, /^TestFlight daily: 1 new item\(s\), 2 run\(s\) ok, 1 failed/);
  assert.match(d.text, /bkt-c1 Bucket Foundation crash/);
  assert.ok(!d.text.includes("bkt-old"));
});

test("a digest right after another one reports nothing new", async () => {
  const { dailyDigest } = await import("./lib.mjs");
  const d = dailyDigest([{ at: "2026-10-27T08:59:00Z", status: "digest" }], Date.parse("2026-10-27T09:00:00Z"));
  assert.equal(d.items, 0);
});
