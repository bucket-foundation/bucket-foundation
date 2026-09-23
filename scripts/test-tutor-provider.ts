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

clear();
process.env.LLM_BASE_URL = "http://localhost:11434/v1";
check("LLM_BASE_URL set selects local", selectProvider(), "local");

clear();
process.env.LLM_BASE_URL = "http://localhost:11434/v1";
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
check("local takes precedence over anthropic", selectProvider(), "local");

clear();
process.env.ANTHROPIC_API_KEY = "sk-ant-test";
check("anthropic-only selects anthropic", selectProvider(), "anthropic");

clear();
check("nothing configured => null (503)", selectProvider(), null);

clear();
if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll tutor provider-selection checks passed.");
