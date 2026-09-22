/**
 * The code-citation checker's own rules
 * (scripts/check-code-citations.mjs), against fixtures written to a
 * temporary tree.
 *
 * A checker with a hole is worse than no checker, because it licenses
 * the belief that a class of defect is closed. Each case here is a wrong
 * citation the checker has to catch, or a right one it must leave alone.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const CHECKER = path.join(process.cwd(), "scripts/check-code-citations.mjs");

/** A throwaway repo with one source file and one prose file. */
function repo(prose, source = SOURCE, extra = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "cite-"));
  mkdirSync(path.join(dir, "src/lib"), { recursive: true });
  mkdirSync(path.join(dir, "docs"), { recursive: true });
  writeFileSync(path.join(dir, "src/lib/widget.ts"), source);
  writeFileSync(path.join(dir, "docs/memo.md"), prose);
  for (const [rel, body] of Object.entries(extra)) {
    mkdirSync(path.join(dir, path.dirname(rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

const SOURCE = [
  "export const FIRST = 1;", // 1
  "", // 2
  "export function makeWidget() {", // 3
  "  return { id: 1 };", // 4
  "}", // 5
  "", // 6
  "", // 7
  "", // 8
  "", // 9
  "", // 10
  "", // 11
  "", // 12
  "", // 13
  "", // 14
  "", // 15
  "export function farAway() {", // 16
  "  return 2;", // 17
  "}", // 18
].join("\n");

function run(dir) {
  const r = spawnSync("node", [CHECKER], { cwd: dir, encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

test("a citation at the right line passes", () => {
  const r = run(repo("The `makeWidget` factory lives at `src/lib/widget.ts:3`.\n"));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /every citation resolves/);
});

test("a citation naming a symbol that is nowhere near it fails", () => {
  const r = run(repo("The `farAway` helper is at `src/lib/widget.ts:3`.\n"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /symbol-not-there/);
  assert.match(r.out, /is at line 16/, "and it says where the symbol is");
});

test("a line past the end of the file fails", () => {
  const r = run(repo("See `src/lib/widget.ts:400`.\n"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /out-of-range/);
  assert.match(r.out, /18 lines/);
});

test("a file that does not exist fails", () => {
  const r = run(repo("See `src/lib/ghost.ts:3`.\n"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /missing-file/);
});

test("an abbreviated path that resolves to one file passes", () => {
  const r = run(repo("The `makeWidget` factory is at `lib/widget.ts:3`.\n"));
  assert.equal(r.code, 0, r.out);
});

test("a citation inside a fenced block is an illustration", () => {
  const r = run(repo("```\nsee src/lib/widget.ts:400 for the shape\n```\n"));
  assert.equal(r.code, 0, r.out);
});

test("a citation inside a tilde-fenced block is skipped the same way", () => {
  const r = run(repo("~~~\nsee src/lib/widget.ts:400 for the shape\n~~~\n"));
  assert.equal(r.code, 0, r.out);
});

test("a table cell is the unit, so the fix column does not answer for the citation", () => {
  const prose = [
    "| id | where | fix |",
    "| --- | --- | --- |",
    "| P-1 | `src/lib/widget.ts:3` | call `farAway` instead |",
    "",
  ].join("\n");
  const r = run(repo(prose));
  assert.equal(r.code, 0, `the fix column names a symbol absent from the cited line by design: ${r.out}`);
});

test("a wrong citation in a table cell is still caught", () => {
  const prose = ["| id | where |", "| --- | --- |", "| P-1 | `farAway` at `src/lib/widget.ts:3` |", ""].join("\n");
  const r = run(repo(prose));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /symbol-not-there/);
});

test("a second path on the line does not excuse a wrong single citation", () => {
  // The symbol check stands down when a line cites more than one path,
  // because the mapping is ambiguous. The line and file checks do not.
  const r = run(repo("Both `src/lib/widget.ts:400` and `src/lib/other.ts` matter.\n"));
  assert.equal(r.code, 1, `an out-of-range line is caught whatever else the line mentions: ${r.out}`);
  assert.match(r.out, /out-of-range/);
});

test("a symbol on the line above the citation is still checked", () => {
  // The scope is the paragraph. On the physical line alone this check
  // reached one citation in forty-one across the live corpus while the
  // run reported all forty-one as resolving (Bucket critic F-1).
  const prose = "The `farAway` helper does the second thing,\nand it lives at `src/lib/widget.ts:3`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 1, `a wrong citation is caught with the symbol one line up: ${r.out}`);
  assert.match(r.out, /symbol-not-there/);
});

test("a fence left open is its own finding", () => {
  // A bare toggle let a `~~~` line inside a backtick block close it, so
  // every citation below was skipped and the run printed success having
  // checked nothing (Bucket critic F-2).
  const prose = "```\nnot closed\n\nSee `src/lib/widget.ts:400`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /unclosed-fence/);
});

test("a tilde line inside a backtick fence does not close it", () => {
  const prose = "```\n~~~\nsee src/lib/widget.ts:400\n```\n\nThe `makeWidget` factory is at `src/lib/widget.ts:3`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 0, `the citation after the block is still checked, and the one inside it is not: ${r.out}`);
  assert.match(r.out, /1 code citation\(s\) checked/, "exactly the one outside the block");
});

test("a basename matching two files is a finding", () => {
  const prose = "The `makeWidget` factory is at `widget.ts:3`.\n";
  const r = run(repo(prose, SOURCE, { "scripts/widget.ts": SOURCE }));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /ambiguous/);
});

test("a name shorter than three characters is not hunted for", () => {
  // `id` appears in half the lines of any file, so looking for it makes
  // every citation pass.
  const prose = "The `id` field is at `src/lib/widget.ts:16`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 0, `a two-letter name names nothing in particular: ${r.out}`);
  assert.match(r.out, /0 with a named symbol/);
});

test("a word backticked all over the repo is not hunted for", () => {
  const prose = "The `status` of it is at `src/lib/widget.ts:16`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 0, `a generic word names nothing in particular: ${r.out}`);
  assert.match(r.out, /0 with a named symbol/);
});

test("a dotted name is matched on its head", () => {
  // `provenance.canon_score` is how prose names a field, and the head is
  // what appears in the source.
  const prose = "The `makeWidget.id` field is at `src/lib/widget.ts:3`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 0, `the head of a dotted name is found: ${r.out}`);
  assert.match(r.out, /1 with a named symbol/);
});

test("a backticked path is not mistaken for a symbol", () => {
  // Taking the leading identifier of a backticked span made `src` the
  // name to hunt for, and it is in no file.
  const prose = "See `src/lib/widget.ts` at `src/lib/widget.ts:16`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 0, r.out);
});

test("citeignore exempts a file, and only the file it names", () => {
  const prose = "See `src/lib/widget.ts:400`.\n";
  const dir = repo(prose, SOURCE, { ".citeignore": "docs/memo.md\n" });
  const exempt = run(dir);
  assert.equal(exempt.code, 0, `the listed file is skipped: ${exempt.out}`);

  const other = repo(prose, SOURCE, { ".citeignore": "docs/elsewhere.md\n" });
  assert.equal(run(other).code, 1, "a file the list does not name is still checked");
});

test("the summary reports how many citations had a symbol to verify", () => {
  const prose = "The `makeWidget` factory is at `src/lib/widget.ts:3`, and see `src/lib/widget.ts:16`.\n";
  const r = run(repo(prose));
  assert.match(r.out, /2 code citation\(s\) checked/);
  assert.match(r.out, /0 with a named symbol/, "two paths on one line make the mapping ambiguous, so neither is symbol-checked");
});

test("a marker on the line exempts that citation and nothing else", () => {
  const prose = [
    "See `src/lib/widget.ts:400`.  <!-- cite-ignore-line: another repo -->",
    "",
    "And see `src/lib/widget.ts:401`.",
    "",
  ].join("\n");
  const r = run(repo(prose));
  assert.equal(r.code, 1, `the unmarked one is still checked: ${r.out}`);
  assert.match(r.out, /widget\.ts:401/);
  assert.ok(!r.out.includes("widget.ts:400"), "and the marked one is not reported");
  assert.match(r.out, /1 code citation\(s\) checked/, "the marked one is not even counted");
});

test("a marker on the line above exempts the citation under it", () => {
  const prose = "<!-- cite-ignore-next: the gateway, another repo -->\nSee `src/lib/widget.ts:400`.\n";
  const r = run(repo(prose));
  assert.equal(r.code, 0, r.out);
});

test("a marker exempts one line, not the rest of the file", () => {
  const prose = [
    "<!-- cite-ignore-next: another repo -->",
    "See `src/lib/widget.ts:400`.",
    "",
    "Later, `src/lib/widget.ts:900`.",
    "",
  ].join("\n");
  const r = run(repo(prose));
  assert.equal(r.code, 1, `the later citation is still checked: ${r.out}`);
  assert.match(r.out, /widget\.ts:900/);
});

test("the missing-file message names every tree it searched", () => {
  const r = run(repo("See `src/lib/ghost.ts:3`.\n"));
  assert.equal(r.code, 1);
  for (const tree of ["src", "supabase", "scripts", "tools", "learning", "services", "deploy"]) {
    assert.ok(r.out.includes(tree), `the message names ${tree}, so a reader looks in the right places`);
  }
});
