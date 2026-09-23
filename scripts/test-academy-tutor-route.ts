import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleTutor, MAX_GROUNDING_CHARS, type TutorDeps } from "../src/app/api/academy/tutor/handler";
import { memoryLimiter, type DailyLimiter } from "../src/lib/llm/daily-limit";
import { findTutorAtom, type TutorAtom } from "../src/lib/academy/find-atom";
import { loadCorpusForBranch } from "../src/lib/academy/corpus";
import type { CompleteOptions } from "../src/lib/llm/client";
import type { Atom } from "../src/lib/academy/engine";

const ATOM: Atom = {
  id: "newton-2",
  title: "Newton's second law",
  summary: "Force equals the rate of change of momentum.",
  lesson: "Push a cart and it speeds up.",
  sources: ["Feynman Lectures I-9"],
  requires: ["momentum"],
  quiz: [{ prompt: "State the second law.", answer: "F = dp/dt" }],
};

function found(atom: Atom = ATOM): TutorAtom {
  return { atom, titleOf: (id) => (id === "momentum" ? "Momentum" : null) };
}

interface Harness {
  deps: TutorDeps;
  calls: CompleteOptions[];
  hits: string[];
}

function harness(over: Partial<TutorDeps> = {}, reply = '{"reply":"What changes when you push harder?","confidence":"high","abstained":false,"citations":["Feynman Lectures I-9"]}'): Harness {
  const calls: CompleteOptions[] = [];
  const hits: string[] = [];
  const inner = memoryLimiter();
  const limiter: DailyLimiter = {
    hit: (subject, route, now) => {
      hits.push(`${route}:${subject}`);
      return inner.hit(subject, route, now);
    },
  };
  const deps: TutorDeps = {
    verifyUser: async (req) => (req.headers.get("authorization") === "Bearer good" ? { id: "user-1", email: null } : null),
    provider: () => "anthropic",
    limiter: () => limiter,
    caps: () => ({ user: 2, global: 100 }),
    findAtom: (_branch, id) => (id === ATOM.id ? found() : null),
    complete: async (opts) => {
      calls.push(opts);
      return { text: reply };
    },
    local: { baseUrl: "", model: "", apiKey: "", timeoutMs: 1000 } as unknown as CompleteOptions["local"],
    now: () => new Date("2026-09-23T12:00:00Z"),
    ...over,
  };
  return { deps, calls, hits };
}

function request(body: unknown, auth: string | null = "Bearer good"): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = auth;
  return new NextRequest("http://localhost/api/academy/tutor", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const ASK = { atomId: "newton-2", branch: "02-physics", question: "Why does it speed up?" };

test("anonymous request gets 401 with no model call and no quota spent", async () => {
  const h = harness();
  const res = await handleTutor(request(ASK, null), h.deps);
  assert.equal(res.status, 401);
  const json = await res.json();
  assert.equal(json.signIn, true);
  assert.equal(h.calls.length, 0);
  assert.deepEqual(h.hits, []);
});

test("anonymous request gets 401 even while no provider is configured", async () => {
  const h = harness({ provider: () => null });
  const res = await handleTutor(request(ASK, null), h.deps);
  assert.equal(res.status, 401);
});

test("signed-in request gets 200 with server grounding and validated citations", async () => {
  const h = harness();
  const res = await handleTutor(request({ ...ASK, grounding: { summary: "INJECTED BROWSER TEXT" } }), h.deps);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.reply, "What changes when you push harder?");
  assert.deepEqual(json.citations, [{ label: "Feynman Lectures I-9" }]);
  assert.equal(json.grounded_on, "Newton's second law");
  const prompt = h.calls[0].messages.at(-1)!.content;
  assert.match(prompt, /Force equals the rate of change of momentum/);
  assert.match(prompt, /PREREQUISITES \(already-covered concepts\): Momentum/);
  assert.doesNotMatch(prompt, /INJECTED BROWSER TEXT/);
  assert.deepEqual(h.hits, ["tutor:user-1", "all:global"]);
});

test("over the per-user limit gets 429 with Retry-After and no model call", async () => {
  const h = harness();
  assert.equal((await handleTutor(request(ASK), h.deps)).status, 200);
  assert.equal((await handleTutor(request(ASK), h.deps)).status, 200);
  const res = await handleTutor(request(ASK), h.deps);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), String(12 * 3600));
  const json = await res.json();
  assert.equal(json.limit, 2);
  assert.equal(json.scope, "user");
  assert.equal(h.calls.length, 2);
});

test("over the global limit gets 429 scoped global", async () => {
  const h = harness({ caps: () => ({ user: 50, global: 1 }) });
  assert.equal((await handleTutor(request(ASK), h.deps)).status, 200);
  const res = await handleTutor(request(ASK), h.deps);
  assert.equal(res.status, 429);
  assert.equal((await res.json()).scope, "global");
});

test("a 20,000-character body gets 413 before parsing", async () => {
  const h = harness();
  const res = await handleTutor(request({ ...ASK, grounding: { lesson: "x".repeat(20_000) } }), h.deps);
  assert.equal(res.status, 413);
  assert.equal(h.calls.length, 0);
  assert.deepEqual(h.hits, []);
});

test("an oversized body without a content-length is still refused", async () => {
  const h = harness();
  const req = request(JSON.stringify({ ...ASK, question: "q", pad: "y".repeat(17_000) }));
  req.headers.delete("content-length");
  assert.equal((await handleTutor(req, h.deps)).status, 413);
});

test("unset provider gets 503 and spends no quota", async () => {
  const h = harness({ provider: () => null });
  const res = await handleTutor(request(ASK), h.deps);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /isn't enabled/);
  assert.deepEqual(h.hits, []);
});

test("missing limiter or a limiter failure gets 503 with no model call", async () => {
  const none = harness({ limiter: () => null });
  assert.equal((await handleTutor(request(ASK), none.deps)).status, 503);
  const broken = harness({ limiter: () => ({ hit: async () => { throw new Error("db down"); } }) });
  assert.equal((await handleTutor(request(ASK), broken.deps)).status, 503);
  assert.equal(broken.calls.length, 0);
});

test("unknown atom gets 404 and malformed input gets 400", async () => {
  const h = harness();
  assert.equal((await handleTutor(request({ ...ASK, atomId: "nope" }), h.deps)).status, 404);
  assert.equal((await handleTutor(request({ ...ASK, question: "" }), h.deps)).status, 400);
  assert.equal((await handleTutor(request({ ...ASK, atomId: "" }), h.deps)).status, 400);
  assert.equal((await handleTutor(request("{not json"), h.deps)).status, 400);
});

test("history is clamped to 8 turns of 1,000 characters", async () => {
  const h = harness();
  const history = Array.from({ length: 11 }, (_, i) => ({ role: i % 2 ? "tutor" : "user", content: `${i}:` + "h".repeat(1_200) }));
  assert.equal((await handleTutor(request({ ...ASK, history }), h.deps)).status, 200);
  const sent = h.calls[0].messages.slice(0, -1);
  assert.equal(sent.length, 8);
  assert.ok(sent.every((m) => m.content.length <= 1000));
  assert.match(sent[0].content, /^3:/);
});

test("built grounding stays under the cap for an oversized lesson", async () => {
  const big = { ...ATOM, lesson: "L".repeat(40_000) };
  const h = harness({ findAtom: () => found(big) });
  assert.equal((await handleTutor(request(ASK), h.deps)).status, 200);
  const prompt = h.calls[0].messages.at(-1)!.content;
  const grounding = prompt.slice(prompt.indexOf("\n\n") + 2, prompt.indexOf("\n\n---\nLEARNER QUESTION"));
  assert.ok(grounding.length <= MAX_GROUNDING_CHARS, `grounding is ${grounding.length}`);
  assert.match(grounding, /ALLOWED CITATIONS/);
});

test("unparseable model output abstains with 200", async () => {
  const h = harness({}, "not json");
  const res = await handleTutor(request(ASK), h.deps);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).abstained, true);
});

test("the corpus lookup finds an atom with or without the branch", () => {
  const id = String(loadCorpusForBranch("02-physics")?.atoms?.[0]?.id);
  assert.equal(findTutorAtom("02-physics", id)?.atom.id, id);
  assert.equal(findTutorAtom(null, id)?.atom.id, id);
  assert.equal(findTutorAtom("not-a-branch", id)?.atom.id, id);
  assert.equal(findTutorAtom(null, "no-such-atom-id"), null);
});
