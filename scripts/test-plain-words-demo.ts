import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorState, RawDetails } from "../src/components/ui";
import { describePathError, rawPathError } from "../src/lib/academy/path-words";
import { friendly, signupTrouble } from "../src/lib/auth/sign-in-words";

const RAW = /\b[a-z0-9]+(?:[-_:][a-z0-9]+)+\b|\{|\}|\bstatus \d{3}\b|answered \d{3}/;

test("an error state keeps raw detail behind a closed details toggle", () => {
  const html = renderToStaticMarkup(ErrorState({ title: "No such topic", body: "This topic is not in Mathematics.", details: "topic 01-mathematics:limits" }));
  const shown = html.replace(/<details[\s\S]*<\/details>/, "").replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(shown, RAW);
  assert.match(html, /<details[^>]*><summary[^>]*>details<\/summary><pre[^>]*>topic 01-mathematics:limits<\/pre><\/details>/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.equal(renderToStaticMarkup(RawDetails({ raw: null }) ?? ""), "");
});

test("path errors read as sentences with titles, and ids stay in the raw view", () => {
  const title = (id: string) => ({ "calc-limits": "Limits", "calc-derivative": "The derivative" })[id] ?? id;
  const missing = { kind: "MissingNode", id: "calc-epsilon", requiredBy: "calc-limits" } as const;
  assert.equal(describePathError(missing, title), "Limits needs a topic Bucket does not have yet.");
  assert.match(rawPathError(missing), /calc-epsilon/);
  const cycle = { kind: "Cycle" as const, nodes: ["calc-limits", "calc-derivative"] };
  assert.equal(describePathError(cycle, title), "Two topics each need the other first: Limits, The derivative.");
  for (const e of [missing, cycle, { kind: "MasteryConflict" } as const]) assert.doesNotMatch(describePathError(e as never, title), /calc-|graph|prerequisite/);
});

test("sign-in never shows an error code or a raw object", () => {
  for (const raw of ["over_email_send_rate_limit", "unexpected_failure", '{"code":500}', "status: 500", "AuthApiError code=otp_disabled"]) {
    const shown = friendly(raw);
    assert.doesNotMatch(shown, /_|\{|status|code/, `${raw} -> ${shown}`);
  }
  assert.equal(friendly("Token has expired or is invalid"), "That code expired. Ask for a new one.");
  assert.equal(friendly("Email rate limit exceeded"), "Too many emails requested. Wait a minute and try again.");
});

test("the waitlist form shows a server sentence and keeps codes behind details", () => {
  const fallback = "Your signup did not save. Try again in a minute.";
  const plain = "Too many signups from here. Wait 30 seconds and try again.";
  assert.deepEqual(signupTrouble(plain, fallback), { text: plain, raw: null });
  for (const raw of ["blob_put_failed", '{"code":502}', "FUNCTION_INVOCATION_TIMEOUT", "status 502"]) assert.deepEqual(signupTrouble(raw, fallback), { text: fallback, raw });
  assert.deepEqual(signupTrouble(undefined, fallback), { text: fallback, raw: null });
});

const ROOT = path.join(__dirname, "..");
const DEMO_DIRS = ["src/app/research-os/(app)/learn", "src/app/research-os/(app)/home", "src/app/research-os/(app)/profile", "src/app/sign-in", "packages/bkt-ui/src/views/LearnHome.tsx", "packages/bkt-ui/src/views/Words.tsx", "packages/bkt-ui/src/views/CanonSearch.tsx", "packages/bkt-ui/src/views/RosProfile.tsx", "packages/bkt-ui/src/views/RosProgress.tsx", "src/app/canon"];
const FROZEN = new Set(["StudySession.tsx", "PlacementSession.tsx", "LangPlacement.tsx", "LangExercise.tsx", "CanonGlobeMount.tsx"]);
const LEAKS: [RegExp, string][] = [
  [/j\.error \?\? ["`'][^"`']*["`']\)?/, "a server error code used as copy"],
  [/\?\? `failed \(|"failed"\)/, "a bare failure code used as copy"],
  [/\(e(rr)? as Error\)\.message|\(e(rr)?: Error\) => [^;]*\.message\)/, "a raw exception message set as copy"],
  [/answered \$\{/, "an HTTP status in copy"],
  [/(body|title)=\{`[^`]*\$\{(to|id|atomId|branch|error\.id)\}[^`]*`\}/, "an id in visible copy"],
  [/\b(pr|score)\s*\{[A-Za-z.]+\.toFixed\(/, "a raw score in visible copy"],
  [/\busdc\b/i, "a token unit in visible copy"],
  [/>\{[a-z]+\.(id|bibkey)\}</, "an id rendered as text"],
  [/data\.error \|\| "|signoff_failed/, "an error code used as copy"],
  [/set\w+\(data\.error \?\? "/, "a server error passed through as copy"],
  [/\{(error|err|e)\.message\}/, "a raw exception message rendered as text"],
];

function files(p: string): string[] {
  const full = path.join(ROOT, p);
  if (fs.statSync(full).isFile()) return [full];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(p, e.name)) : /\.tsx?$/.test(e.name) && !FROZEN.has(e.name) ? [path.join(full, e.name)] : []));
}

test("demo screen sources put no codes, ids or exception text into default copy", () => {
  const found: string[] = [];
  for (const f of DEMO_DIRS.flatMap(files)) {
    fs.readFileSync(f, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/details=|RawDetails|raw:/.test(line)) return;
        for (const [re, why] of LEAKS) if (re.test(line)) found.push(`${path.relative(ROOT, f)}:${i + 1} ${why}`);
      });
  }
  assert.deepEqual(found, []);
});
