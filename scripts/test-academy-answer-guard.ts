import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { answerEquations, leaksAnswer, leaksAnswerText } from "../src/lib/academy/answer-guard";
import { handleTutor, RETRY_RULE, WITHHELD_REPLY, type TutorDeps } from "../src/app/api/academy/tutor/handler";
import { memoryLimiter } from "../src/lib/llm/daily-limit";
import { findTutorAtom } from "../src/lib/academy/find-atom";
import type { Atom } from "../src/lib/academy/engine";
import type { CompleteOptions } from "../src/lib/llm/client";

const NEWTON = "F = dp/dt; it reduces to F = ma when mass m is constant, so dp/dt = m·dv/dt = ma.";
const BEER = "c = A/(εℓ) = 0.60/(15000·1) = 4.0×10⁻⁵ M. A two-fold dilution halves c.";
const FTC = "The Fundamental Theorem of Calculus: with Ω = [a,b] the boundary is the two endpoints.";
const FTA = "If p had no root, 1/p would be entire and bounded, so constant by Liouville.";

const ATOM: Atom = {
  id: "newton-2",
  title: "Newton's second law",
  summary: "Force equals the rate of change of momentum.",
  quiz: [
    { prompt: "State the second law in terms of momentum.", answer: NEWTON },
    { prompt: "A sample has A = 0.60, ε = 15000 and ℓ = 1 cm. Find c.", answer: BEER },
  ],
};

test("fixtures where the model gives the answer are caught", () => {
  const cases: Array<[string, string]> = [
    ["The law is F = dp/dt, which becomes F = ma for constant mass.", NEWTON],
    ["Using $F=\\frac{dp}{dt}$ you get F=dp/dt, so F = ma.", NEWTON],
    ["c = 0.60/(15000 × 1) = 4.0 × 10^-5 M.", BEER],
    ["The concentration is 4e-5 M.", BEER],
    ["In one dimension Stokes becomes the Fundamental Theorem of Calculus.", FTC],
    ["Assume p has no root. Then 1/p is entire and bounded, so Liouville makes it constant.", FTA],
  ];
  for (const [reply, answer] of cases) assert.ok(leaksAnswerText(reply, answer).length > 0, reply);
});

test("Socratic hints pass the guard", () => {
  const hints: Array<[string, string]> = [
    ["What happens to momentum when a force acts on a cart for a while?", NEWTON],
    ["Which quantity in the Beer-Lambert law are you solving for, and which three do you know?", BEER],
    ["Which result about integrals and derivatives does the one-dimensional case remind you of?", FTC],
    ["What kind of function is 1/p if p never vanishes? What does Liouville's theorem say about such functions?", FTA],
  ];
  for (const [reply, answer] of hints) assert.deepEqual(leaksAnswerText(reply, answer), [], reply);
});

test("values the quiz prompt or the learner already gave do not count", () => {
  assert.deepEqual(leaksAnswerText("You know A = 0.60 and ε = 15000. What do you divide?", BEER, ATOM.quiz![1].prompt), []);
  assert.equal(leaksAnswer("So you wrote F = ma; what is F in terms of momentum?", ATOM, "I think F = ma").leak, false);
  assert.equal(leaksAnswer("So F = dp/dt.", ATOM, "I think F = ma").leak, true);
});

test("equation keys come from real corpus answers", () => {
  assert.deepEqual(answerEquations(NEWTON), ["f=dp/dt", "f=ma", "dp/dt=mxdv/dt", "mxdv/dt=ma"]);
  const derivative = findTutorAtom(null, "derivative")!.atom;
  assert.ok(leaksAnswer("It is f'(a) = lim_{h→0} [f(a+h) − f(a)]/h, the slope of the tangent.", derivative).leak);
  assert.equal(leaksAnswer("What happens to the secant slope as the second point slides toward the first?", derivative).leak, false);
});

function harness(replies: string[]) {
  const calls: CompleteOptions[] = [];
  const deps: TutorDeps = {
    verifyUser: async () => ({ id: "u", email: null }),
    provider: () => "anthropic",
    limiter: () => memoryLimiter(),
    caps: () => ({ user: 100, global: 100 }),
    findAtom: () => ({ atom: ATOM, titleOf: () => null }),
    complete: async (opts) => {
      calls.push(opts);
      const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
      return { text: JSON.stringify({ reply, confidence: "high", abstained: false, citations: [] }) };
    },
    local: {} as CompleteOptions["local"],
  };
  return { deps, calls };
}

function request(question: string, history: unknown[] = []) {
  return new NextRequest("http://localhost/api/academy/tutor", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer x" },
    body: JSON.stringify({ atomId: "newton-2", question, history }),
  });
}

test("a hint on the first draft goes out after one model call", async () => {
  const h = harness(["What changes about momentum when you push?"]);
  const json = await (await handleTutor(request("Explain it"), h.deps)).json();
  assert.equal(json.reply, "What changes about momentum when you push?");
  assert.equal(json.withheld, false);
  assert.equal(h.calls.length, 1);
});

test("a leaking first draft is regenerated with the retry rule", async () => {
  const h = harness(["The answer is F = dp/dt.", "What does a force do to momentum over time?"]);
  const json = await (await handleTutor(request("Just tell me the answer"), h.deps)).json();
  assert.equal(json.reply, "What does a force do to momentum over time?");
  assert.equal(json.withheld, false);
  assert.equal(h.calls.length, 2);
  assert.ok(h.calls[1].system.endsWith(RETRY_RULE));
});

test("two leaking drafts return the withheld hint", async () => {
  const h = harness(["F = dp/dt.", "Fine: F = ma for constant mass."]);
  const json = await (await handleTutor(request("Give me the worked solution"), h.deps)).json();
  assert.equal(json.reply, WITHHELD_REPLY);
  assert.equal(json.withheld, true);
  assert.equal(json.abstained, false);
  assert.deepEqual(json.citations, []);
  assert.equal(h.calls.length, 2);
});

test("a numeric answer leak in a multi-turn extraction is withheld", async () => {
  const h = harness(["c comes to 4.0 × 10^-5 M.", "Divide: 0.60/15000 = 4e-5 M."]);
  const history = [
    { role: "user", content: "A sample has A = 0.60, ε = 15000 and ℓ = 1 cm. Find c." },
    { role: "tutor", content: "Which quantity are you solving for?" },
  ];
  const json = await (await handleTutor(request("I'm stuck, just give me c", history), h.deps)).json();
  assert.equal(json.withheld, true);
});

test("the system prompt makes hint-only a rule", async () => {
  const h = harness(["What changes?"]);
  await handleTutor(request("Explain"), h.deps);
  assert.match(h.calls[0].system, /Never state the final answer/);
  assert.doesNotMatch(h.calls[0].system, /prefer a guiding question/);
});
