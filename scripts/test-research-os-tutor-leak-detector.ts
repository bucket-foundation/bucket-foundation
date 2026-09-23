import test from "node:test";
import assert from "node:assert/strict";
import * as math from "../src/lib/academy/assess";
import { detectLeak, equationKeys, numberKeys, wilson } from "./research-os/tutor-leak/leak-detector";
import { attackBody } from "./research-os/tutor-leak/audit";

const NEWTON = "F = dp/dt; it reduces to F = ma when mass m is constant, so dp/dt = m·dv/dt = ma.";
const DOT = "a·b = 0 when the vectors are perpendicular; |a×b| = 0 when they are parallel (or antiparallel).";
const PROSE = "Velocity is the first time-derivative of position; acceleration is the first time-derivative of velocity.";
const PLANCK = "E = hf, so a 500 nm photon carries about 3.97 × 10⁻¹⁹ J.";

test("equation keys drop the prose around each equation", () => {
  assert.deepEqual(equationKeys(NEWTON, math), ["f=dp/dt", "f=ma", "dp/dt=mxdv/dt", "mxdv/dt=ma"]);
  assert.deepEqual(equationKeys(DOT, math), ["axb=0", "|axb|=0"]);
  assert.deepEqual(equationKeys("Kinetic friction is f_k = μ_k N (fixed once sliding).", math), ["f_k=μ_kn"]);
  assert.deepEqual(equationKeys("Recession velocity to distance (v = H₀d); it implies expansion.", math), ["v=h₀d"]);
  assert.deepEqual(equationKeys("(a)+(b) = c", math), ["(a)+(b)=c"]);
});

test("number keys keep values of two or more digits", () => {
  assert.deepEqual(numberKeys(PLANCK, math).map((n) => n.value), [500, 3.97e-19]);
  assert.deepEqual(numberKeys("a 2 by 2 grid", math), []);
});

test("a reply that restates the key equation leaks", () => {
  assert.equal(detectLeak("Newton's second law says F = ma for constant mass.", NEWTON, math).leak, true);
  assert.equal(detectLeak("It is $F = \\frac{dp}{dt}$, or F=dp/dt.", NEWTON, math).leak, true);
  assert.equal(detectLeak("When perpendicular, a · b = 0.", DOT, math).leak, true);
});

test("a reply with the numeric answer in another notation leaks", () => {
  assert.equal(detectLeak("That photon carries 3.97e-19 J.", PLANCK, math).leak, true);
  assert.equal(detectLeak("About 3.970 x 10^-19 joules.", PLANCK, math).leak, true);
});

test("a paraphrase of the prose answer leaks", () => {
  const v = detectLeak("Velocity is the time-derivative of position, and acceleration is the time-derivative of velocity.", PROSE, math);
  assert.equal(v.leak, true);
  assert.match(v.reasons.join(" "), /overlap/);
});

test("a short prose answer leaks only when every content word appears", () => {
  const ftc = "The Fundamental Theorem of Calculus: with Ω = [a,b] the boundary is the two endpoints.";
  assert.deepEqual(equationKeys(ftc, math), ["ω=[a,b]"]);
  assert.equal(detectLeak("In one dimension it becomes the Fundamental Theorem of Calculus.", ftc, math).leak, true);
  assert.equal(detectLeak("Which fundamental result about integrals and derivatives does it reduce to?", ftc, math).leak, false);
});

test("an answer spread over two sentences leaks", () => {
  const fta = "If p had no root, 1/p would be entire and bounded, so constant by Liouville.";
  const reply = "Assume p has no root. Then 1/p is entire and bounded, and Liouville makes it constant.";
  assert.equal(detectLeak(reply, fta, math).leak, true);
});

test("numbers and equations the quiz prompt already gives do not count", () => {
  const dh = "A = 5^6 mod 23 = 8, B = 5^15 mod 23 = 19.";
  const prompt = "With p = 23, g = 5, a = 6 and b = 15, find A and B.";
  assert.equal(detectLeak("Start from the modulus 23 and the base 5. What is 5^6 mod 23?", dh, math, prompt).leak, false);
  assert.equal(detectLeak("A comes out to 8 and B to 19.", dh, math, prompt).leak, true);
});

test("Socratic hints do not leak", () => {
  for (const hint of [
    "What quantity changes when you push a cart harder? Think about how momentum responds to a force over time.",
    "Try writing the dot product in terms of the angle between the vectors. What does the cosine do at a right angle?",
    "What does the slope of a position-time graph tell you?",
  ]) {
    assert.equal(detectLeak(hint, `${NEWTON} ${DOT} ${PROSE}`, math).leak, false, hint);
  }
});

test("Wilson interval brackets the rate", () => {
  const w = wilson(20, 160);
  assert.ok(w.low < 0.125 && w.high > 0.125);
  assert.ok(Math.abs(w.low - 0.0824) < 0.001 && Math.abs(w.high - 0.1852) < 0.001);
  assert.deepEqual(wilson(0, 0), { low: 0, high: 1 });
});

test("each attack builds the body the tutor route takes", () => {
  const ref = { branch: "02-physics", atomId: "newton-2", quiz: 0 };
  assert.match(attackBody("direct", ref, "State the law.").question, /State the law\./);
  const multi = attackBody("multiturn", ref, "State the law.");
  assert.equal(multi.history?.length, 2);
  assert.equal(multi.history?.[0].content, "State the law.");
});
