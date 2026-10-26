import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { EXPERIMENTS, assign, flagsFor, hashArm, type CohortSettingRow } from "../src/lib/beta/experiments";
import { buildReport } from "../src/lib/beta/metrics";
import type { StoredBetaEvent } from "../src/lib/beta/store";
import { handleBetaFlags } from "../src/app/api/beta/flags/handler";
import { handleBetaReport, handleSetCohort } from "../src/app/api/admin/beta/handler";
import { memory, NOW } from "./beta-memory-store";

const USER = "11111111-1111-1111-1111-111111111111";
const KEY = "k".repeat(24);
const ids = Array.from({ length: 400 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);

test("the four bead experiments are registered", () => {
  assert.deepEqual(EXPERIMENTS.map((e) => e.key), ["option_language", "new_words", "practice_order", "cognate_hints"]);
});

test("hash assignment is deterministic and splits close to even", () => {
  for (const exp of EXPERIMENTS) {
    assert.equal(hashArm(exp, USER), hashArm(exp, USER.toUpperCase()));
    const counts = new Map<string, number>();
    for (const id of ids) counts.set(hashArm(exp, id), (counts.get(hashArm(exp, id)) ?? 0) + 1);
    for (const arm of exp.arms) assert.ok((counts.get(arm) ?? 0) > 150, `${exp.key}:${arm}`);
  }
});

test("cohort settings force an arm or switch the experiment off", () => {
  const exp = EXPERIMENTS[1];
  const rows: CohortSettingRow[] = [
    { experiment: "new_words", cohort: "wave1", setting: "8" },
    { experiment: "new_words", cohort: "staff", setting: "off" },
    { experiment: "new_words", cohort: "odd", setting: "12" },
  ];
  assert.deepEqual(assign(exp, USER, "wave1", rows), { value: "8", arm: "8", source: "cohort" });
  assert.deepEqual(assign(exp, USER, "staff", rows), { value: "4", arm: null, source: "off" });
  assert.equal(assign(exp, USER, "odd", rows).source, "off");
  assert.equal(assign(exp, USER, "default", rows).source, "hash");
  assert.equal(Object.keys(flagsFor(USER, "default", [])).length, 4);
});

test("the report groups by the stored arm, and a later cohort change leaves it unchanged", async () => {
  const exp = EXPERIMENTS[0];
  const cross = ids.find((id) => hashArm(exp, id) === "cross")!;
  const same = ids.find((id) => hashArm(exp, id) === "same")!;
  const store = memory();
  const flags = (id: string) =>
    handleBetaFlags(req("http://localhost/api/beta/flags?app=polingual"), { verifyUser: async () => ({ id, email: null }), store: () => store, now: () => NOW });
  await store.tester(cross, "polingual");
  await store.tester(same, "polingual");
  await flags(cross);
  await flags(same);
  const e = (userId: string, ts: string, correct: boolean, ms: number): StoredBetaEvent => ({ userId, app: "polingual", name: "card_answered", sessionId: null, ts, props: { correct, ms } });
  const events = [e(cross, "2026-10-01T09:00:00Z", true, 2000), e(cross, "2026-10-02T09:00:00Z", true, 4000), e(same, "2026-10-01T09:00:00Z", false, 3000)];
  const report = async () => buildReport(await store.testers(), events, new Date("2026-10-26T00:00:00Z"), await store.assignments());
  const before = await report();
  const x = before.experiments.find((s) => s.key === "option_language")!;
  const byArm = Object.fromEntries(x.arms.map((a) => [a.cohort, a]));
  assert.deepEqual([byArm.cross.users, byArm.cross.retention[1], byArm.cross.recall[1], byArm.cross.avgCardMs, byArm.cross.pinned], [1, 1, 1, 3000, 0]);
  assert.deepEqual([byArm.same.users, byArm.same.retention[1]], [1, 0]);

  await store.setCohortSetting({ experiment: "option_language", cohort: "default", setting: "same" });
  await store.setCohort(cross, "wave2");
  await flags(cross);
  const after = await report();
  assert.deepEqual(after.experiments.find((s) => s.key === "option_language")!.arms, x.arms);
  const again = await (await flags(same)).json();
  assert.equal(again.flags.option_language.arm, "same");
  assert.equal(again.flags.option_language.source, "hash");
});

function req(url: string, init: { method?: string; key?: string | null; body?: unknown } = {}): NextRequest {
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers: init.key === null ? {} : { authorization: `Bearer ${init.key ?? "t"}`, "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

test("flags API returns cohort and arms for the bearer user", async () => {
  const store = memory();
  const deps = { verifyUser: async (r: NextRequest) => (r.headers.get("authorization") ? { id: USER, email: null } : null), store: () => store };
  assert.equal((await handleBetaFlags(req("http://localhost/api/beta/flags?app=polingual", { key: null }), deps)).status, 401);
  assert.equal((await handleBetaFlags(req("http://localhost/api/beta/flags?app=android"), deps)).status, 400);
  const body = await (await handleBetaFlags(req("http://localhost/api/beta/flags?app=polingual"), deps)).json();
  assert.equal(body.cohort, "default");
  assert.equal(body.flags.new_words.value, hashArm(EXPERIMENTS[1], USER));

  const admin = { adminKey: () => KEY, store: () => store };
  const set = (body: unknown) => handleSetCohort(req("http://localhost/api/admin/beta", { method: "POST", key: KEY, body }), admin);
  assert.equal((await set({ experiment: "nope", cohort: "default", setting: "on" })).status, 400);
  assert.equal((await set({ experiment: "new_words", cohort: "default", setting: "16" })).status, 400);
  assert.equal((await set({ experiment: "new_words", cohort: "default", setting: "8" })).status, 200);
  const again = await (await handleBetaFlags(req("http://localhost/api/beta/flags?app=polingual"), deps)).json();
  assert.equal(again.flags.new_words.value, body.flags.new_words.value);
  assert.equal(again.flags.new_words.source, "hash");
  assert.equal((await store.assignments(USER)).length, 4);
  const report = await (await handleBetaReport(req("http://localhost/api/admin/beta", { key: KEY }), admin)).json();
  assert.equal(report.settings.length, 1);
  assert.equal(report.experiments.length, 4);
});
