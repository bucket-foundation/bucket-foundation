/**
 * Standalone test for the Academy tutor's LLM provider selection
 * (src/app/api/academy/tutor/route.ts `selectProvider`).
 *
 * Verifies the wiring contract:
 *   - LLM_BASE_URL set            => "local"  (the DEFAULT path: Gian's local GPU LLM)
 *   - LLM_BASE_URL + ANTHROPIC    => "local"  (local takes precedence)
 *   - only ANTHROPIC_API_KEY set  => "anthropic" (fallback alternative)
 *   - neither set                 => null     (=> route returns 503, tutor dark)
 *
 * Matches the repo's ts-node test convention (see package.json "test" script).
 *
 * Run:  npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-tutor-provider.ts
 */
import { selectProvider } from "../src/app/api/academy/tutor/provider";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got=${String(got)}, want=${String(want)})`);
  if (!ok) failures++;
}

function clear() {
  delete process.env.LLM_BASE_URL;
  delete process.env.ANTHROPIC_API_KEY;
}

// 1. local LLM configured => local is the default
clear();
process.env.LLM_BASE_URL = "http://localhost:11434/v1";
check("LLM_BASE_URL set selects local", selectProvider(), "local");

// 2. both configured => local wins (local is the default per the task)
clear();
process.env.LLM_BASE_URL = "http://localhost:11434/v1";
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
check("local takes precedence over anthropic", selectProvider(), "local");

// 3. only anthropic => fallback alternative
clear();
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
check("anthropic-only selects anthropic", selectProvider(), "anthropic");

// 4. neither => null (503 / dark)
clear();
check("nothing configured => null (503)", selectProvider(), null);

clear();
if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll tutor provider-selection checks passed.");
