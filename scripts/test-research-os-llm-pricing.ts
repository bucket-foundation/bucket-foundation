import test from "node:test";
import assert from "node:assert/strict";
import { estimateCostUsd } from "../src/lib/research-os/llm";

test("Sonnet 4.5 is priced at 3 and 15 dollars per million tokens", () => {
  assert.equal(estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, "claude-sonnet-4-5"), 18);
  assert.ok(Math.abs((estimateCostUsd({ inputTokens: 6_000, outputTokens: 700 }) ?? 0) - 0.0285) < 1e-12);
});

test("Haiku 4.5 is priced at 1 and 5 dollars per million tokens", () => {
  assert.equal(estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, "claude-haiku-4-5"), 6);
});

test("an unknown model is priced as Sonnet 4.5 and no usage costs nothing", () => {
  assert.equal(estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 0 }, "unknown"), 3);
  assert.equal(estimateCostUsd(null), null);
});
