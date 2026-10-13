import test from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LIMITS, checkLimits, countTokens, longestToken, tokenize } from "../src/lib/research-os/work-quiz/limits";
import { hasMath, mathToText, splitMath, texToText } from "../src/lib/research-os/work-quiz/math";

(globalThis as { React?: typeof React }).React = React;
const loaded = import("../src/components/math/InlineMath");

const html = async (text: string) => renderToStaticMarkup(React.createElement((await loaded).InlineMath, { text }));

test("splitMath separates text, inline and display spans", () => {
  assert.deepEqual(splitMath("Solve $x^2$ and $$y=1$$ now"), [
    { kind: "text", value: "Solve ", display: false },
    { kind: "math", value: "x^2", display: false },
    { kind: "text", value: " and ", display: false },
    { kind: "math", value: "y=1", display: true },
    { kind: "text", value: " now", display: false },
  ]);
});

test("currency and escaped dollars stay text", () => {
  assert.equal(hasMath("It costs $5 and $10 in total"), false);
  assert.equal(hasMath("Pay \\$5 or \\$6"), false);
  assert.equal(hasMath("A lone $ sign"), false);
  assert.equal(hasMath("one $x$ here"), true);
});

test("InlineMath renders spans through KaTeX and leaves plain text alone", async () => {
  assert.match(await html("Find $x^2$"), /class="katex"/);
  assert.equal(await html("plain words"), "plain words");
});

test("InlineMath falls back to text for broken LaTeX without throwing", async () => {
  const out = await html("bad $\\frac{1$ end");
  assert.ok(out.includes("end"));
});

test("a math span counts as one token whatever its length", () => {
  assert.equal(countTokens("$\\frac{a+b}{c+d} = 1$"), 1);
  assert.equal(countTokens("What is $E = mc^2$ here"), 4);
  assert.deepEqual(tokenize("Add $x + y$."), ["Add", "$x + y$"]);
});

test("limits measure the rendered text of a span", () => {
  assert.ok(longestToken("$\\alpha\\beta\\gamma$") < "$\\alpha\\beta\\gamma$".length);
  const found = checkLimits({ prompt: "Value of $\\sqrt{x}$", choices: ["$a$", "$b$", "$c$"] });
  assert.deepEqual(found, []);
  assert.ok(LIMITS.option >= 1);
});

test("texToText maps common commands to Unicode", () => {
  assert.equal(texToText("\\alpha + \\beta"), "α + β");
  assert.equal(texToText("x^2 \\le y"), "x² ≤ y");
  assert.equal(texToText("\\frac{a}{b}"), "a/b");
  assert.equal(mathToText("Is $\\sqrt{2} \\to \\infty$?"), "Is √2 → ∞?");
});
